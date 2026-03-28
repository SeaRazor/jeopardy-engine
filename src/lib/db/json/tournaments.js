import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'src/app/api/tournaments/db.json');

function read() {
  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch {
    return [];
  }
}

function write(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export function getTournaments() {
  return read();
}

export function getTournamentById(id) {
  const data = read();
  return data.find(t => t.id === parseInt(id)) ?? null;
}

export function createTournament(tournament) {
  const data = read();
  tournament.id = data.length > 0 ? Math.max(...data.map(t => t.id)) + 1 : 1;
  data.push(tournament);
  write(data);
  return tournament;
}

export function updateTournament(id, updates) {
  const data = read();
  const index = data.findIndex(t => t.id === parseInt(id));
  if (index === -1) return null;
  data[index] = { ...data[index], ...updates };
  write(data);
  return data[index];
}

export function deleteTournament(id) {
  const data = read();
  const index = data.findIndex(t => t.id === parseInt(id));
  if (index === -1) return null;
  const deleted = data.splice(index, 1)[0];
  write(data);
  return deleted;
}
