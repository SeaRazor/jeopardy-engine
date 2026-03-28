// Game Finish API Endpoint
// Handles immediate game completion and reference resolution

import { NextResponse } from 'next/server';
import { getGameById, getGamesByTournament, updateGame } from '../../../../../../../../../lib/data/games.js';

// Sort participants by ranking (points desc, then tieBreakResult)
function sortParticipantsByRanking(participants) {
  return [...participants].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aTieBreak = a.tieBreakResult || 0;
    const bTieBreak = b.tieBreakResult || 0;
    return bTieBreak - aTieBreak;
  });
}

// Find all games that reference this completed game
function findDependentGames(games, completedGame) {
  const dependentGames = [];
  const stageOrder = completedGame.stageOrder || 1;
  const gamePosition = stageOrder;
  const baseReference = `${completedGame.stageId || 1}.${gamePosition}`;

  games.forEach(game => {
    if (game.participants && game.participants.length > 0) {
      const hasReference = game.participants.some(
        participant =>
          participant.sourceReference &&
          participant.sourceReference.startsWith(baseReference) &&
          !participant.resolved
      );
      if (hasReference) dependentGames.push(game);
    }
  });

  return dependentGames;
}

// Resolve references in a specific game
function resolveGameReferences(game, completedGame) {
  if (!game.participants || !completedGame.participants) {
    return { updatedGame: game, resolvedCount: 0 };
  }

  const sortedParticipants = sortParticipantsByRanking(completedGame.participants);
  const stageOrder = completedGame.stageOrder || 1;
  const gamePosition = stageOrder;
  const baseReference = `${completedGame.stageId || 1}.${gamePosition}`;

  let resolvedCount = 0;
  const updatedParticipants = game.participants.map(participant => {
    if (
      participant.sourceReference &&
      participant.sourceReference.startsWith(baseReference) &&
      !participant.resolved
    ) {
      const parts = participant.sourceReference.split('.');
      const placement = parseInt(parts[2]);

      if (!isNaN(placement) && placement > 0 && placement <= sortedParticipants.length) {
        const sourceParticipant = sortedParticipants[placement - 1];
        resolvedCount++;
        return {
          ...participant,
          playerId: sourceParticipant.playerId,
          resolved: true,
          resolvedAt: new Date().toISOString(),
          lossBracket: sourceParticipant.lossBracket || placement > 2,
          eliminationCount: sourceParticipant.eliminationCount || (placement > 2 ? 1 : 0),
        };
      }
    }
    return participant;
  });

  return {
    updatedGame: {
      ...game,
      participants: updatedParticipants,
      lastUpdated: new Date().toISOString(),
    },
    resolvedCount,
  };
}

// POST /api/tournaments/[id]/stages/[stageId]/games/[gameId]/finish
export async function POST(request, { params }) {
  try {
    const { id: tournamentId, stageId, gameId } = await params;
    const body = await request.json();

    const game = await getGameById(gameId);

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (!game.participants || game.participants.length === 0) {
      return NextResponse.json(
        { error: 'Cannot finish game without participants' },
        { status: 400 }
      );
    }

    const hasResults = game.participants.some(p => p.points > 0 || p.tieBreakResult);
    if (!hasResults) {
      return NextResponse.json(
        { error: 'Cannot finish game without results' },
        { status: 400 }
      );
    }

    // Mark game as completed
    const completedGame = await updateGame(gameId, {
      ...game,
      completed: true,
      finishedAt: body.finishedAt || new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    });

    // Find and resolve dependent games
    const allTournamentGames = await getGamesByTournament(tournamentId);
    const dependentGames = findDependentGames(allTournamentGames, completedGame);
    let totalResolvedReferences = 0;
    let resolvedGamesCount = 0;

    for (const dependentGame of dependentGames) {
      const { updatedGame, resolvedCount } = resolveGameReferences(dependentGame, completedGame);
      if (resolvedCount > 0) {
        await updateGame(dependentGame.id, updatedGame);
        totalResolvedReferences += resolvedCount;
        resolvedGamesCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Game finished successfully',
      gameId: parseInt(gameId),
      finishedAt: completedGame.finishedAt,
      resolvedReferences: totalResolvedReferences,
      resolvedGames: resolvedGamesCount,
      dependentGames: dependentGames.length,
      game: completedGame,
    });
  } catch (error) {
    console.error('Error finishing game:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to finish game' },
      { status: 500 }
    );
  }
}
