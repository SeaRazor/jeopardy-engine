// Seed script: copies local JSON data into PostgreSQL
// Usage: DATABASE_URL=<your-url> node scripts/seed.js

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function readJson(relPath) {
  try {
    return JSON.parse(readFileSync(join(root, relPath), 'utf-8'));
  } catch {
    return [];
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tournaments = readJson('src/app/api/tournaments/db.json');
    const games = readJson('src/app/api/games/db.json');
    const players = readJson('src/app/api/players/db.json');
    const users = readJson('src/app/api/users/db.json');

    console.log(`Seeding ${tournaments.length} tournaments...`);
    for (const t of tournaments) {
      await client.query(
        `INSERT INTO tournaments (id, name, start_date, end_date, type, game_creation_method, schema, participants, results)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
           type = EXCLUDED.type, game_creation_method = EXCLUDED.game_creation_method,
           schema = EXCLUDED.schema, participants = EXCLUDED.participants, results = EXCLUDED.results`,
        [
          t.id, t.name, t.startDate || null, t.endDate || null,
          t.type || null, t.gameCreationMethod || null,
          JSON.stringify(t.schema || {}),
          JSON.stringify(t.participants || []),
          JSON.stringify(t.results || []),
        ]
      );
    }
    // Sync the tournament id sequence
    if (tournaments.length > 0) {
      const maxId = Math.max(...tournaments.map(t => t.id));
      await client.query(`SELECT setval('tournaments_id_seq', $1)`, [maxId]);
    }

    console.log(`Seeding ${players.length} players...`);
    for (const p of players) {
      await client.query(
        `INSERT INTO players (id, player_type, first_name, last_name, name)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           player_type = EXCLUDED.player_type, first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name, name = EXCLUDED.name`,
        [p.id, p.playerType, p.firstName || null, p.lastName || null, p.name || null]
      );
    }

    console.log(`Seeding ${users.length} users...`);
    for (const u of users) {
      await client.query(
        `INSERT INTO users (id, name, email, role, color)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name, email = EXCLUDED.email,
           role = EXCLUDED.role, color = EXCLUDED.color`,
        [u.id, u.name, u.email || null, u.role || null, u.color || null]
      );
    }
    if (users.length > 0) {
      const maxId = Math.max(...users.map(u => u.id));
      await client.query(`SELECT setval('users_id_seq', $1)`, [maxId]);
    }

    console.log(`Seeding ${games.length} games...`);
    for (const g of games) {
      await client.query(
        `INSERT INTO games (
           id, game_number, tournament_id, stage_id, game_date, game_place, presenter_id,
           tournament_type, game_letter, bracket_type, bracket_position, stage_order,
           stage_themes, status, completed, completed_at, finished_at, last_updated,
           participants, game_state, completed_themes
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
         ON CONFLICT (id) DO UPDATE SET
           game_number = EXCLUDED.game_number, tournament_id = EXCLUDED.tournament_id,
           stage_id = EXCLUDED.stage_id, game_date = EXCLUDED.game_date,
           game_place = EXCLUDED.game_place, presenter_id = EXCLUDED.presenter_id,
           tournament_type = EXCLUDED.tournament_type, game_letter = EXCLUDED.game_letter,
           bracket_type = EXCLUDED.bracket_type, bracket_position = EXCLUDED.bracket_position,
           stage_order = EXCLUDED.stage_order, stage_themes = EXCLUDED.stage_themes,
           status = EXCLUDED.status, completed = EXCLUDED.completed,
           completed_at = EXCLUDED.completed_at, finished_at = EXCLUDED.finished_at,
           last_updated = EXCLUDED.last_updated, participants = EXCLUDED.participants,
           game_state = EXCLUDED.game_state, completed_themes = EXCLUDED.completed_themes`,
        [
          g.id, g.gameNumber || null, g.tournamentId, g.stageId,
          g.gameDate || null, g.gamePlace || null, g.presenterId || null,
          g.tournamentType || null, g.gameLetter || null, g.bracketType || null,
          g.bracketPosition || null, g.stageOrder || null,
          JSON.stringify(g.stageThemes || []),
          g.status || 'pending', g.completed || false,
          g.completedAt || null, g.finishedAt || null, g.lastUpdated || null,
          JSON.stringify(g.participants || []),
          JSON.stringify(g.gameState || {}),
          g.completedThemes != null ? JSON.stringify(g.completedThemes) : null,
        ]
      );
    }
    if (games.length > 0) {
      const maxId = Math.max(...games.map(g => g.id));
      await client.query(`SELECT setval('games_id_seq', $1)`, [maxId]);
    }

    await client.query('COMMIT');
    console.log('Seed complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
