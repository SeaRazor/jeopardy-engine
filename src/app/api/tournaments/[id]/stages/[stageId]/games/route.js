import { NextResponse } from 'next/server';
import { getGamesByStage, createGame } from '../../../../../../../lib/data/games.js';

export async function GET(request, { params }) {
  const { id: tournamentId, stageId } = await params;

  const stageGames = await getGamesByStage(tournamentId, stageId);

  return NextResponse.json(stageGames);
}

export async function POST(request, { params }) {
  const { id: tournamentId, stageId } = await params;
  const gameData = await request.json();

  // Add Double Elimination specific validation and defaults
  if (gameData.tournamentType === 'DoubleElimination') {
    if (gameData.gameLetter && typeof gameData.gameLetter !== 'string') {
      return NextResponse.json({ error: 'gameLetter must be a string' }, { status: 400 });
    }

    if (gameData.bracketType && !['upper', 'lower'].includes(gameData.bracketType)) {
      return NextResponse.json(
        { error: 'bracketType must be "upper" or "lower"' },
        { status: 400 }
      );
    }

    if (gameData.hasOwnProperty('bracketType')) {
      gameData.bracketType = gameData.bracketType || 'upper';
      gameData.bracketPosition = gameData.bracketPosition || 1;
    }
  }

  // Validate required fields
  if (!gameData.gameDate || !gameData.gamePlace || !gameData.presenterId) {
    return NextResponse.json(
      { error: 'Missing required fields: gameDate, gamePlace, presenterId' },
      { status: 400 }
    );
  }

  if (!gameData.participants) {
    gameData.participants = [];
  }

  if (!Array.isArray(gameData.participants)) {
    return NextResponse.json({ error: 'Participants must be an array' }, { status: 400 });
  }

  if (gameData.participants.length > 0) {
    for (const participant of gameData.participants) {
      const hasReference = participant.sourceReference && !participant.resolved;
      const hasPlayerId = participant.playerId;
      const hasValidPoints = typeof participant.points === 'number';

      if (!hasReference && (!hasPlayerId || !hasValidPoints)) {
        return NextResponse.json(
          { error: 'Each participant must have playerId and points (number), or have a sourceReference' },
          { status: 400 }
        );
      }

      if (hasReference && !hasValidPoints) {
        return NextResponse.json(
          { error: 'Each participant must have points as a number' },
          { status: 400 }
        );
      }
    }
  }

  const newGame = await createGame({
    ...gameData,
    tournamentId: parseInt(tournamentId),
    stageId: parseInt(stageId),
  });

  return NextResponse.json(newGame, { status: 201 });
}
