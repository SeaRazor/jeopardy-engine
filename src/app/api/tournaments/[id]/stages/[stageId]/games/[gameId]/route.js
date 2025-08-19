import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const gamesDbPath = path.join(process.cwd(), 'src/app/api/games/db.json');
const tournamentsDbPath = path.join(process.cwd(), 'src/app/api/tournaments/db.json');

function readGames() {
  try {
    const data = fs.readFileSync(gamesDbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading games db.json:', error);
    return [];
  }
}

function readTournaments() {
  try {
    const data = fs.readFileSync(tournamentsDbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading tournaments db.json:', error);
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
  const { id: tournamentId, stageId, gameId } = params;
  
  const games = readGames();
  const game = games.find(
    g => g.id === parseInt(gameId) && 
         g.tournamentId === parseInt(tournamentId) && 
         g.stageId === parseInt(stageId)
  );
  
  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  // Fetch tournament data to get stage themes
  const tournaments = readTournaments();
  const tournament = tournaments.find(t => t.id === parseInt(tournamentId));
  
  let stageThemes = [];
  if (tournament && tournament.schema && tournament.schema.stages) {
    const stage = tournament.schema.stages.find(s => s.id === parseInt(stageId));
    if (stage) {
      // Check for both stageThemes (new) and themes (legacy) properties
      stageThemes = stage.stageThemes || stage.themes || [];
    }
  }

  // Return game data with stage themes included
  return NextResponse.json({
    ...game,
    stageThemes
  });
}

export async function PUT(request, { params }) {
  const { id: tournamentId, stageId, gameId } = params;
  const updates = await request.json();
  
  const games = readGames();
  const gameIndex = games.findIndex(
    g => g.id === parseInt(gameId) && 
         g.tournamentId === parseInt(tournamentId) && 
         g.stageId === parseInt(stageId)
  );
  
  if (gameIndex === -1) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }
  
  // Server-side validation for tiebreak creation
  if (updates.gameState?.themes || updates.participants) {
    const currentGame = games[gameIndex];
    const newThemes = updates.gameState?.themes;
    const newParticipants = updates.participants;
    
    // Check if a new tiebreak theme is being added
    if (newThemes && currentGame.gameState?.themes) {
      const currentThemeCount = currentGame.gameState.themes.length;
      const newThemeCount = newThemes.length;
      
      // If themes are being added, check if any are tiebreak themes
      if (newThemeCount > currentThemeCount) {
        const addedThemes = newThemes.slice(currentThemeCount);
        const hasTiebreakTheme = addedThemes.some(theme => 
          theme.name?.startsWith('Перестрелка')
        );
        
        // If adding a tiebreak theme, validate participant count
        if (hasTiebreakTheme && newParticipants) {
          const tiebreakParticipants = newParticipants.filter(p => 
            p.tieBreakResult !== null && p.tieBreakResult !== undefined
          );
          
          if (tiebreakParticipants.length < 2) {
            return NextResponse.json({ 
              error: 'Tiebreak must have at least 2 participants' 
            }, { status: 400 });
          }
        }
      }
    }
    
    // Additional validation: if updating participants with tiebreak results
    if (newParticipants) {
      const tiebreakParticipants = newParticipants.filter(p => 
        p.tieBreakResult !== null && p.tieBreakResult !== undefined
      );
      
      // If there are tiebreak results being set, ensure at least 2 participants
      if (tiebreakParticipants.length === 1) {
        return NextResponse.json({ 
          error: 'Tiebreak must have at least 2 participants' 
        }, { status: 400 });
      }
    }
  }
  
  // Update game while preserving ID and tournament/stage references
  games[gameIndex] = {
    ...games[gameIndex],
    ...updates,
    id: parseInt(gameId),
    tournamentId: parseInt(tournamentId),
    stageId: parseInt(stageId)
  };
  
  writeGames(games);
  
  return NextResponse.json(games[gameIndex]);
}

export async function DELETE(request, { params }) {
  const { id: tournamentId, stageId, gameId } = params;
  
  const games = readGames();
  const gameIndex = games.findIndex(
    g => g.id === parseInt(gameId) && 
         g.tournamentId === parseInt(tournamentId) && 
         g.stageId === parseInt(stageId)
  );
  
  if (gameIndex === -1) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }
  
  const deletedGame = games.splice(gameIndex, 1)[0];
  writeGames(games);
  
  return NextResponse.json({ success: true, deletedGame });
}