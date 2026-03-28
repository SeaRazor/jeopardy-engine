import { NextResponse } from 'next/server';
import { getTournaments, createTournament } from '../../../lib/data/tournaments.js';

export async function GET() {
  const tournaments = await getTournaments();
  return NextResponse.json(tournaments);
}

export async function POST(request) {
  const newTournament = await request.json();
  const created = await createTournament(newTournament);
  return NextResponse.json(created, { status: 201 });
}
