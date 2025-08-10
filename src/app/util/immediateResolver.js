// Immediate Reference Resolver
// Handles real-time reference resolution when individual games are completed

import { parsePlayerReference } from './referenceSystem.js';

export class ImmediateReferenceResolver {
  constructor(tournamentId) {
    this.tournamentId = tournamentId;
  }

  // Main function to resolve references immediately when a game is completed
  async resolveReferencesForCompletedGame(completedGame) {
    try {
      console.log(`Starting immediate resolution for game ${completedGame.id}`);
      
      // Find all games that depend on this completed game
      const dependentGames = await this.findDependentGames(completedGame);
      
      if (dependentGames.length === 0) {
        console.log('No dependent games found');
        return {
          success: true,
          resolvedGames: 0,
          resolvedReferences: 0,
          message: 'Game completed, no dependent games to resolve'
        };
      }

      // Sort completed game participants by ranking
      const sortedParticipants = this.sortParticipantsByRanking(completedGame.participants);
      
      let totalResolvedReferences = 0;
      let resolvedGamesCount = 0;

      // Process each dependent game
      for (const dependentGame of dependentGames) {
        const resolutionResult = await this.resolveGameReferences(
          dependentGame, 
          completedGame, 
          sortedParticipants
        );
        
        if (resolutionResult.resolvedCount > 0) {
          // Update the dependent game with resolved references
          await this.updateGame(resolutionResult.updatedGame);
          totalResolvedReferences += resolutionResult.resolvedCount;
          resolvedGamesCount++;
          
          console.log(`Resolved ${resolutionResult.resolvedCount} references in game ${dependentGame.id}`);
        }
      }

      return {
        success: true,
        resolvedGames: resolvedGamesCount,
        resolvedReferences: totalResolvedReferences,
        dependentGames: dependentGames.length,
        message: `Resolved ${totalResolvedReferences} references in ${resolvedGamesCount} games`
      };

    } catch (error) {
      console.error('Error in immediate reference resolution:', error);
      return {
        success: false,
        error: error.message,
        resolvedGames: 0,
        resolvedReferences: 0
      };
    }
  }

  // Find all games that have references to the completed game
  async findDependentGames(completedGame) {
    try {
      // Get all games in the tournament
      const allGames = await this.fetchAllTournamentGames();
      
      // Generate possible references from this game
      const possibleReferences = this.generatePossibleReferences(completedGame);
      
      // Find games that contain these references
      const dependentGames = allGames.filter(game => {
        if (!game.participants || game.participants.length === 0) return false;
        if (game.id === completedGame.id) return false; // Don't include self
        
        return game.participants.some(participant => 
          participant.sourceReference && 
          !participant.resolved &&
          possibleReferences.includes(participant.sourceReference)
        );
      });

      return dependentGames;
    } catch (error) {
      console.error('Error finding dependent games:', error);
      return [];
    }
  }

  // Generate all possible references that point to this game
  generatePossibleReferences(completedGame) {
    const stageOrder = completedGame.stageOrder || 1;
    const gamePosition = stageOrder;
    
    // Generate references for all possible placements (1st, 2nd, 3rd, 4th)
    const references = [];
    for (let placement = 1; placement <= 4; placement++) {
      references.push(`${completedGame.stageId || 1}.${gamePosition}.${placement}`);
    }
    
    return references;
  }

