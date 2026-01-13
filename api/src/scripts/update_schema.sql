
-- Add ALL missing columns to the games table based on GameDocument interface

-- Core fields (likely exist, but good to be safe)
ALTER TABLE games
ADD COLUMN IF NOT EXISTS steam_appid INTEGER,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS steam_app_type TEXT,
ADD COLUMN IF NOT EXISTS release_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS header_image TEXT;

-- Arrays
ALTER TABLE games
ADD COLUMN IF NOT EXISTS developers TEXT[],
ADD COLUMN IF NOT EXISTS publishers TEXT[],
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS categories TEXT[],
ADD COLUMN IF NOT EXISTS genres TEXT[],
ADD COLUMN IF NOT EXISTS screenshots TEXT[],
ADD COLUMN IF NOT EXISTS movies TEXT[],
ADD COLUMN IF NOT EXISTS dlc INTEGER[];

-- Booleans
ALTER TABLE games
ADD COLUMN IF NOT EXISTS is_early_access BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_steam_achievements BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS platforms_windows BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS platforms_mac BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS platforms_linux BOOLEAN DEFAULT FALSE;

-- Numbers
ALTER TABLE games
ADD COLUMN IF NOT EXISTS total_reviews INTEGER,
ADD COLUMN IF NOT EXISTS price_final INTEGER,
ADD COLUMN IF NOT EXISTS price_initial INTEGER,
ADD COLUMN IF NOT EXISTS discount_percent INTEGER,
ADD COLUMN IF NOT EXISTS total_positive INTEGER,
ADD COLUMN IF NOT EXISTS total_negative INTEGER,
ADD COLUMN IF NOT EXISTS current_players INTEGER,
ADD COLUMN IF NOT EXISTS metacritic_score INTEGER,
ADD COLUMN IF NOT EXISTS required_age INTEGER,
ADD COLUMN IF NOT EXISTS positive_rating_percentage INTEGER;

-- Text / JSON / Other
ALTER TABLE games
ADD COLUMN IF NOT EXISTS short_description TEXT,
ADD COLUMN IF NOT EXISTS detailed_description TEXT,
ADD COLUMN IF NOT EXISTS about_the_game TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS price_currency TEXT,
ADD COLUMN IF NOT EXISTS review_score_desc TEXT,
ADD COLUMN IF NOT EXISTS controller_support TEXT,
ADD COLUMN IF NOT EXISTS metacritic_url TEXT,
ADD COLUMN IF NOT EXISTS supported_languages TEXT,
ADD COLUMN IF NOT EXISTS pc_requirements JSONB,
ADD COLUMN IF NOT EXISTS mac_requirements JSONB,
ADD COLUMN IF NOT EXISTS linux_requirements JSONB;

-- Comments for clarity
COMMENT ON COLUMN games.steam_appid IS 'Steam Application ID';
COMMENT ON COLUMN games.has_steam_achievements IS 'Whether the game has achievements';
COMMENT ON COLUMN games.platforms_windows IS 'Supported on Windows';
COMMENT ON COLUMN games.platforms_mac IS 'Supported on Mac';
COMMENT ON COLUMN games.platforms_linux IS 'Supported on Linux';
