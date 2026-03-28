import { query, queryOne } from '../pg.js';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export async function getPlayers(type) {
  if (type) {
    return query(
      `SELECT id, player_type AS "playerType", first_name AS "firstName",
         last_name AS "lastName", name FROM players WHERE player_type = $1 ORDER BY id`,
      [type]
    );
  }
  return query(
    `SELECT id, player_type AS "playerType", first_name AS "firstName",
       last_name AS "lastName", name FROM players ORDER BY id`
  );
}

export async function createPlayer(playerData, type) {
  const id = generateId();
  return queryOne(
    `INSERT INTO players (id, player_type, first_name, last_name, name)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, player_type AS "playerType", first_name AS "firstName",
       last_name AS "lastName", name`,
    [
      id,
      type,
      playerData.firstName || null,
      playerData.lastName || null,
      playerData.name || null,
    ]
  );
}

export async function deletePlayer(id) {
  await queryOne(`DELETE FROM players WHERE id = $1`, [id]);
  return { success: true };
}
