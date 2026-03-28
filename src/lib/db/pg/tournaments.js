import { query, queryOne } from '../pg.js';

const SELECT = `
  SELECT id, name, start_date AS "startDate", end_date AS "endDate",
    type, game_creation_method AS "gameCreationMethod",
    schema, participants, results
  FROM tournaments
`;

export async function getTournaments() {
  return query(`${SELECT} ORDER BY id`);
}

export async function getTournamentById(id) {
  return queryOne(`${SELECT} WHERE id = $1`, [parseInt(id)]);
}

export async function createTournament(data) {
  return queryOne(
    `INSERT INTO tournaments (name, start_date, end_date, type, game_creation_method, schema, participants, results)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, name, start_date AS "startDate", end_date AS "endDate",
       type, game_creation_method AS "gameCreationMethod", schema, participants, results`,
    [
      data.name,
      data.startDate || null,
      data.endDate || null,
      data.type || null,
      data.gameCreationMethod || null,
      data.schema || {},
      data.participants || [],
      data.results || [],
    ]
  );
}

export async function updateTournament(id, updates) {
  const current = await getTournamentById(id);
  if (!current) return null;
  const merged = { ...current, ...updates };
  return queryOne(
    `UPDATE tournaments SET
       name = $1, start_date = $2, end_date = $3, type = $4,
       game_creation_method = $5, schema = $6, participants = $7, results = $8
     WHERE id = $9
     RETURNING id, name, start_date AS "startDate", end_date AS "endDate",
       type, game_creation_method AS "gameCreationMethod", schema, participants, results`,
    [
      merged.name,
      merged.startDate || null,
      merged.endDate || null,
      merged.type || null,
      merged.gameCreationMethod || null,
      merged.schema || {},
      merged.participants || [],
      merged.results || [],
      parseInt(id),
    ]
  );
}

export async function deleteTournament(id) {
  return queryOne(
    `DELETE FROM tournaments WHERE id = $1
     RETURNING id, name, start_date AS "startDate", end_date AS "endDate",
       type, game_creation_method AS "gameCreationMethod", schema, participants, results`,
    [parseInt(id)]
  );
}
