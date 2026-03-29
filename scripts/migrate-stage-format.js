// Migration: unify Double Elimination stage format
//
// Converts stages using the old explicit-count format:
//   topBracketGameNum, bottomBracketGamesNum, numberOfPlayers, gameWinnersNum
// to the unified participant-based format used by all tournament types:
//   topGameParticipantsNum, topGameWinnersNum, bottomGameParticipantsNum, bottomGameWinnersNum
//
// topGameParticipantsNum === 0 means the upper bracket has a bye this stage.
//
// Usage: DATABASE_URL=<your-url> node scripts/migrate-stage-format.js

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function migrateStage(stage) {
  const hasOldFormat = 'topBracketGameNum' in stage || 'bottomBracketGamesNum' in stage;
  if (!hasOldFormat) return stage;

  const hasUpperGames = (stage.topBracketGameNum || 0) > 0;
  const playersPerGame = stage.numberOfPlayers || 4;
  const winnersNum = stage.gameWinnersNum || 2;

  const migrated = { ...stage };
  migrated.topGameParticipantsNum = hasUpperGames ? playersPerGame : 0;
  migrated.topGameWinnersNum = hasUpperGames ? winnersNum : 0;
  migrated.bottomGameParticipantsNum = playersPerGame;
  migrated.bottomGameWinnersNum = winnersNum;

  delete migrated.topBracketGameNum;
  delete migrated.bottomBracketGamesNum;
  delete migrated.numberOfPlayers;
  delete migrated.gameWinnersNum;

  return migrated;
}

function migrateSchema(schema) {
  if (!schema || !Array.isArray(schema.stages)) return { schema, changed: false };

  let changed = false;
  const migratedStages = schema.stages.map(stage => {
    const migrated = migrateStage(stage);
    if (JSON.stringify(migrated) !== JSON.stringify(stage)) changed = true;
    return migrated;
  });

  if (!changed) return { schema, changed: false };
  return { schema: { ...schema, stages: migratedStages }, changed: true };
}

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: tournaments } = await client.query('SELECT id, name, schema FROM tournaments');
    console.log(`Checking ${tournaments.length} tournaments...`);

    let migratedCount = 0;
    for (const t of tournaments) {
      const { schema: migratedSchema, changed } = migrateSchema(t.schema);
      if (!changed) continue;

      await client.query(
        'UPDATE tournaments SET schema = $1 WHERE id = $2',
        [JSON.stringify(migratedSchema), t.id]
      );
      console.log(`  Migrated tournament ${t.id}: ${t.name}`);
      migratedCount++;
    }

    await client.query('COMMIT');
    console.log(`Done. ${migratedCount} tournament(s) updated.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
