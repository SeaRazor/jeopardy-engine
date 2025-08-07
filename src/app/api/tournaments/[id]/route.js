import { NextResponse } from 'next/server';
import { initialTournaments } from '../InitialTournaments';

// Mock tournament data - in a real app this would come from a database
let mockTournaments = [...initialTournaments];

export async function GET(request, { params }) {
  const { id } = params;
  const tournamentId = parseInt(id);
  
  const tournament = mockTournaments.find(t => t.id === tournamentId);
  
  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }
  
  return NextResponse.json(tournament);
}

export async function PUT(request, { params }) {
  const { id } = params;
  const tournamentId = parseInt(id);
  const updates = await request.json();
  
  const tournamentIndex = mockTournaments.findIndex(t => t.id === tournamentId);
  
  if (tournamentIndex === -1) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }
  
  mockTournaments[tournamentIndex] = { ...mockTournaments[tournamentIndex], ...updates };
  
  return NextResponse.json(mockTournaments[tournamentIndex]);
}