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

export async function GET(request, { params }) {
  const { id: tournamentId } = params;
  
  const games = readGames();
  const tournamentGames = games.filter(
    game => game.tournamentId === parseInt(tournamentId)
  );
  
  // Sort by gameNumber for consistent ordering
  tournamentGames.sort((a, b) => (a.gameNumber || 0) - (b.gameNumber || 0));
  
  return NextResponse.json(tournamentGames);
}