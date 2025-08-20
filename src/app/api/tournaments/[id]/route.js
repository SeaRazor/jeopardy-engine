import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'src/app/api/tournaments/db.json');
const gamesDbPath = path.join(process.cwd(), 'src/app/api/games/db.json');

function readTournaments() {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading tournaments db.json:', error);
    return [];
  }
}

function writeTournaments(tournaments) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(tournaments, null, 2));
  } catch (error) {
    console.error('Error writing tournaments db.json:', error);
  }
}

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
  const { id } = params;
  const tournamentId = parseInt(id);
  
  const tournaments = readTournaments();
  const tournament = tournaments.find(t => t.id === tournamentId);
  
  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }
  
  return NextResponse.json(tournament);
}

export async function PUT(request, { params }) {
  const { id } = params;
  const tournamentId = parseInt(id);
  const updates = await request.json();
  
  const tournaments = readTournaments();
  const tournamentIndex = tournaments.findIndex(t => t.id === tournamentId);
  
  if (tournamentIndex === -1) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }
  
  tournaments[tournamentIndex] = { ...tournaments[tournamentIndex], ...updates };
  writeTournaments(tournaments);
  
  return NextResponse.json(tournaments[tournamentIndex]);
}

export async function DELETE(request, { params }) {
  const { id } = params;
  const tournamentId = parseInt(id);
  
  try {
    // Read both tournaments and games databases
    const tournaments = readTournaments();
    const games = readGames();
    
    // Find tournament to delete
    const tournamentIndex = tournaments.findIndex(t => t.id === tournamentId);
    if (tournamentIndex === -1) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }
    
    // Get tournament info for response
    const deletedTournament = tournaments[tournamentIndex];
    
    // Filter out all games associated with this tournament
    const remainingGames = games.filter(game => game.tournamentId !== tournamentId);
    const deletedGamesCount = games.length - remainingGames.length;
    
    // Remove tournament from tournaments array
    tournaments.splice(tournamentIndex, 1);
    
    // Save updated databases
    writeTournaments(tournaments);
    writeGames(remainingGames);
    
    return NextResponse.json({
      success: true,
      deletedTournament: deletedTournament,
      deletedGamesCount: deletedGamesCount,
      message: `Tournament "${deletedTournament.name}" and ${deletedGamesCount} associated games deleted successfully`
    });
    
  } catch (error) {
    console.error('Error deleting tournament:', error);
    return NextResponse.json(
      { error: 'Failed to delete tournament' }, 
      { status: 500 }
    );
  }
}