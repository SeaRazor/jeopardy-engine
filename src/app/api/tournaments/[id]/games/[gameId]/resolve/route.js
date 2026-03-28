// Manual Game Resolution API Endpoint
// For debugging and manually triggering player progression

import { NextResponse } from 'next/server';
import { resolveReferencesForGame } from '../../../../../../util/immediateResolver.js';
import { getGameById } from '../../../../../../../lib/data/games.js';

// POST /api/tournaments/[id]/games/[gameId]/resolve
export async function POST(request, { params }) {
  try {
    const { id: tournamentId, gameId } = await params;

    console.log(`[DEBUG] Manual resolution triggered for tournament ${tournamentId}, game ${gameId}`);

    const game = await getGameById(gameId);

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    console.log(`[DEBUG] Found game:`, {
      id: game.id,
      gameNumber: game.gameNumber,
      tournamentId: game.tournamentId,
      stageId: game.stageId,
      status: game.status,
      completed: game.completed,
      participantCount: game.participants?.length || 0,
    });

    if (game.status !== 'completed' && !game.completed) {
      return NextResponse.json({ error: 'Game is not completed yet' }, { status: 400 });
    }

    console.log(`[DEBUG] Game participants:`, game.participants?.map(p => ({
      playerId: p.playerId,
      points: p.points,
      tieBreakResult: p.tieBreakResult,
      resolved: p.resolved,
    })));

    console.log(`[DEBUG] Calling resolveReferencesForGame...`);
    const resolutionResult = await resolveReferencesForGame(tournamentId, game);
    console.log(`[DEBUG] Resolution result:`, resolutionResult);

    return NextResponse.json({
      success: true,
      game: {
        id: game.id,
        gameNumber: game.gameNumber,
        tournamentId: game.tournamentId,
        status: game.status,
        completed: game.completed,
      },
      resolutionResult,
      debugInfo: {
        expectedReferences: [
          `${tournamentId}.${game.gameNumber}.1`,
          `${tournamentId}.${game.gameNumber}.2`,
          `${tournamentId}.${game.gameNumber}.3`,
          `${tournamentId}.${game.gameNumber}.4`,
        ],
      },
    });
  } catch (error) {
    console.error('[DEBUG] Error in manual resolution:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resolve references', stack: error.stack },
      { status: 500 }
    );
  }
}
