import { NextResponse } from 'next/server';
import { getAllGames } from '../../../lib/data/games.js';
import { getTournaments } from '../../../lib/data/tournaments.js';
import { getUsers } from '../../../lib/data/users.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tournamentFilter = searchParams.get('tournament');
  const presenterFilter = searchParams.get('presenter');

  const [games, tournaments, users] = await Promise.all([
    getAllGames(),
    getTournaments(),
    getUsers(),
  ]);

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
      presenterColor: presenter?.color || '#64b5f6',
    };
  });

  if (tournamentFilter && tournamentFilter !== 'all') {
    assignedGames = assignedGames.filter(
      game => game.tournamentId?.toString() === tournamentFilter
    );
  }

  if (presenterFilter && presenterFilter.trim() !== '') {
    const filterLower = presenterFilter.toLowerCase();
    assignedGames = assignedGames.filter(
      game =>
        game.presenterName?.toLowerCase().includes(filterLower) ||
        game.presenterEmail?.toLowerCase().includes(filterLower)
    );
  }

  assignedGames.sort((a, b) => {
    const dateCompare = new Date(a.gameDate) - new Date(b.gameDate);
    if (dateCompare !== 0) return dateCompare;
    return a.tournamentName.localeCompare(b.tournamentName);
  });

  return NextResponse.json(assignedGames);
}
