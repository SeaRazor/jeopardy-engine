import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const gamesDbPath = path.join(process.cwd(), 'src/app/api/games/db.json');
const tournamentsDbPath = path.join(process.cwd(), 'src/app/api/tournaments/db.json');
const usersDbPath = path.join(process.cwd(), 'src/app/api/users/db.json');

const readJsonFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tournamentFilter = searchParams.get('tournament');
  const presenterFilter = searchParams.get('presenter');
  
  const games = readJsonFile(gamesDbPath);
  const tournaments = readJsonFile(tournamentsDbPath);
  const users = readJsonFile(usersDbPath);
  
  // Filter games that have assigned presenters
  let assignedGames = games.filter(game => game.presenterId);
  
  // Enrich games with tournament and presenter data
  assignedGames = assignedGames.map(game => {
    const tournament = tournaments.find(t => t.id === game.tournamentId);
    const presenter = users.find(u => u.id === game.presenterId);
    
    return {
      ...game,
      tournamentName: tournament?.name || 'Unknown Tournament',
      presenterName: presenter?.name || 'Unknown Presenter',
      presenterEmail: presenter?.email || '',
      presenterColor: presenter?.color || '#64b5f6'
    };
  });
  
  // Apply filters
  if (tournamentFilter && tournamentFilter !== 'all') {
    assignedGames = assignedGames.filter(game => 
      game.tournamentId?.toString() === tournamentFilter
    );
  }
  
  if (presenterFilter && presenterFilter.trim() !== '') {
    const filterLower = presenterFilter.toLowerCase();
    assignedGames = assignedGames.filter(game => 
      game.presenterName?.toLowerCase().includes(filterLower) ||
      game.presenterEmail?.toLowerCase().includes(filterLower)
    );
  }
  
  // Sort by game date and tournament
  assignedGames.sort((a, b) => {
    const dateCompare = new Date(a.gameDate) - new Date(b.gameDate);
    if (dateCompare !== 0) return dateCompare;
    return a.tournamentName.localeCompare(b.tournamentName);
  });
  
  return NextResponse.json(assignedGames);
}