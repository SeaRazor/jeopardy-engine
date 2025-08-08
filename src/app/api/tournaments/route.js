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

export async function GET() {
  const tournaments = readTournaments();
  return NextResponse.json(tournaments);
}

export async function POST(request) {
  const newTournament = await request.json();
  const tournaments = readTournaments();
  
  // Assign a simple unique ID
  newTournament.id = tournaments.length > 0 ? Math.max(...tournaments.map(t => t.id)) + 1 : 1;
  
  tournaments.push(newTournament);
  writeTournaments(tournaments);
  
  return NextResponse.json(newTournament, { status: 201 });
}
