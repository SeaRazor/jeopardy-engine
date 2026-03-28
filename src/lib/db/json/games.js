import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'src/app/api/games/db.json');

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

export function getAllGames() {
  return read();
}

export function getGamesByTournament(tournamentId) {
  const data = read();
  return data.filter(g => g.tournamentId === parseInt(tournamentId));
}

export function getGamesByStage(tournamentId, stageId) {
  const data = read();
  return data.filter(
    g => g.tournamentId === parseInt(tournamentId) && g.stageId === parseInt(stageId)
  );
}

export function getGameById(id) {
  const data = read();
  return data.find(g => g.id === parseInt(id)) ?? null;
}

export function createGame(gameData) {
  const data = read();
  const newId = data.length > 0 ? Math.max(...data.map(g => g.id)) + 1 : 1;
  const tournamentGames = data.filter(g => g.tournamentId === parseInt(gameData.tournamentId));
  const gameNumber =
    tournamentGames.length > 0
      ? Math.max(...tournamentGames.map(g => g.gameNumber || 0)) + 1
      : 1;
  const newGame = { ...gameData, id: newId, gameNumber };
  data.push(newGame);
  write(data);
  return newGame;
}

export function updateGame(id, updates) {
  const data = read();
  const index = data.findIndex(g => g.id === parseInt(id));
  if (index === -1) return null;
  data[index] = { ...data[index], ...updates, id: parseInt(id) };
  write(data);
  return data[index];
}

export function deleteGame(id) {
  const data = read();
  const index = data.findIndex(g => g.id === parseInt(id));
  if (index === -1) return null;
  const deleted = data.splice(index, 1)[0];
  write(data);
  return deleted;
}

export function getNextGameNumber(tournamentId) {
  const data = read();
  const tournamentGames = data.filter(g => g.tournamentId === parseInt(tournamentId));
  return tournamentGames.length > 0
    ? Math.max(...tournamentGames.map(g => g.gameNumber || 0)) + 1
    : 1;
}
