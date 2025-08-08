import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'src/app/api/tournaments/db.json');

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