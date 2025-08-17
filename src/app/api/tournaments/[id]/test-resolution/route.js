import { NextResponse } from 'next/server';
import { resolveReferencesForGame } from '../../../../util/immediateResolver.js';
import fs from 'fs';
import path from 'path';

const gamesDbPath = path.join(process.cwd(), 'src/app/api/games/db.json');

function readGames() {
  try {
    const data = fs.readFileSync(gamesDbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading games db.json:', error);
    return [];
  }
}

export async function POST(request, { params }) {
  const { id: tournamentId } = params;
  const { gameId } = await request.json();
  
  try {
    // Find the completed game
    const games = readGames();
    const completedGame = games.find(g => 
      g.id === parseInt(gameId) && 
      g.tournamentId === parseInt(tournamentId)
    );
    
    if (!completedGame) {
      return NextResponse.json({ 
        error: 'Game not found',
        gameId,
        tournamentId 
      }, { status: 404 });
    }
    
    console.log(`Testing resolution for game ${gameId} in tournament ${tournamentId}`);
    console.log('Completed game:', {
      id: completedGame.id,
      gameNumber: completedGame.gameNumber,
      tournamentId: completedGame.tournamentId,
      stageId: completedGame.stageId,
      status: completedGame.status,
      participantCount: completedGame.participants?.length || 0
    });
    
    // Let's also check what references this game should generate
    const { createImmediateResolver } = await import('../../../../util/immediateResolver.js');
    const resolver = createImmediateResolver(tournamentId);
    const possibleRefs = resolver.generatePossibleReferences(completedGame);
    console.log('Expected references to resolve:', possibleRefs);
    
    // Check what games have these references
    const allGames = games.filter(g => g.tournamentId === parseInt(tournamentId));
    const gamesWithRefs = allGames.filter(game => {
      if (!game.participants) return false;
      return game.participants.some(p => 
        p.sourceReference && possibleRefs.includes(p.sourceReference)
      );
    });
    console.log('Games with matching references:', gamesWithRefs.map(g => ({
      id: g.id, 
      gameNumber: g.gameNumber,
      references: g.participants?.filter(p => p.sourceReference && possibleRefs.includes(p.sourceReference))
        .map(p => ({ ref: p.sourceReference, resolved: p.resolved, playerId: p.playerId })) || []
    })));
    
    // Trigger the resolution
    const result = await resolveReferencesForGame(tournamentId, completedGame);
    
    return NextResponse.json({
      success: true,
      gameId,
      tournamentId,
      completedGame: {
        id: completedGame.id,
        gameNumber: completedGame.gameNumber,
        status: completedGame.status
      },
      debug: {
        expectedReferences: possibleRefs,
        gamesWithMatchingReferences: gamesWithRefs.map(g => ({
          id: g.id, 
          gameNumber: g.gameNumber,
          references: g.participants?.filter(p => p.sourceReference && possibleRefs.includes(p.sourceReference))
            .map(p => p.sourceReference) || []
        }))
      },
      resolutionResult: result
    });
    
  } catch (error) {
    console.error('Error in test resolution:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}