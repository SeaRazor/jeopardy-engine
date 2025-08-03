// In: /src/app/api/types/route.js

import { NextResponse } from 'next/server';

export async function GET() {
  const types = [
    { id: '1', name: 'Своя игра' },
    { id: '2', name: 'Эрудит-Квартет' },
  ];
  return NextResponse.json(types);
}
