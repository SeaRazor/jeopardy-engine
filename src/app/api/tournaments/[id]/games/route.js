import { NextResponse } from 'next/server';
import { getGamesByTournament } from '../../../../../lib/data/games.js';

export async function GET(request, { params }) {
  const { id: tournamentId } = params;

  const tournamentGames = await getGamesByTournament(tournamentId);

  // Sort by gameNumber for consistent ordering
  tournamentGames.sort((a, b) => (a.gameNumber || 0) - (b.gameNumber || 0));

  return NextResponse.json(tournamentGames);
}
