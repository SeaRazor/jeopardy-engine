import * as pgImpl from '../db/pg/players.js';
import * as jsonImpl from '../db/json/players.js';

const impl = process.env.DATABASE_URL ? pgImpl : jsonImpl;

export const getPlayers = (type) => impl.getPlayers(type);
export const createPlayer = (data, type) => impl.createPlayer(data, type);
export const deletePlayer = (id) => impl.deletePlayer(id);
