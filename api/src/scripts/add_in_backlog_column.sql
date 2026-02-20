-- Add in_backlog column to user_games table
-- This separates the concept of "Steam library ownership" from "user's backlog intent"
-- Steam-synced games: in_backlog = false (just in the library)
-- Manually added games: in_backlog = true (user wants to play them)

ALTER TABLE user_games ADD COLUMN IF NOT EXISTS in_backlog BOOLEAN DEFAULT false;

-- Optional: Migrate existing want_to_play entries to in_backlog = true
-- These were likely intentional backlog entries before this change.
-- Uncomment the line below if you want to run this migration:
-- UPDATE user_games SET in_backlog = true WHERE status = 'want_to_play';

COMMENT ON COLUMN user_games.in_backlog IS 'Whether the game is in the user''s active backlog (true) or just in their Steam library (false)';
