import { NextResponse } from 'next/server';

let persons = [
  { id: 1, firstName: 'John', lastName: 'Doe', color: '#e57373' },
  { id: 2, firstName: 'Jane', lastName: 'Smith', color: '#81c784' },
];

let teams = [
  { id: 1, name: 'The Winners', color: '#e57373' },
  { id: 2, name: 'The Best', color: '#81c784' },
];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'persons') {
    return NextResponse.json(persons);
  }

  if (type === 'teams') {
    return NextResponse.json(teams);
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const body = await request.json();

  if (type === 'persons') {
    const newPerson = { ...body, id: Date.now() };
    persons.push(newPerson);
    return NextResponse.json(newPerson);
  }

  if (type === 'teams') {
    const newTeam = { ...body, id: Date.now() };
    teams.push(newTeam);
    return NextResponse.json(newTeam);
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  if (type === 'persons') {
    persons = persons.filter((p) => p.id !== parseInt(id));
    return NextResponse.json({ success: true });
  }

  if (type === 'teams') {
    teams = teams.filter((t) => t.id !== parseInt(id));
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
