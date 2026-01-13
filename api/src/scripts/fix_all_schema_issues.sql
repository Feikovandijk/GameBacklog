-- Comprehensive Schema Fix Script

-- 1. Fix user_games table
ALTER TABLE user_games
ADD COLUMN IF NOT EXISTS img_icon_url TEXT,
ADD COLUMN IF NOT EXISTS img_logo_url TEXT;

COMMENT ON COLUMN user_games.img_icon_url IS 'URL for the game icon from Steam';
COMMENT ON COLUMN user_games.img_logo_url IS 'URL for the game logo from Steam';

-- 2. Fix user_achievements table
-- Add missing columns
ALTER TABLE user_achievements
ADD COLUMN IF NOT EXISTS achievement_api_name TEXT,
ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS unlock_time TIMESTAMPTZ;

-- Make achievement_id nullable if it exists (since we are using api_name now)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_achievements' AND column_name = 'achievement_id'
    ) THEN
        ALTER TABLE user_achievements ALTER COLUMN achievement_id DROP NOT NULL;
    END IF;
END $$;

-- Ensure unique constraint for upsert
DO $$
BEGIN
    -- Drop old constraint if it exists (optional, but good for cleanup if it conflicts)
    -- IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_achievements_pkey') THEN ... END IF;

    -- Add new unique constraint if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_achievements_user_id_achievement_api_name_key'
    ) THEN
        ALTER TABLE user_achievements
        ADD CONSTRAINT user_achievements_user_id_achievement_api_name_key 
        UNIQUE (user_id, achievement_api_name);
    END IF;
END $$;

COMMENT ON COLUMN user_achievements.achievement_api_name IS 'The API name of the achievement from Steam';
