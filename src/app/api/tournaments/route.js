// In: /src/app/api/tournaments/route.js

import { NextResponse } from 'next/server';
import { initialTournaments } from './InitialTournaments';

let mockTournaments = [...initialTournaments];

export async function GET() {
  return NextResponse.json(mockTournaments);
}


export async function POST(request) {
  const newTournament = await request.json();
  // Assign a simple unique ID for mock purposes
  newTournament.id = mockTournaments.length > 0 ? Math.max(...mockTournaments.map(t => t.id)) + 1 : 1;
  mockTournaments.push(newTournament);
  return NextResponse.json(newTournament, { status: 201 });
}
