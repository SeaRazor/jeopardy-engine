import { NextResponse } from 'next/server';
import { getTournamentById, updateTournament, deleteTournament } from '../../../../lib/data/tournaments.js';
import { getGamesByTournament, deleteGame } from '../../../../lib/data/games.js';

export async function GET(request, { params }) {
  const { id } = await params;
  const tournament = await getTournamentById(id);

  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }

  return NextResponse.json(tournament);
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const updates = await request.json();

  const updated = await updateTournament(id, updates);

  if (!updated) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const tournamentId = parseInt(id);

  try {
    const tournament = await getTournamentById(tournamentId);
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const tournamentGames = await getGamesByTournament(tournamentId);

    // Delete all associated games
    for (const game of tournamentGames) {
      await deleteGame(game.id);
    }

    const deleted = await deleteTournament(tournamentId);

    return NextResponse.json({
      success: true,
      deletedTournament: deleted,
      deletedGamesCount: tournamentGames.length,
      message: `Tournament "${deleted.name}" and ${tournamentGames.length} associated games deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    return NextResponse.json({ error: 'Failed to delete tournament' }, { status: 500 });
  }
}
