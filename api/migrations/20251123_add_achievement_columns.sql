-- Add missing columns to the achievements table

ALTER TABLE achievements 
ADD COLUMN IF NOT EXISTS api_name TEXT,
ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false;

-- Add an index on api_name for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_achievements_api_name ON achievements(api_name);
