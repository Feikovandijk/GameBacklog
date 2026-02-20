-- Add user-personalisation metadata columns to user_games
-- These columns store the user's personal notes, ratings, tags, and tracking data.
-- Run this migration against the live database to fix the missing column errors.

ALTER TABLE user_games ADD COLUMN IF NOT EXISTS user_notes TEXT;
ALTER TABLE user_games ADD COLUMN IF NOT EXISTS user_rating INTEGER;
ALTER TABLE user_games ADD COLUMN IF NOT EXISTS user_tags TEXT[] DEFAULT '{}';
ALTER TABLE user_games ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
ALTER TABLE user_games ADD COLUMN IF NOT EXISTS completion_percentage NUMERIC DEFAULT 0;
ALTER TABLE user_games ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
ALTER TABLE user_games ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE user_games ADD COLUMN IF NOT EXISTS analysis JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_games.user_notes IS 'Free-form personal analysis/research notes written by the user';
COMMENT ON COLUMN user_games.user_rating IS '1–5 star rating assigned by the user';
COMMENT ON COLUMN user_games.user_tags IS 'User-defined research/custom tags';
COMMENT ON COLUMN user_games.priority IS 'Backlog priority order (higher = more important)';
COMMENT ON COLUMN user_games.completion_percentage IS 'Game completion percentage (0–100)';
COMMENT ON COLUMN user_games.is_favorite IS 'Whether the user has marked this as a favourite';
COMMENT ON COLUMN user_games.completed_at IS 'Timestamp when the game was marked completed or completed_100';
