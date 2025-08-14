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
    
    const themes = stage.stageThemes || [];
    
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
    
    // Update the stage themes
    tournament.schema.stages[stageIndex].stageThemes = themes;
    
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