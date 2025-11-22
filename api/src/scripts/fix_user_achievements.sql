-- Add missing columns to user_achievements table
ALTER TABLE user_achievements
ADD COLUMN IF NOT EXISTS achievement_api_name TEXT,
ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS unlock_time TIMESTAMPTZ;

-- Ensure the unique constraint exists for upsert to work
-- We need to drop the old constraint if it exists and doesn't include the new column, 
-- but since we don't know the state, we'll try to add a unique index if it doesn't exist.
-- However, 'onConflict' in the code uses 'user_id,achievement_api_name'.
-- So we should ensure there is a unique constraint on these two columns.

DO $$
BEGIN
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
