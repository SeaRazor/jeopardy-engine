import { NextResponse } from 'next/server';
import { resolveReferencesForGame, createImmediateResolver } from '../../../../util/immediateResolver.js';
import { getGamesByTournament, getGameById } from '../../../../../lib/data/games.js';

export async function POST(request, { params }) {
  const { id: tournamentId } = params;
  const { gameId } = await request.json();

  try {
    const completedGame = await getGameById(gameId);

    if (!completedGame || completedGame.tournamentId !== parseInt(tournamentId)) {
      return NextResponse.json({ error: 'Game not found', gameId, tournamentId }, { status: 404 });
    }

    console.log(`Testing resolution for game ${gameId} in tournament ${tournamentId}`);
    console.log('Completed game:', {
      id: completedGame.id,
      gameNumber: completedGame.gameNumber,
      tournamentId: completedGame.tournamentId,
      stageId: completedGame.stageId,
      status: completedGame.status,
      participantCount: completedGame.participants?.length || 0,
    });

    const resolver = createImmediateResolver(tournamentId);
    const possibleRefs = resolver.generatePossibleReferences(completedGame);
    console.log('Expected references to resolve:', possibleRefs);

    const allGames = await getGamesByTournament(tournamentId);
    const gamesWithRefs = allGames.filter(game => {
      if (!game.participants) return false;
      return game.participants.some(
        p => p.sourceReference && possibleRefs.includes(p.sourceReference)
      );
    });
    console.log('Games with matching references:', gamesWithRefs.map(g => ({
      id: g.id,
      gameNumber: g.gameNumber,
      references: g.participants
        ?.filter(p => p.sourceReference && possibleRefs.includes(p.sourceReference))
        .map(p => ({ ref: p.sourceReference, resolved: p.resolved, playerId: p.playerId })) || [],
    })));

    const result = await resolveReferencesForGame(tournamentId, completedGame);

    return NextResponse.json({
      success: true,
      gameId,
      tournamentId,
      completedGame: {
        id: completedGame.id,
        gameNumber: completedGame.gameNumber,
        status: completedGame.status,
      },
      debug: {
        expectedReferences: possibleRefs,
        gamesWithMatchingReferences: gamesWithRefs.map(g => ({
          id: g.id,
          gameNumber: g.gameNumber,
          references: g.participants
            ?.filter(p => p.sourceReference && possibleRefs.includes(p.sourceReference))
            .map(p => p.sourceReference) || [],
        })),
      },
      resolutionResult: result,
    });
  } catch (error) {
    console.error('Error in test resolution:', error);
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
