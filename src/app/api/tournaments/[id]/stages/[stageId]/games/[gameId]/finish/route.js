// Game Finish API Endpoint
// Handles immediate game completion and reference resolution

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'src/app/api/games/db.json');

function readGames() {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading games db.json:', error);
    return [];
  }
}

function writeGames(games) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(games, null, 2));
  } catch (error) {
    console.error('Error writing games db.json:', error);
  }
}

// Sort participants by ranking (points desc, then tieBreakResult)
function sortParticipantsByRanking(participants) {
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

// Find all games that reference this completed game
function findDependentGames(games, completedGame) {
  const dependentGames = [];
  const stageOrder = completedGame.stageOrder || 1;
  const gamePosition = stageOrder;
  
  // Look for references in format "stageOrder.gamePosition.placement"
  const baseReference = `${completedGame.stageId || 1}.${gamePosition}`;
  
  games.forEach(game => {
    if (game.participants && game.participants.length > 0) {
      const hasReference = game.participants.some(participant => 
        participant.sourceReference && 
        participant.sourceReference.startsWith(baseReference) &&
        !participant.resolved
      );
      
      if (hasReference) {
        dependentGames.push(game);
      }
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
    if (participant.sourceReference && 
        participant.sourceReference.startsWith(baseReference) && 
        !participant.resolved) {
      
      // Parse placement from reference (e.g., "1.1.1" -> placement 1)
      const parts = participant.sourceReference.split('.');
      const placement = parseInt(parts[2]);
      
      if (!isNaN(placement) && placement > 0 && placement <= sortedParticipants.length) {
        const sourceParticipant = sortedParticipants[placement - 1];
        
        return {
          ...participant,
          playerId: sourceParticipant.playerId,
          resolved: true,
          resolvedAt: new Date().toISOString(),
          // Inherit bracket information from source
          lossBracket: sourceParticipant.lossBracket || (placement > 2),
          eliminationCount: sourceParticipant.eliminationCount || (placement > 2 ? 1 : 0)
        };
      }
    }
    
    return participant;
  });
  
  // Count how many were actually resolved
  resolvedCount = updatedParticipants.filter((p, index) => 
    p.resolved && !game.participants[index].resolved
  ).length;
  
  return {
    updatedGame: {
      ...game,
      participants: updatedParticipants,
      lastUpdated: new Date().toISOString()
    },
    resolvedCount
  };
}

// POST /api/tournaments/[id]/stages/[stageId]/games/[gameId]/finish
export async function POST(request, { params }) {
  try {
    const { id: tournamentId, stageId, gameId } = params;
    const body = await request.json();
    
    const games = readGames();
    const gameIndex = games.findIndex(g => g.id === parseInt(gameId));
    
    if (gameIndex === -1) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }
    
    const game = games[gameIndex];
    
    // Validate that game has results
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
    const completedGame = {
      ...game,
      completed: true,
      finishedAt: body.finishedAt || new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    games[gameIndex] = completedGame;
    
    // Find and resolve dependent games
    const dependentGames = findDependentGames(games, completedGame);
    let totalResolvedReferences = 0;
    let resolvedGamesCount = 0;
    
    dependentGames.forEach(dependentGame => {
      const dependentGameIndex = games.findIndex(g => g.id === dependentGame.id);
      if (dependentGameIndex !== -1) {
        const { updatedGame, resolvedCount } = resolveGameReferences(dependentGame, completedGame);
        
        if (resolvedCount > 0) {
          games[dependentGameIndex] = updatedGame;
          totalResolvedReferences += resolvedCount;
          resolvedGamesCount++;
        }
      }
    });
    
    // Save all changes
    writeGames(games);
    
    // Return success response with resolution statistics
    return NextResponse.json({
      success: true,
      message: 'Game finished successfully',
      gameId: parseInt(gameId),
      finishedAt: completedGame.finishedAt,
      resolvedReferences: totalResolvedReferences,
      resolvedGames: resolvedGamesCount,
      dependentGames: dependentGames.length,
      game: completedGame
    });
    
  } catch (error) {
    console.error('Error finishing game:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to finish game' },
      { status: 500 }
    );
  }
}