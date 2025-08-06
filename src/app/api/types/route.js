import { NextResponse } from 'next/server';

const types = [
    { id: 1, name: 'SI' },
    { id: 2, name: 'EK' },
];

export async function GET() {
    return NextResponse.json(types);
}