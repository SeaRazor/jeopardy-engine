// In: /src/app/api/tournaments/route.js

import { NextResponse } from 'next/server';

let mockTournaments = [
  {
    id: 1,
    name: 'Tournament of Champions 2025',
    startDate: '2025-08-01',
    endDate: '2025-08-10',
    type: 'Своя игра',
    schema: 'Олимпийская',
    participants: 32,
  },
  {
    id: 2,
    name: 'College Championship',
    startDate: '2025-09-15',
    endDate: '2025-09-25',
    type: 'Эрудит-Квартет',
    schema: 'Double-elimination',
    participants: 16,
  },
  {
    id: 3,
    name: 'Local Library Fundraiser',
    startDate: '2025-07-20',
    endDate: '2025-07-21',
    type: 'Своя игра',
    schema: 'Олимпийская',
    participants: 8,
  },
];

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
