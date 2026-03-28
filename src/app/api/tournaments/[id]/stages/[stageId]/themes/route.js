import { NextResponse } from 'next/server';
import { getTournamentById, updateTournament } from '../../../../../../../lib/data/tournaments.js';

export async function GET(request, { params }) {
  try {
    const { id: tournamentId, stageId } = await params;

    const tournament = await getTournamentById(tournamentId);

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const stage = tournament.schema?.stages?.find(s => s.id === parseInt(stageId));

    if (!stage) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }

    let themes = stage.stageThemes || stage.themes || [];

    // Convert old string format to new object format if needed
    themes = themes.map(theme => {
      if (typeof theme === 'string') return { name: theme, description: '' };
      return theme;
    });

    return NextResponse.json({ themes });
  } catch (error) {
    console.error('Error fetching stage themes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id: tournamentId, stageId } = await params;
    let { themes } = await request.json();

    if (!Array.isArray(themes)) {
      return NextResponse.json({ error: 'Themes must be an array' }, { status: 400 });
    }

    for (let i = 0; i < themes.length; i++) {
      const theme = themes[i];

      if (typeof theme === 'string') {
        themes[i] = { name: theme, description: '' };
      } else if (typeof theme === 'object' && theme !== null) {
        if (!theme.name || typeof theme.name !== 'string') {
          return NextResponse.json(
            { error: `Theme ${i + 1}: name is required and must be a string` },
            { status: 400 }
          );
        }
        if (theme.name.length > 50) {
          return NextResponse.json(
            { error: `Theme ${i + 1}: name must not exceed 50 characters` },
            { status: 400 }
          );
        }
        if (theme.description && typeof theme.description !== 'string') {
          return NextResponse.json(
            { error: `Theme ${i + 1}: description must be a string` },
            { status: 400 }
          );
        }
        if (theme.description && theme.description.length > 200) {
          return NextResponse.json(
            { error: `Theme ${i + 1}: description must not exceed 200 characters` },
            { status: 400 }
          );
        }
        themes[i] = {
          name: theme.name.trim(),
          description: (theme.description || '').trim(),
        };
      } else {
        return NextResponse.json(
          { error: `Theme ${i + 1}: must be a string or object` },
          { status: 400 }
        );
      }
    }

    const tournament = await getTournamentById(tournamentId);

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const stages = tournament.schema?.stages || [];
    const stageIndex = stages.findIndex(s => s.id === parseInt(stageId));

    if (stageIndex === -1) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }

    // Update the stage themes (use both stageThemes and themes for compatibility)
    stages[stageIndex] = {
      ...stages[stageIndex],
      stageThemes: themes,
      themes: themes,
    };

    await updateTournament(tournamentId, {
      schema: { ...tournament.schema, stages },
    });

    return NextResponse.json({ message: 'Themes updated successfully', themes });
  } catch (error) {
    console.error('Error updating stage themes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
