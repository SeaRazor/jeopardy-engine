import { NextResponse } from 'next/server';
import { getGameById, updateGame, deleteGame } from '../../../../../../../../lib/data/games.js';
import { getTournamentById } from '../../../../../../../../lib/data/tournaments.js';

export async function GET(request, { params }) {
  const { id: tournamentId, stageId, gameId } = await params;

  const game = await getGameById(gameId);

  if (
    !game ||
    game.tournamentId !== parseInt(tournamentId) ||
    game.stageId !== parseInt(stageId)
  ) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  // Fetch tournament data to get stage themes
  const tournament = await getTournamentById(tournamentId);
  let stageThemes = [];

  if (tournament && tournament.schema && tournament.schema.stages) {
    const stage = tournament.schema.stages.find(s => s.id === parseInt(stageId));
    if (stage) {
      stageThemes = stage.stageThemes || stage.themes || [];
    }
  }

  return NextResponse.json({ ...game, stageThemes });
}

export async function PUT(request, { params }) {
  const { id: tournamentId, stageId, gameId } = await params;
  const updates = await request.json();

  const currentGame = await getGameById(gameId);

  if (
    !currentGame ||
    currentGame.tournamentId !== parseInt(tournamentId) ||
    currentGame.stageId !== parseInt(stageId)
  ) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  // Server-side validation for tiebreak creation
  if (updates.gameState?.themes || updates.participants) {
    const newThemes = updates.gameState?.themes;
    const newParticipants = updates.participants;

    if (newThemes && currentGame.gameState?.themes) {
      const currentThemeCount = currentGame.gameState.themes.length;
      const newThemeCount = newThemes.length;

      if (newThemeCount > currentThemeCount) {
        const addedThemes = newThemes.slice(currentThemeCount);
        const hasTiebreakTheme = addedThemes.some(theme =>
          theme.name?.startsWith('Перестрелка')
        );

        if (hasTiebreakTheme && newParticipants) {
          const tiebreakParticipants = newParticipants.filter(
            p => p.tieBreakResult !== null && p.tieBreakResult !== undefined
          );

          if (tiebreakParticipants.length < 2) {
            return NextResponse.json(
              { error: 'Tiebreak must have at least 2 participants' },
              { status: 400 }
            );
          }
        }
      }
    }

    if (newParticipants) {
      const tiebreakParticipants = newParticipants.filter(
        p => p.tieBreakResult !== null && p.tieBreakResult !== undefined
      );

      if (tiebreakParticipants.length === 1) {
        return NextResponse.json(
          { error: 'Tiebreak must have at least 2 participants' },
          { status: 400 }
        );
      }
    }
  }

  const updated = await updateGame(gameId, {
    ...updates,
    id: parseInt(gameId),
    tournamentId: parseInt(tournamentId),
    stageId: parseInt(stageId),
  });

  return NextResponse.json(updated);
}

export async function DELETE(request, { params }) {
  const { id: tournamentId, stageId, gameId } = await params;

  const game = await getGameById(gameId);

  if (
    !game ||
    game.tournamentId !== parseInt(tournamentId) ||
    game.stageId !== parseInt(stageId)
  ) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const deleted = await deleteGame(gameId);
  return NextResponse.json({ success: true, deletedGame: deleted });
}
