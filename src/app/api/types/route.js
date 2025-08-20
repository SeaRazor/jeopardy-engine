import { NextResponse } from 'next/server';

const types = [
    { id: 1, name: 'Своя Игра', playerType: 'person' },
    { id: 2, name: 'Эрудит-квартет',  playerType: 'team' },
];

export async function GET() {
    return NextResponse.json(types);
}