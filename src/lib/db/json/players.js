import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'src/app/api/players/db.json');

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

async function read() {
  try {
    const { readFile } = await import('fs/promises');
    const data = await readFile(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function write(data) {
  const { writeFile } = await import('fs/promises');
  await writeFile(dbPath, JSON.stringify(data, null, 2));
}

export async function getPlayers(type) {
  const data = await read();
  if (type) return data.filter(p => p.playerType === type);
  return data;
}

export async function createPlayer(playerData, type) {
  const data = await read();
  const newPlayer = { ...playerData, id: generateId(), playerType: type };
  data.push(newPlayer);
  await write(data);
  return newPlayer;
}

export async function deletePlayer(id) {
  const data = await read();
  const filtered = data.filter(p => p.id !== id);
  await write(filtered);
  return { success: true };
}
