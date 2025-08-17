// Reference Resolver Service
// Handles resolving player references when stages are completed

import { parsePlayerReference, needsResolution } from './referenceSystem.js';
import { createProgressionEngine } from './progressionEngine.js';

export class ReferenceResolver {
  constructor(tournamentId) {
    this.tournamentId = tournamentId;
  }

  // Main function to resolve all pending references for a tournament
  async resolveAllPendingReferences() {
    try {
      const tournament = await this.fetchTournament();
      const stages = tournament.schema.stages.sort((a, b) => a.order - b.order);
      
      let resolvedCount = 0;
      
      // Process stages in order
      for (const stage of stages) {
        if (stage.order === 1) continue; // Skip first stage (manual assignment)
        
        const stageResolvedCount = await this.resolveStageReferences(stage);
        resolvedCount += stageResolvedCount;
      }
      
      return {
        success: true,
        resolvedCount,
        message: `Resolved ${resolvedCount} player references`
      };
    } catch (error) {
      console.error('Error resolving references:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Resolve references for a specific stage
  async resolveStageReferences(stage) {
    try {
      const games = await this.fetchStageGames(stage.id);
      let resolvedCount = 0;
      
      for (const game of games) {
        const gameResolvedCount = await this.resolveGameReferences(game, stage);
        resolvedCount += gameResolvedCount;
      }
      
      return resolvedCount;
    } catch (error) {
      console.error(`Error resolving stage ${stage.order} references:`, error);
      throw error;
    }
  }

  // Resolve references for a specific game
  async resolveGameReferences(game, stage) {
    if (!game.participants || game.participants.length === 0) {
      return 0;
    }

    let resolvedCount = 0;
    let gameUpdated = false;
    const updatedParticipants = [];

    for (const participant of game.participants) {
      if (needsResolution(participant)) {
        try {
          const resolvedPlayerId = await this.resolvePlayerReference(participant.sourceReference);
          
          if (resolvedPlayerId) {
            // Create resolved participant
            const resolvedParticipant = {
              ...participant,
              playerId: resolvedPlayerId,
              resolved: true
            };
            
            updatedParticipants.push(resolvedParticipant);
            resolvedCount++;
            gameUpdated = true;
          } else {
            // Keep unresolved if source game not complete
            updatedParticipants.push(participant);
          }
        } catch (error) {
          console.error(`Error resolving reference ${participant.sourceReference}:`, error);
          // Keep unresolved participant on error
          updatedParticipants.push(participant);
        }
      } else {
        // Already resolved or no reference
        updatedParticipants.push(participant);
      }
    }

    // Update game if any participants were resolved
    if (gameUpdated) {
      await this.updateGame(game.id, stage.id, { participants: updatedParticipants });
    }

    return resolvedCount;
  }

  // Resolve a single player reference to actual player ID
  async resolvePlayerReference(reference) {
    const parsed = parsePlayerReference(reference);
    if (!parsed) {
      throw new Error(`Invalid reference format: ${reference}`);
    }

    const { tournamentId, gameNumber, placement } = parsed;

    // Verify tournament ID matches
    if (tournamentId !== this.tournamentId) {
      throw new Error(`Reference tournament ID ${tournamentId} does not match resolver tournament ID ${this.tournamentId}`);
    }

    // Find the source game by game number
    const allGames = await this.fetchAllTournamentGames();
    const sourceGame = allGames.find(g => g.gameNumber === gameNumber);
    
    if (!sourceGame) {
      throw new Error(`Source game ${gameNumber} not found`);
    }

    // Check if source game is completed
    if (!this.isGameCompleted(sourceGame)) {
      return null; // Cannot resolve yet, game not completed
    }

    // Get sorted participants (by points + tieBreakResult)
    const sortedParticipants = this.sortParticipantsByRanking(sourceGame.participants || []);
    
    if (placement > sortedParticipants.length) {
      throw new Error(`Placement ${placement} not available in game with ${sortedParticipants.length} participants`);
    }

    const targetParticipant = sortedParticipants[placement - 1]; // Convert to 0-based index
    
    if (!targetParticipant.playerId) {
      throw new Error(`Target participant at placement ${placement} has no playerId`);
    }

    return targetParticipant.playerId;
  }

  // Sort participants by their ranking (points desc, then tieBreakResult)
  sortParticipantsByRanking(participants) {
    return [...participants].sort((a, b) => {
      // Primary sort: points (higher is better)
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      
      // Secondary sort: tieBreakResult as tiebreaker
      const aTieBreak = a.tieBreakResult || 0;
      const bTieBreak = b.tieBreakResult || 0;
      
      // tieBreakResult is always a number (higher is better)
      return bTieBreak - aTieBreak;
    });
  }

  // Check if a game is completed and ready for reference resolution
  isGameCompleted(game) {
    if (!game.participants || game.participants.length === 0) {
      return false;
    }
    // Only consider a game completed if it has the explicit completed status
    return game.completed === true || game.status === 'completed';
  }

  // Check if a stage is ready for progression (all games completed)
  async isStageReadyForProgression(stageId) {
    try {
      const games = await this.fetchStageGames(stageId);
      return games.length > 0 && games.every(game => this.isGameCompleted(game));
    } catch (error) {
      console.error('Error checking stage progression readiness:', error);
      return false;
    }
  }

  // Auto-resolve references when a stage is marked complete
  async autoResolveOnStageCompletion(completedStageId) {
    try {
      const tournament = await this.fetchTournament();
      const completedStage = tournament.schema.stages.find(s => s.id === completedStageId);
      
      if (!completedStage) {
        throw new Error(`Stage ${completedStageId} not found`);
      }

      // Find all stages that depend on this completed stage
      const dependentStages = tournament.schema.stages.filter(s => s.order === completedStage.order + 1);
      
      let totalResolved = 0;
      
      for (const dependentStage of dependentStages) {
        const resolved = await this.resolveStageReferences(dependentStage);
        totalResolved += resolved;
      }

      return {
        success: true,
        resolvedCount: totalResolved,
        dependentStages: dependentStages.length,
        message: `Auto-resolved ${totalResolved} references for ${dependentStages.length} dependent stages`
      };
    } catch (error) {
      console.error('Error in auto-resolve:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get progression status for the tournament
  async getProgressionStatus() {
    try {
      const tournament = await this.fetchTournament();
      const stages = tournament.schema.stages.sort((a, b) => a.order - b.order);
      
      const stageStatuses = [];
      
      for (const stage of stages) {
        const games = await this.fetchStageGames(stage.id);
        const completedGames = games.filter(game => this.isGameCompleted(game));
        const pendingReferences = await this.countPendingReferences(stage);
        
        stageStatuses.push({
          stageId: stage.id,
          order: stage.order,
          name: stage.name,
          totalGames: games.length,
          completedGames: completedGames.length,
          isComplete: completedGames.length === games.length && games.length > 0,
          pendingReferences,
          canProgress: completedGames.length === games.length && pendingReferences === 0
        });
      }
      
      return {
        success: true,
        tournament: {
          id: tournament.id,
          name: tournament.name
        },
        stages: stageStatuses,
        overallComplete: stageStatuses.every(s => s.canProgress)
      };
    } catch (error) {
      console.error('Error getting progression status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Count pending references in a stage
  async countPendingReferences(stage) {
    try {
      const games = await this.fetchStageGames(stage.id);
      let pendingCount = 0;
      
      for (const game of games) {
        if (game.participants) {
          pendingCount += game.participants.filter(p => needsResolution(p)).length;
        }
      }
      
      return pendingCount;
    } catch (error) {
      console.error(`Error counting pending references for stage ${stage.id}:`, error);
      return 0;
    }
  }

  // API helper functions
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

  async fetchAllTournamentGames() {
    const response = await fetch(`/api/tournaments/${this.tournamentId}/games`);
    if (!response.ok) {
      throw new Error(`Failed to fetch tournament games: ${response.statusText}`);
    }
    return response.json();
  }

  async findStageByOrder(order) {
    const tournament = await this.fetchTournament();
    return tournament.schema.stages.find(s => s.order === order);
  }

  async updateGame(gameId, stageId, updates) {
    const response = await fetch(`/api/tournaments/${this.tournamentId}/stages/${stageId}/games/${gameId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`Failed to update game: ${response.statusText}`);
    }
    
    return response.json();
  }
}

// Factory function
export const createReferenceResolver = (tournamentId) => {
  return new ReferenceResolver(tournamentId);
};

// Utility functions for external use
export const resolveReferencesForTournament = async (tournamentId) => {
  const resolver = createReferenceResolver(tournamentId);
  return resolver.resolveAllPendingReferences();
};

export const resolveReferencesForStage = async (tournamentId, stageId) => {
  const resolver = createReferenceResolver(tournamentId);
  const tournament = await resolver.fetchTournament();
  const stage = tournament.schema.stages.find(s => s.id === stageId);
  
  if (!stage) {
    throw new Error(`Stage ${stageId} not found`);
  }
  
  return resolver.resolveStageReferences(stage);
};

export const getProgressionStatus = async (tournamentId) => {
  const resolver = createReferenceResolver(tournamentId);
  return resolver.getProgressionStatus();
};