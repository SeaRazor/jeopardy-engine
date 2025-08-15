import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'src', 'app', 'api', 'tournaments', 'db.json');

export async function GET(request, { params }) {
  try {
    const { id: tournamentId, stageId } = params;
    
    const dbData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const tournament = dbData.find(t => t.id === parseInt(tournamentId));
    
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }
    
    const stage = tournament.schema?.stages?.find(s => s.id === parseInt(stageId));
    
    if (!stage) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }
    
    // Handle both old and new theme formats
    let themes = stage.stageThemes || stage.themes || [];
    
    // Convert old string format to new object format if needed
    themes = themes.map(theme => {
      if (typeof theme === 'string') {
        return { name: theme, description: '' };
      }
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
    const { id: tournamentId, stageId } = params;
    const { themes } = await request.json();
    
    if (!Array.isArray(themes)) {
      return NextResponse.json({ error: 'Themes must be an array' }, { status: 400 });
    }

    // Validate theme objects
    for (let i = 0; i < themes.length; i++) {
      const theme = themes[i];
      
      // Support both old string format and new object format
      if (typeof theme === 'string') {
        // Convert string to object format
        themes[i] = { name: theme, description: '' };
      } else if (typeof theme === 'object' && theme !== null) {
        // Validate object format
        if (!theme.name || typeof theme.name !== 'string') {
          return NextResponse.json({ 
            error: `Theme ${i + 1}: name is required and must be a string` 
          }, { status: 400 });
        }
        
        if (theme.name.length > 50) {
          return NextResponse.json({ 
            error: `Theme ${i + 1}: name must not exceed 50 characters` 
          }, { status: 400 });
        }
        
        if (theme.description && typeof theme.description !== 'string') {
          return NextResponse.json({ 
            error: `Theme ${i + 1}: description must be a string` 
          }, { status: 400 });
        }
        
        if (theme.description && theme.description.length > 200) {
          return NextResponse.json({ 
            error: `Theme ${i + 1}: description must not exceed 200 characters` 
          }, { status: 400 });
        }
        
        // Ensure required fields are present
        themes[i] = {
          name: theme.name.trim(),
          description: (theme.description || '').trim()
        };
      } else {
        return NextResponse.json({ 
          error: `Theme ${i + 1}: must be a string or object` 
        }, { status: 400 });
      }
    }
    
    const dbData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const tournamentIndex = dbData.findIndex(t => t.id === parseInt(tournamentId));
    
    if (tournamentIndex === -1) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }
    
    const tournament = dbData[tournamentIndex];
    const stageIndex = tournament.schema?.stages?.findIndex(s => s.id === parseInt(stageId));
    
    if (stageIndex === -1) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }
    
    // Update the stage themes (use both stageThemes and themes for compatibility)
    tournament.schema.stages[stageIndex].stageThemes = themes;
    tournament.schema.stages[stageIndex].themes = themes;
    
    // Write back to database
    fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2));
    
    return NextResponse.json({ 
      message: 'Themes updated successfully',
      themes: themes
    });
  } catch (error) {
    console.error('Error updating stage themes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}