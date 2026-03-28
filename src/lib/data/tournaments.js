import * as pgImpl from '../db/pg/tournaments.js';
import * as jsonImpl from '../db/json/tournaments.js';

const impl = process.env.DATABASE_URL ? pgImpl : jsonImpl;

export const getTournaments = () => impl.getTournaments();
export const getTournamentById = (id) => impl.getTournamentById(id);
export const createTournament = (data) => impl.createTournament(data);
export const updateTournament = (id, data) => impl.updateTournament(id, data);
export const deleteTournament = (id) => impl.deleteTournament(id);
