import { NextResponse } from 'next/server';

const types = [
    { id: 1, name: 'Своя Игра' },
    { id: 2, name: 'Эрудит-квартет' },
];

export async function GET() {
    return NextResponse.json(types);
}