import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { generateId } from '../../util/idGenerator';

const dbPath = path.join(process.cwd(), 'src', 'app', 'api', 'players', 'db.json');

async function readData() {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []; // Return empty array if file doesn't exist
    }
    throw error;
  }
}

async function writeData(data) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const players = await readData();

  if (type === 'person') {
    return NextResponse.json(players.filter(p => p.playerType === 'person'));
  }

  if (type === 'team') {
    return NextResponse.json(players.filter(p => p.playerType === 'team'));
  }

  return NextResponse.json(players);
}

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const body = await request.json();
  const players = await readData();

  const newPlayer = { ...body, id: generateId(), playerType: type };
  players.push(newPlayer);
  await writeData(players);

  return NextResponse.json(newPlayer);
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const players = await readData();

  const filteredPlayers = players.filter((p) => p.id !== id);
  await writeData(filteredPlayers);

  return NextResponse.json({ success: true });
}