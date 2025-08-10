import { NextResponse } from 'next/server';
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

function writeGames(games) {
  try {
    fs.writeFileSync(gamesDbPath, JSON.stringify(games, null, 2));
  } catch (error) {
    console.error('Error writing games db.json:', error);
  }
}

export async function GET(request, { params }) {
  const { id: tournamentId, stageId } = params;
  
  const games = readGames();
  const stageGames = games.filter(
    game => game.tournamentId === parseInt(tournamentId) && game.stageId === parseInt(stageId)
  );
  
  return NextResponse.json(stageGames);
}

export async function POST(request, { params }) {
  const { id: tournamentId, stageId } = params;
  const gameData = await request.json();
  
  const games = readGames();
  
  // Generate global unique ID
  const newId = games.length > 0 ? Math.max(...games.map(g => g.id)) + 1 : 1;
  
  // Generate tournament-specific game number
  const tournamentGames = games.filter(g => g.tournamentId === parseInt(tournamentId));
  const gameNumber = tournamentGames.length > 0 ? Math.max(...tournamentGames.map(g => g.gameNumber || 0)) + 1 : 1;
  
  // Create new game with tournament and stage IDs
  const newGame = {
    ...gameData,
    id: newId,
    gameNumber: gameNumber,
    tournamentId: parseInt(tournamentId),
    stageId: parseInt(stageId)
  };

  // Add Double Elimination specific validation and defaults
  if (gameData.tournamentType === 'DoubleElimination') {
    // Validate double elimination specific fields
    if (gameData.gameLetter && typeof gameData.gameLetter !== 'string') {
      return NextResponse.json(
        { error: 'gameLetter must be a string' }, 
        { status: 400 }
      );
    }
    
    if (gameData.bracketType && !['upper', 'lower'].includes(gameData.bracketType)) {
      return NextResponse.json(
        { error: 'bracketType must be "upper" or "lower"' }, 
        { status: 400 }
      );
    }

    // Only set defaults for double elimination if bracketType is explicitly provided
    // Final games should not have bracket properties
    if (gameData.hasOwnProperty('bracketType')) {
      newGame.bracketType = newGame.bracketType || 'upper';
      newGame.bracketPosition = newGame.bracketPosition || 1;
    }
  }
  
  // Validate required fields
  if (!newGame.gameDate || !newGame.gamePlace || !newGame.presenterId) {
    return NextResponse.json(
      { error: 'Missing required fields: gameDate, gamePlace, presenterId' }, 
      { status: 400 }
    );
  }
  
  // Ensure participants is an array (can be empty)
  if (!newGame.participants) {
    newGame.participants = [];
  }
  
  // Validate participants structure if not empty
  if (!Array.isArray(newGame.participants)) {
    return NextResponse.json(
      { error: 'Participants must be an array' }, 
      { status: 400 }
    );
  }
  
  // Validate each participant has required fields (only if participants exist)
  if (newGame.participants.length > 0) {
    for (const participant of newGame.participants) {
      // Allow participants with sourceReference (unresolved references)
      const hasReference = participant.sourceReference && !participant.resolved;
      const hasPlayerId = participant.playerId;
      const hasValidPoints = typeof participant.points === 'number';
      
      // Either must have playerId and points, OR have a sourceReference
      if (!hasReference && (!hasPlayerId || !hasValidPoints)) {
        return NextResponse.json(
          { error: 'Each participant must have playerId and points (number), or have a sourceReference' }, 
          { status: 400 }
        );
      }
      
      // If has reference, points should still be a number (default 0)
      if (hasReference && !hasValidPoints) {
        return NextResponse.json(
          { error: 'Each participant must have points as a number' }, 
          { status: 400 }
        );
      }
    }
  }
  
  games.push(newGame);
  writeGames(games);
  
  return NextResponse.json(newGame, { status: 201 });
}