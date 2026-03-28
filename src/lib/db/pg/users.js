import { query, queryOne } from '../pg.js';

const SELECT = `SELECT id, name, email, role, color FROM users`;

export async function getUsers(role) {
  if (role && role !== 'all') {
    return query(`${SELECT} WHERE role = $1 ORDER BY id`, [role]);
  }
  return query(`${SELECT} ORDER BY id`);
}

export async function getUserById(id) {
  return queryOne(`${SELECT} WHERE id = $1`, [parseInt(id)]);
}

export async function createUser(data) {
  return queryOne(
    `INSERT INTO users (name, email, role, color)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, color`,
    [data.name, data.email || null, data.role || null, data.color || null]
  );
}

export async function updateUser(data) {
  return queryOne(
    `UPDATE users SET name = $1, email = $2, role = $3, color = $4
     WHERE id = $5
     RETURNING id, name, email, role, color`,
    [data.name, data.email || null, data.role || null, data.color || null, parseInt(data.id)]
  );
}

export async function deleteUser(id) {
  await queryOne(`DELETE FROM users WHERE id = $1`, [parseInt(id)]);
  return { success: true };
}
