-- GameBacklog Database Schema for Supabase
-- This file contains the complete database schema for the GameBacklog application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  steam_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  profile_url TEXT,
  real_name TEXT,
  country_code TEXT,
  is_public_profile BOOLEAN DEFAULT false,
  auto_import_steam_games BOOLEAN DEFAULT true,
  sync_steam_playtime BOOLEAN DEFAULT true,
  default_game_status TEXT DEFAULT 'want_to_play',
  theme TEXT DEFAULT 'dark',
  default_view TEXT DEFAULT 'grid',
  last_active TIMESTAMPTZ,
  last_steam_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_steam_id ON users(steam_id);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);

-- ============================================
-- GAMES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  steam_appid INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  required_age INTEGER,
  is_free BOOLEAN DEFAULT false,
  detailed_description TEXT,
  short_description TEXT,
  supported_languages TEXT,
  header_image TEXT,
  website TEXT,
  developers TEXT[],
  publishers TEXT[],
  price_currency TEXT,
  price_initial INTEGER,
  price_final INTEGER,
  platforms_windows BOOLEAN DEFAULT false,
  platforms_mac BOOLEAN DEFAULT false,
  platforms_linux BOOLEAN DEFAULT false,
  metacritic_score INTEGER,
  metacritic_url TEXT,
  release_date DATE,
  release_date_coming_soon BOOLEAN DEFAULT false,
  coming_soon BOOLEAN DEFAULT false,
  background TEXT,
  background_raw TEXT,
  categories TEXT[],
  genres TEXT[],
  screenshots TEXT[],
  movies TEXT[],
  recommendations INTEGER,
  achievements_count INTEGER DEFAULT 0,
  positive_rating_count INTEGER DEFAULT 0,
  negative_rating_count INTEGER DEFAULT 0,
  positive_rating_percentage NUMERIC(5, 2),
  current_player_count INTEGER DEFAULT 0,
  peak_player_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_steam_appid ON games(steam_appid);
CREATE INDEX IF NOT EXISTS idx_games_name ON games(name);
CREATE INDEX IF NOT EXISTS idx_games_last_updated ON games(last_updated);
CREATE INDEX IF NOT EXISTS idx_games_release_date ON games(release_date);
CREATE INDEX IF NOT EXISTS idx_games_metacritic_score ON games(metacritic_score);

