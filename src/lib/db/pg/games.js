import { query, queryOne } from '../pg.js';

const SELECT = `
  SELECT id, game_number AS "gameNumber", tournament_id AS "tournamentId",
    stage_id AS "stageId", game_date AS "gameDate", game_place AS "gamePlace",
    presenter_id AS "presenterId", tournament_type AS "tournamentType",
    game_letter AS "gameLetter", bracket_type AS "bracketType",
    bracket_position AS "bracketPosition", stage_themes AS "stageThemes",
    status, completed, completed_at AS "completedAt", finished_at AS "finishedAt",
    last_updated AS "lastUpdated", participants, game_state AS "gameState",
    completed_themes AS "completedThemes", stage_order AS "stageOrder"
  FROM games
`;

export async function getAllGames() {
  return query(`${SELECT} ORDER BY id`);
}

export async function getGamesByTournament(tournamentId) {
  return query(
    `${SELECT} WHERE tournament_id = $1 ORDER BY game_number`,
    [parseInt(tournamentId)]
  );
}

export async function getGamesByStage(tournamentId, stageId) {
  return query(
    `${SELECT} WHERE tournament_id = $1 AND stage_id = $2 ORDER BY game_number`,
    [parseInt(tournamentId), parseInt(stageId)]
  );
}

export async function getGameById(id) {
  return queryOne(`${SELECT} WHERE id = $1`, [parseInt(id)]);
}

export async function createGame(data) {
  const nextNumRow = await queryOne(
    `SELECT COALESCE(MAX(game_number), 0) + 1 AS next_num
     FROM games WHERE tournament_id = $1`,
    [parseInt(data.tournamentId)]
  );
  const gameNumber = nextNumRow?.next_num ?? 1;

  // Use direct pool query for INSERT with RETURNING
  return queryOne(
    `INSERT INTO games (
       game_number, tournament_id, stage_id, game_date, game_place, presenter_id,
       tournament_type, game_letter, bracket_type, bracket_position, stage_themes,
       status, completed, completed_at, finished_at, last_updated,
       participants, game_state, completed_themes, stage_order
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     RETURNING id, game_number AS "gameNumber", tournament_id AS "tournamentId",
       stage_id AS "stageId", game_date AS "gameDate", game_place AS "gamePlace",
       presenter_id AS "presenterId", tournament_type AS "tournamentType",
       game_letter AS "gameLetter", bracket_type AS "bracketType",
       bracket_position AS "bracketPosition", stage_themes AS "stageThemes",
       status, completed, completed_at AS "completedAt", finished_at AS "finishedAt",
       last_updated AS "lastUpdated", participants, game_state AS "gameState",
       completed_themes AS "completedThemes", stage_order AS "stageOrder"`,
    [
      data.gameNumber ?? gameNumber,
      parseInt(data.tournamentId),
      parseInt(data.stageId),
      data.gameDate || null,
      data.gamePlace || null,
      data.presenterId || null,
      data.tournamentType || null,
      data.gameLetter || null,
      data.bracketType || null,
      data.bracketPosition || null,
      data.stageThemes || [],
      data.status || 'pending',
      data.completed || false,
      data.completedAt || null,
      data.finishedAt || null,
      data.lastUpdated || null,
      data.participants || [],
      data.gameState || {},
      data.completedThemes ?? null,
      data.stageOrder || null,
    ]
  );
}

export async function updateGame(id, updates) {
  const current = await getGameById(id);
  if (!current) return null;
  const g = { ...current, ...updates, id: parseInt(id) };
  return queryOne(
    `UPDATE games SET
       game_number = $1, tournament_id = $2, stage_id = $3, game_date = $4,
       game_place = $5, presenter_id = $6, tournament_type = $7, game_letter = $8,
       bracket_type = $9, bracket_position = $10, stage_themes = $11,
       status = $12, completed = $13, completed_at = $14, finished_at = $15,
       last_updated = $16, participants = $17, game_state = $18,
       completed_themes = $19, stage_order = $20
     WHERE id = $21
     RETURNING id, game_number AS "gameNumber", tournament_id AS "tournamentId",
       stage_id AS "stageId", game_date AS "gameDate", game_place AS "gamePlace",
       presenter_id AS "presenterId", tournament_type AS "tournamentType",
       game_letter AS "gameLetter", bracket_type AS "bracketType",
       bracket_position AS "bracketPosition", stage_themes AS "stageThemes",
       status, completed, completed_at AS "completedAt", finished_at AS "finishedAt",
       last_updated AS "lastUpdated", participants, game_state AS "gameState",
       completed_themes AS "completedThemes", stage_order AS "stageOrder"`,
    [
      g.gameNumber || null,
      parseInt(g.tournamentId),
      parseInt(g.stageId),
      g.gameDate || null,
      g.gamePlace || null,
      g.presenterId || null,
      g.tournamentType || null,
      g.gameLetter || null,
      g.bracketType || null,
      g.bracketPosition || null,
      g.stageThemes || [],
      g.status || 'pending',
      g.completed || false,
      g.completedAt || null,
      g.finishedAt || null,
      g.lastUpdated || null,
      g.participants || [],
      g.gameState || {},
      g.completedThemes ?? null,
      g.stageOrder || null,
      parseInt(id),
    ]
  );
}

export async function deleteGame(id) {
  return queryOne(
    `DELETE FROM games WHERE id = $1
     RETURNING id, game_number AS "gameNumber", tournament_id AS "tournamentId",
       stage_id AS "stageId"`,
    [parseInt(id)]
  );
}

export async function getNextGameNumber(tournamentId) {
  const row = await queryOne(
    `SELECT COALESCE(MAX(game_number), 0) + 1 AS next_num FROM games WHERE tournament_id = $1`,
    [parseInt(tournamentId)]
  );
  return row?.next_num ?? 1;
}
