
import { NextResponse } from 'next/server';

const teams = [
    { id: 1, name: 'Gryffindor' },
    { id: 2, name: 'Slytherin' },
];

export async function GET() {
    return NextResponse.json(teams);
}

export async function POST(request) {
    const team = await request.json();
    team.id = teams.length + 1;
    teams.push(team);
    return NextResponse.json(team, { status: 201 });
}
