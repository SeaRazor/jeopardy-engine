CREATE TABLE tournaments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  type INTEGER,
  game_creation_method TEXT,
  schema JSONB DEFAULT '{}',
  participants JSONB DEFAULT '[]',
  results JSONB DEFAULT '[]'
);

CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  game_number INTEGER,
  tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
  stage_id INTEGER,
  game_date DATE,
  game_place TEXT,
  presenter_id INTEGER,
  tournament_type TEXT,
  game_letter TEXT,
  bracket_type TEXT,
  bracket_position INTEGER,
  stage_order INTEGER,
  stage_themes JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ,
  participants JSONB DEFAULT '[]',
  game_state JSONB DEFAULT '{}',
  completed_themes JSONB
);

CREATE TABLE players (
  id TEXT PRIMARY KEY,
  player_type TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  name TEXT
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT,
  color TEXT
);
