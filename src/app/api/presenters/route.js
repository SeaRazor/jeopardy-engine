import { NextResponse } from 'next/server';

let presenters = [
  { id: 1, firstName: 'Alex', lastName: 'Trebek', email: 'alex.trebek@jeopardy.com', color: '#e57373' },
  { id: 2, firstName: 'Mayim', lastName: 'Bialik', email: 'mayim.bialik@jeopardy.com', color: '#81c784' },
];

export async function GET() {
  return NextResponse.json(presenters);
}

export async function POST(request) {
  const body = await request.json();
  const newPresenter = { ...body, id: Date.now() };
  presenters.push(newPresenter);
  return NextResponse.json(newPresenter);
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  presenters = presenters.filter((p) => p.id !== parseInt(id));
  return NextResponse.json({ success: true });
}
