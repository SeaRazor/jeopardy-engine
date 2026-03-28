// Immediate Reference Resolver
// Handles real-time reference resolution when individual games are completed

import { parsePlayerReference } from './referenceSystem.js';
import { getGamesByTournament, updateGame } from '../../lib/data/games.js';

export class ImmediateReferenceResolver {
  constructor(tournamentId) {
    this.tournamentId = tournamentId;
  }

  async resolveReferencesForCompletedGame(completedGame) {
    try {
      console.log(`Starting immediate resolution for game ${completedGame.id}`);

      const dependentGames = await this.findDependentGames(completedGame);

      if (dependentGames.length === 0) {
        console.log('No dependent games found');
        return {
          success: true,
          resolvedGames: 0,
          resolvedReferences: 0,
          message: 'Game completed, no dependent games to resolve',
        };
      }

      const sortedParticipants = this.sortParticipantsByRanking(completedGame.participants);

      let totalResolvedReferences = 0;
      let resolvedGamesCount = 0;

      for (const dependentGame of dependentGames) {
        const resolutionResult = await this.resolveGameReferences(
          dependentGame,
          completedGame,
          sortedParticipants
        );

        if (resolutionResult.resolvedCount > 0) {
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
        message: `Resolved ${totalResolvedReferences} references in ${resolvedGamesCount} games`,
      };
    } catch (error) {
      console.error('Error in immediate reference resolution:', error);
      return {
        success: false,
        error: error.message,
        resolvedGames: 0,
        resolvedReferences: 0,
      };
    }
  }

  async findDependentGames(completedGame) {
    try {
      const allGames = await getGamesByTournament(this.tournamentId);
      const possibleReferences = this.generatePossibleReferences(completedGame);

      return allGames.filter(game => {
        if (!game.participants || game.participants.length === 0) return false;
        if (game.id === completedGame.id) return false;

        return game.participants.some(
          participant =>
            participant.sourceReference &&
            !participant.resolved &&
            possibleReferences.includes(participant.sourceReference)
        );
      });
    } catch (error) {
      console.error('Error finding dependent games:', error);
      return [];
    }
  }

  generatePossibleReferences(completedGame) {
    const gameNumber = completedGame.gameNumber || completedGame.id;
    const references = [];
    for (let placement = 1; placement <= 4; placement++) {
      references.push(`${this.tournamentId}.${gameNumber}.${placement}`);
    }
    return references;
  }

  sortParticipantsByRanking(participants) {
    if (!participants || participants.length === 0) return [];

    return [...participants].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const aTieBreak = a.tieBreakResult || 0;
      const bTieBreak = b.tieBreakResult || 0;
      return bTieBreak - aTieBreak;
    });
  }

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
            lossBracket: resolved.lossBracket || false,
            eliminationCount: resolved.eliminationCount || 0,
          };
          resolvedCount++;
        }
      }
    }

    return {
      updatedGame: {
        ...dependentGame,
        participants: updatedParticipants,
        lastUpdated: new Date().toISOString(),
      },
      resolvedCount,
    };
  }

  async resolveParticipantReference(participant, completedGame, sortedParticipants) {
    const parsed = parsePlayerReference(participant.sourceReference);
    if (!parsed) return null;

    const { tournamentId, gameNumber, placement } = parsed;

    const completedGameNumber = completedGame.gameNumber || completedGame.id;
    if (tournamentId !== parseInt(this.tournamentId) || gameNumber !== completedGameNumber) {
      return null;
    }

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
      lossBracket: sourceParticipant.lossBracket || placement > 2,
      eliminationCount: sourceParticipant.eliminationCount || (placement > 2 ? 1 : 0),
    };
  }

  async updateGame(game) {
    console.log(`Updated game ${game.id}`);
    return updateGame(game.id, game);
  }

  async getImmediateResolutionStatus() {
    try {
      const allGames = await getGamesByTournament(this.tournamentId);

      let completedGames = 0;
      let pendingReferences = 0;
      let resolvedReferences = 0;

      allGames.forEach(game => {
        if (game.completed === true || game.status === 'completed') {
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
        resolutionRate:
          (resolvedReferences / Math.max(1, resolvedReferences + pendingReferences)) * 100,
      };
    } catch (error) {
      console.error('Error getting immediate resolution status:', error);
      return { success: false, error: error.message };
    }
  }
}

export const createImmediateResolver = (tournamentId) =>
  new ImmediateReferenceResolver(tournamentId);

export const resolveReferencesForGame = async (tournamentId, completedGame) => {
  const resolver = createImmediateResolver(tournamentId);
  return resolver.resolveReferencesForCompletedGame(completedGame);
};

export const useGameCompletionListener = (tournamentId, onGameCompleted) => {
  if (typeof window === 'undefined') return;

  const handleGameCompleted = (event) => {
    const { gameId, stageId, tournamentId: eventTournamentId, resolvedGames } = event.detail;

    if (eventTournamentId === tournamentId && onGameCompleted) {
      onGameCompleted({ gameId, stageId, resolvedGames });
    }
  };

  window.addEventListener('gameCompleted', handleGameCompleted);
  return () => window.removeEventListener('gameCompleted', handleGameCompleted);
};