-- ============================================
-- USER_GAMES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  steam_appid INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'want_to_play',
  priority INTEGER,
  user_rating INTEGER,
  user_notes TEXT,
  user_tags TEXT[],
  hours_played NUMERIC(10, 2) DEFAULT 0,
  playtime_2weeks INTEGER DEFAULT 0,
  completion_percentage INTEGER DEFAULT 0,
  is_favorite BOOLEAN DEFAULT false,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_played TIMESTAMPTZ,
  UNIQUE(user_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_user_games_user_id ON user_games(user_id);
CREATE INDEX IF NOT EXISTS idx_user_games_game_id ON user_games(game_id);
CREATE INDEX IF NOT EXISTS idx_user_games_status ON user_games(status);
CREATE INDEX IF NOT EXISTS idx_user_games_last_played ON user_games(last_played);
CREATE INDEX IF NOT EXISTS idx_user_games_playtime_2weeks ON user_games(playtime_2weeks);

-- ============================================
-- ACHIEVEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  steam_appid INTEGER NOT NULL,
  achievement_id TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  icon TEXT,
  icon_gray TEXT,
  global_percentage NUMERIC(5, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(steam_appid, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_achievements_game_id ON achievements(game_id);
CREATE INDEX IF NOT EXISTS idx_achievements_steam_appid ON achievements(steam_appid);

-- ============================================
-- USER_ACHIEVEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  steam_appid INTEGER NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_steam_appid ON user_achievements(steam_appid);

-- ============================================
-- STATISTICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  count INTEGER DEFAULT 0,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_statistics_key ON statistics(key);

-- ============================================
-- REVIEW_HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS review_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  steam_appid INTEGER NOT NULL,
  positive_count INTEGER NOT NULL,
  negative_count INTEGER NOT NULL,
  positive_percentage NUMERIC(5, 2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_history_game_id ON review_history(game_id);
CREATE INDEX IF NOT EXISTS idx_review_history_steam_appid ON review_history(steam_appid);
CREATE INDEX IF NOT EXISTS idx_review_history_recorded_at ON review_history(recorded_at DESC);

-- ============================================
-- USER_ACTIVITY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp ON user_activity(timestamp DESC);

-- ============================================
-- GAME_NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS game_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  color TEXT,
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_notes_user_id ON game_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_game_notes_game_id ON game_notes(game_id);
CREATE INDEX IF NOT EXISTS idx_game_notes_is_pinned ON game_notes(is_pinned);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_notes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users: Users can read their own data, service can do everything
DROP POLICY IF EXISTS users_read_own ON users;
CREATE POLICY users_read_own ON users
  FOR SELECT
  USING (id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (id = auth.uid() OR auth.role() = 'service_role');

-- Games: Public read, service can do everything
DROP POLICY IF EXISTS games_read_public ON games;
CREATE POLICY games_read_public ON games
  FOR SELECT
  USING (true);

-- User Games: Users can read/update their own games, service can do everything
DROP POLICY IF EXISTS user_games_read_own ON user_games;
CREATE POLICY user_games_read_own ON user_games
  FOR SELECT
  USING (user_id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS user_games_insert_own ON user_games;
CREATE POLICY user_games_insert_own ON user_games
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS user_games_update_own ON user_games;
CREATE POLICY user_games_update_own ON user_games
  FOR UPDATE
  USING (user_id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS user_games_delete_own ON user_games;
CREATE POLICY user_games_delete_own ON user_games
  FOR DELETE
  USING (user_id = auth.uid() OR auth.role() = 'service_role');

-- Achievements: Public read, service can do everything
DROP POLICY IF EXISTS achievements_read_public ON achievements;
CREATE POLICY achievements_read_public ON achievements
  FOR SELECT
  USING (true);

-- User Achievements: Users can read their own achievements, service can do everything
DROP POLICY IF EXISTS user_achievements_read_own ON user_achievements;
CREATE POLICY user_achievements_read_own ON user_achievements
  FOR SELECT
  USING (user_id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS user_achievements_insert_own ON user_achievements;
CREATE POLICY user_achievements_insert_own ON user_achievements
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');

-- Statistics: Public read, service can do everything
DROP POLICY IF EXISTS statistics_read_public ON statistics;
CREATE POLICY statistics_read_public ON statistics
  FOR SELECT
  USING (true);

-- Review History: Public read, service can do everything
DROP POLICY IF EXISTS review_history_read_public ON review_history;
CREATE POLICY review_history_read_public ON review_history
  FOR SELECT
  USING (true);

-- User Activity: Users can read their own activity, service can do everything
DROP POLICY IF EXISTS user_activity_read_own ON user_activity;
CREATE POLICY user_activity_read_own ON user_activity
  FOR SELECT
  USING (user_id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS user_activity_insert_own ON user_activity;
CREATE POLICY user_activity_insert_own ON user_activity
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');

-- Game Notes: Users can read/update/delete their own notes, service can do everything
DROP POLICY IF EXISTS game_notes_read_own ON game_notes;
CREATE POLICY game_notes_read_own ON game_notes
  FOR SELECT
  USING (user_id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS game_notes_insert_own ON game_notes;
CREATE POLICY game_notes_insert_own ON game_notes
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS game_notes_update_own ON game_notes;
CREATE POLICY game_notes_update_own ON game_notes
  FOR UPDATE
  USING (user_id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS game_notes_delete_own ON game_notes;
CREATE POLICY game_notes_delete_own ON game_notes
  FOR DELETE
  USING (user_id = auth.uid() OR auth.role() = 'service_role');

-- ============================================
-- PERMISSIONS
-- ============================================

-- Grant permissions to authenticated users
GRANT SELECT, UPDATE ON users TO authenticated;
GRANT SELECT ON games TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_games TO authenticated;
GRANT SELECT ON achievements TO authenticated;
GRANT SELECT, INSERT ON user_achievements TO authenticated;
GRANT SELECT ON statistics TO authenticated;
GRANT SELECT ON review_history TO authenticated;
GRANT SELECT, INSERT ON user_activity TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON game_notes TO authenticated;

-- Grant all permissions to service_role
GRANT ALL ON users TO service_role;
GRANT ALL ON games TO service_role;
GRANT ALL ON user_games TO service_role;
GRANT ALL ON achievements TO service_role;
GRANT ALL ON user_achievements TO service_role;
GRANT ALL ON statistics TO service_role;
GRANT ALL ON review_history TO service_role;
GRANT ALL ON user_activity TO service_role;
GRANT ALL ON game_notes TO service_role;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_games_updated_at BEFORE UPDATE ON user_games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON achievements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_statistics_updated_at BEFORE UPDATE ON statistics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_notes_updated_at BEFORE UPDATE ON game_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



