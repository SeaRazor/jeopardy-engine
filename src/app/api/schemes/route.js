// In: /src/app/api/schemes/route.js

import { NextResponse } from 'next/server';

export async function GET() {
  const schemes = [
    { id: '1', name: 'Олимпийская' },
    { id: '2', name: 'Double-elimination' },
    { id: '3', name: 'Круговая' },
  ];
  return NextResponse.json(schemes);
}