  // Sort participants by their ranking (points + extraResult)
  sortParticipantsByRanking(participants) {
    if (!participants || participants.length === 0) return [];
    
    return [...participants].sort((a, b) => {
      // Primary sort: points (higher is better)
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      
      // Secondary sort: extraResult as tiebreaker
      const aExtra = a.extraResult || '';
      const bExtra = b.extraResult || '';
      
      // Try to parse as numbers
      const aNum = parseFloat(aExtra);
      const bNum = parseFloat(bExtra);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return bNum - aNum; // Higher numeric extraResult wins
      }
      
      // Fall back to string comparison
      return aExtra.localeCompare(bExtra);
    });
  }

  // Resolve references in a specific dependent game
  async resolveGameReferences(dependentGame, completedGame, sortedParticipants) {
    const updatedParticipants = [...dependentGame.participants];
    let resolvedCount = 0;

    for (let i = 0; i < updatedParticipants.length; i++) {
      const participant = updatedParticipants[i];
      
      if (participant.sourceReference && !participant.resolved) {
        const resolved = await this.resolveParticipantReference(
          participant, 
          completedGame, 
          sortedParticipants
        );
        
        if (resolved) {
          updatedParticipants[i] = {
            ...participant,
            playerId: resolved.playerId,
            resolved: true,
            resolvedAt: new Date().toISOString(),
            // Inherit bracket/elimination info from source
            lossBracket: resolved.lossBracket || false,
            eliminationCount: resolved.eliminationCount || 0
          };
          resolvedCount++;
        }
      }
    }

    return {
      updatedGame: {
        ...dependentGame,
        participants: updatedParticipants,
        lastUpdated: new Date().toISOString()
      },
      resolvedCount
    };
  }

  // Resolve a single participant reference
  async resolveParticipantReference(participant, completedGame, sortedParticipants) {
    const parsed = parsePlayerReference(participant.sourceReference);
    if (!parsed) return null;

    const { stageOrder, gamePosition, placement } = parsed;
    
    // Verify this reference points to the completed game
    const expectedReference = `${completedGame.stageId || 1}.${completedGame.stageOrder || 1}.${placement}`;
    if (participant.sourceReference !== expectedReference) {
      return null; // This reference doesn't match the completed game
    }

    // Get participant at specified placement
    if (placement > sortedParticipants.length || placement < 1) {
      console.warn(`Invalid placement ${placement} for game with ${sortedParticipants.length} participants`);
      return null;
    }

    const sourceParticipant = sortedParticipants[placement - 1];
    if (!sourceParticipant.playerId) {
      console.warn(`Source participant at placement ${placement} has no playerId`);
      return null;
    }

    return {
      playerId: sourceParticipant.playerId,
      lossBracket: sourceParticipant.lossBracket || (placement > 2), // 3rd, 4th go to lower bracket
      eliminationCount: sourceParticipant.eliminationCount || (placement > 2 ? 1 : 0)
    };
  }

  // API helper functions
  async fetchAllTournamentGames() {
    try {
      const tournament = await this.fetchTournament();
      const allGames = [];

      // Fetch games from all stages
      for (const stage of tournament.schema.stages) {
        const stageGames = await this.fetchStageGames(stage.id);
        allGames.push(...stageGames);
      }

      return allGames;
    } catch (error) {
      console.error('Error fetching tournament games:', error);
      return [];
    }
  }

  async fetchTournament() {
    const response = await fetch(`/api/tournaments/${this.tournamentId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch tournament: ${response.statusText}`);
    }
    return response.json();
  }

  async fetchStageGames(stageId) {
    const response = await fetch(`/api/tournaments/${this.tournamentId}/stages/${stageId}/games`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stage games: ${response.statusText}`);
    }
    return response.json();
  }

  async updateGame(game) {
    const response = await fetch(`/api/tournaments/${this.tournamentId}/stages/${game.stageId}/games/${game.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(game),
    });

    if (!response.ok) {
      throw new Error(`Failed to update game: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get immediate resolution status for a tournament
  async getImmediateResolutionStatus() {
    try {
      const allGames = await this.fetchAllTournamentGames();
      
      let completedGames = 0;
      let pendingReferences = 0;
      let resolvedReferences = 0;
      
      allGames.forEach(game => {
        if (game.completed) {
          completedGames++;
        }
        
        if (game.participants) {
          game.participants.forEach(participant => {
            if (participant.sourceReference) {
              if (participant.resolved) {
                resolvedReferences++;
              } else {
                pendingReferences++;
              }
            }
          });
        }
      });

      return {
        success: true,
        totalGames: allGames.length,
        completedGames,
        pendingReferences,
        resolvedReferences,
        resolutionRate: resolvedReferences / Math.max(1, resolvedReferences + pendingReferences) * 100
      };
    } catch (error) {
      console.error('Error getting immediate resolution status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Factory function
export const createImmediateResolver = (tournamentId) => {
  return new ImmediateReferenceResolver(tournamentId);
};

// Utility function for external use
export const resolveReferencesForGame = async (tournamentId, completedGame) => {
  const resolver = createImmediateResolver(tournamentId);
  return resolver.resolveReferencesForCompletedGame(completedGame);
};

// Hook for real-time updates
export const useGameCompletionListener = (tournamentId, onGameCompleted) => {
  if (typeof window === 'undefined') return;

  const handleGameCompleted = (event) => {
    const { gameId, stageId, tournamentId: eventTournamentId, resolvedGames } = event.detail;
    
    if (eventTournamentId === tournamentId && onGameCompleted) {
      onGameCompleted({
        gameId,
        stageId,
        resolvedGames
      });
    }
  };

  window.addEventListener('gameCompleted', handleGameCompleted);
  
  return () => {
    window.removeEventListener('gameCompleted', handleGameCompleted);
  };
};