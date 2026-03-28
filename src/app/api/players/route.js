import { NextResponse } from 'next/server';
import { getPlayers, createPlayer, deletePlayer } from '../../../lib/data/players.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const players = await getPlayers(type || undefined);
  return NextResponse.json(players);
}

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const body = await request.json();
  const newPlayer = await createPlayer(body, type);
  return NextResponse.json(newPlayer);
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const result = await deletePlayer(id);
  return NextResponse.json(result);
}
