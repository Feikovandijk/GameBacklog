-- Add img_icon_url and img_logo_url to user_games table
ALTER TABLE user_games
ADD COLUMN IF NOT EXISTS img_icon_url TEXT,
ADD COLUMN IF NOT EXISTS img_logo_url TEXT;

COMMENT ON COLUMN user_games.img_icon_url IS 'URL for the game icon from Steam';
COMMENT ON COLUMN user_games.img_logo_url IS 'URL for the game logo from Steam';
