import * as pgImpl from '../db/pg/games.js';
import * as jsonImpl from '../db/json/games.js';

const impl = process.env.DATABASE_URL ? pgImpl : jsonImpl;

export const getAllGames = () => impl.getAllGames();
export const getGamesByTournament = (tournamentId) => impl.getGamesByTournament(tournamentId);
export const getGamesByStage = (tournamentId, stageId) => impl.getGamesByStage(tournamentId, stageId);
export const getGameById = (id) => impl.getGameById(id);
export const createGame = (data) => impl.createGame(data);
export const updateGame = (id, data) => impl.updateGame(id, data);
export const deleteGame = (id) => impl.deleteGame(id);
export const getNextGameNumber = (tournamentId) => impl.getNextGameNumber(tournamentId);
