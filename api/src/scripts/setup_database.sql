-- GameBacklog Database Setup Script
-- This script initializes the entire database schema, including tables, columns, constraints, and RLS policies.
-- It merges logic from:
-- - update_schema.sql
-- - add_images_to_user_games.sql
-- - fix_all_schema_issues.sql
-- - fix_user_achievements.sql
-- - optimize_rls_policies.sql

BEGIN;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--------------------------------------------------------------------------------
-- 1. Create Tables
--------------------------------------------------------------------------------

-- Users Table (Public Profile)
-- Note: We do NOT reference auth.users because we are using custom Steam auth
CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "display_name" TEXT,
    "steam_id" TEXT,
    "last_steam_sync" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW(),
    "avatar_url" TEXT,
    "profile_url" TEXT,
    "real_name" TEXT,
    "country_code" TEXT,
    "is_public_profile" BOOLEAN DEFAULT FALSE,
    "last_active" TIMESTAMPTZ,
    "auto_import_steam_games" BOOLEAN DEFAULT TRUE,
    "sync_steam_playtime" BOOLEAN DEFAULT TRUE,
    "default_game_status" TEXT DEFAULT 'want_to_play',
    "theme" TEXT DEFAULT 'dark',
    "default_view" TEXT DEFAULT 'grid'
);

-- Ensure user columns exist if table was already created
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "profile_url" TEXT;
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "real_name" TEXT;
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "country_code" TEXT;
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "is_public_profile" BOOLEAN DEFAULT FALSE;
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "last_active" TIMESTAMPTZ;
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "auto_import_steam_games" BOOLEAN DEFAULT TRUE;
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "sync_steam_playtime" BOOLEAN DEFAULT TRUE;
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "default_game_status" TEXT DEFAULT 'want_to_play';
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "theme" TEXT DEFAULT 'dark';
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "default_view" TEXT DEFAULT 'grid';

-- Fix ID column to auto-generate UUIDs and remove FK to auth.users if it exists
DO $$
BEGIN
    -- Try to drop the foreign key constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_id_fkey' AND table_name = 'users') THEN
        ALTER TABLE "public"."users" DROP CONSTRAINT "users_id_fkey";
    END IF;
    
    -- Also check for generic foreign key name just in case
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_id_fkey1' AND table_name = 'users') THEN
        ALTER TABLE "public"."users" DROP CONSTRAINT "users_id_fkey1";
    END IF;
END $$;

-- Ensure ID has default value
ALTER TABLE "public"."users" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- Games Table (Master Game List)
CREATE TABLE IF NOT EXISTS "public"."games" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "steam_appid" INTEGER UNIQUE,
    "name" TEXT,
    "last_updated" TIMESTAMPTZ DEFAULT NOW(),
    "steam_app_type" TEXT,
    "release_date" TIMESTAMPTZ,
    "header_image" TEXT,
    "developers" TEXT[],
    "publishers" TEXT[],
    "tags" TEXT[],
    "categories" TEXT[],
    "genres" TEXT[],
    "screenshots" TEXT[],
    "movies" TEXT[],
    "dlc" INTEGER[],
    "is_early_access" BOOLEAN DEFAULT FALSE,
    "is_free" BOOLEAN DEFAULT FALSE,
    "has_steam_achievements" BOOLEAN DEFAULT FALSE,
    "platforms_windows" BOOLEAN DEFAULT FALSE,
    "platforms_mac" BOOLEAN DEFAULT FALSE,
    "platforms_linux" BOOLEAN DEFAULT FALSE,
    "total_reviews" INTEGER,
    "price_final" INTEGER,
    "price_initial" INTEGER,
    "discount_percent" INTEGER,
    "total_positive" INTEGER,
    "total_negative" INTEGER,
    "current_players" INTEGER,
    "metacritic_score" INTEGER,
    "required_age" INTEGER,
    "positive_rating_percentage" INTEGER,
    "short_description" TEXT,
    "detailed_description" TEXT,
    "about_the_game" TEXT,
    "website" TEXT,
    "price_currency" TEXT,
    "review_score_desc" TEXT,
    "controller_support" TEXT,
    "metacritic_url" TEXT,
    "supported_languages" TEXT,
    "pc_requirements" JSONB,
    "mac_requirements" JSONB,
    "linux_requirements" JSONB,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "player_count_last_updated" TIMESTAMPTZ,
    "player_count_zero_sync_streak" INTEGER DEFAULT 0
);

-- Ensure created_at exists if table was already created
ALTER TABLE "public"."games" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE "public"."games" ADD COLUMN IF NOT EXISTS "player_count_last_updated" TIMESTAMPTZ;
ALTER TABLE "public"."games" ADD COLUMN IF NOT EXISTS "player_count_zero_sync_streak" INTEGER DEFAULT 0;

-- Player Count History Table
CREATE TABLE IF NOT EXISTS "public"."player_count_history" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "game_id" UUID REFERENCES "public"."games"("id") ON DELETE CASCADE,
    "player_count" INTEGER,
    "date" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for player_count_history
ALTER TABLE "public"."player_count_history" ENABLE ROW LEVEL SECURITY;
-- Allow public read for player count history (optional, adjust as needed)
DROP POLICY IF EXISTS "player_count_history_read_public" ON "public"."player_count_history";
CREATE POLICY "player_count_history_read_public" ON "public"."player_count_history" AS PERMISSIVE FOR SELECT TO public USING (true);

-- User Games Table (Backlog)
CREATE TABLE IF NOT EXISTS "public"."user_games" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "game_id" UUID REFERENCES "public"."games"("id") ON DELETE SET NULL,
    "steam_appid" INTEGER,
    "status" TEXT DEFAULT 'want_to_play',
    "hours_played" NUMERIC DEFAULT 0,
    "playtime_2weeks" NUMERIC DEFAULT 0,
    "added_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW(),
    "last_played" TIMESTAMPTZ,
    "img_icon_url" TEXT,
    "img_logo_url" TEXT,
    "stats_json" JSONB
);

-- Achievements Table (Master Achievement List)
CREATE TABLE IF NOT EXISTS "public"."achievements" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "game_id" UUID REFERENCES "public"."games"("id") ON DELETE CASCADE,
    "steam_appid" INTEGER,
    "name" TEXT,
    "achievement_id" TEXT,
    "api_name" TEXT,
    "display_name" TEXT,
    "description" TEXT,
    "icon" TEXT,
    "icon_gray" TEXT,
    "hidden" BOOLEAN DEFAULT FALSE,
    "global_percentage" NUMERIC
);

-- User Achievements Table
CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "steam_appid" INTEGER,
    "achievement_api_name" TEXT,
    "is_unlocked" BOOLEAN DEFAULT FALSE,
    "unlock_time" TIMESTAMPTZ,
    "achievement_id" TEXT -- Kept for legacy, nullable
);

-- Steam Sync State Table
CREATE TABLE IF NOT EXISTS "public"."steam_sync_state" (
    "id" TEXT PRIMARY KEY,
    "changenumber" INTEGER
);

-- Statistics Table
CREATE TABLE IF NOT EXISTS "public"."statistics" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "key" TEXT UNIQUE,
    "count" INTEGER DEFAULT 0
);

-- RPC for atomic increments
CREATE OR REPLACE FUNCTION increment_stat(stat_key TEXT, amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO "public"."statistics" ("key", "count")
  VALUES (stat_key, amount)
  ON CONFLICT ("key")
  DO UPDATE SET "count" = "statistics"."count" + amount;
END;
$$;

-- Game Notes Table
CREATE TABLE IF NOT EXISTS "public"."game_notes" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "game_id" UUID REFERENCES "public"."games"("id") ON DELETE CASCADE,
    "note" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- User Activity Table
CREATE TABLE IF NOT EXISTS "public"."user_activity" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "type" TEXT,
    "data" JSONB,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------------------------
-- 2. Constraints & Indexes
--------------------------------------------------------------------------------

-- Ensure unique constraint for user_achievements upsert
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_achievements_user_id_achievement_api_name_key'
    ) THEN
        ALTER TABLE "public"."user_achievements"
        ADD CONSTRAINT "user_achievements_user_id_achievement_api_name_key" 
        UNIQUE ("user_id", "achievement_api_name");
    END IF;
END $$;

--------------------------------------------------------------------------------
-- 3. Comments
--------------------------------------------------------------------------------

COMMENT ON COLUMN "public"."games"."steam_appid" IS 'Steam Application ID';
COMMENT ON COLUMN "public"."games"."has_steam_achievements" IS 'Whether the game has achievements';
COMMENT ON COLUMN "public"."user_games"."img_icon_url" IS 'URL for the game icon from Steam';
COMMENT ON COLUMN "public"."user_games"."img_logo_url" IS 'URL for the game logo from Steam';
COMMENT ON COLUMN "public"."user_achievements"."achievement_api_name" IS 'The API name of the achievement from Steam';
COMMENT ON COLUMN "public"."users"."auto_import_steam_games" IS 'Whether to automatically import games from Steam on login/sync';
COMMENT ON COLUMN "public"."users"."sync_steam_playtime" IS 'Whether to sync playtime from Steam';

--------------------------------------------------------------------------------
-- 4. RLS Policies
--------------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."games" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_games" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."achievements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."steam_sync_state" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."statistics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."game_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_activity" ENABLE ROW LEVEL SECURITY;

-- 4.1 Users Policies
DROP POLICY IF EXISTS "users_read_own" ON "public"."users";
CREATE POLICY "users_read_own" ON "public"."users" AS PERMISSIVE FOR SELECT TO authenticated USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "users_update_own" ON "public"."users";
CREATE POLICY "users_update_own" ON "public"."users" AS PERMISSIVE FOR UPDATE TO authenticated USING (id = (select auth.uid()));

-- 4.2 Games Policies (Public Read)
DROP POLICY IF EXISTS "Public games are viewable by everyone" ON "public"."games";
DROP POLICY IF EXISTS "games_read_public" ON "public"."games";
CREATE POLICY "games_read_public" ON "public"."games" AS PERMISSIVE FOR SELECT TO public USING (true);

-- Allow service role (or authenticated users if needed) to insert/update games
-- For now, we assume the sync worker uses the service role key which bypasses RLS.

-- 4.3 User Games Policies
DROP POLICY IF EXISTS "user_games_read_own" ON "public"."user_games";
CREATE POLICY "user_games_read_own" ON "public"."user_games" AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_games_insert_own" ON "public"."user_games";
CREATE POLICY "user_games_insert_own" ON "public"."user_games" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_games_update_own" ON "public"."user_games";
CREATE POLICY "user_games_update_own" ON "public"."user_games" AS PERMISSIVE FOR UPDATE TO authenticated USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_games_delete_own" ON "public"."user_games";
CREATE POLICY "user_games_delete_own" ON "public"."user_games" AS PERMISSIVE FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- 4.4 User Achievements Policies
DROP POLICY IF EXISTS "user_achievements_read_own" ON "public"."user_achievements";
CREATE POLICY "user_achievements_read_own" ON "public"."user_achievements" AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_achievements_insert_own" ON "public"."user_achievements";
CREATE POLICY "user_achievements_insert_own" ON "public"."user_achievements" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));

-- 4.5 User Activity Policies
DROP POLICY IF EXISTS "user_activity_read_own" ON "public"."user_activity";
CREATE POLICY "user_activity_read_own" ON "public"."user_activity" AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_activity_insert_own" ON "public"."user_activity";
CREATE POLICY "user_activity_insert_own" ON "public"."user_activity" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));

-- 4.6 Game Notes Policies
DROP POLICY IF EXISTS "game_notes_read_own" ON "public"."game_notes";
CREATE POLICY "game_notes_read_own" ON "public"."game_notes" AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "game_notes_insert_own" ON "public"."game_notes";
CREATE POLICY "game_notes_insert_own" ON "public"."game_notes" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "game_notes_update_own" ON "public"."game_notes";
CREATE POLICY "game_notes_update_own" ON "public"."game_notes" AS PERMISSIVE FOR UPDATE TO authenticated USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "game_notes_delete_own" ON "public"."game_notes";
CREATE POLICY "game_notes_delete_own" ON "public"."game_notes" AS PERMISSIVE FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- 4.7 Achievements Policies (Public Read)
DROP POLICY IF EXISTS "achievements_read_public" ON "public"."achievements";
CREATE POLICY "achievements_read_public" ON "public"."achievements" AS PERMISSIVE FOR SELECT TO public USING (true);

-- 4.8 Steam Sync State & Statistics (Service Role Only usually, but readable for debugging if needed)
-- We'll leave them restricted by default (no policy = deny all for anon/authenticated, allow for service role)

COMMIT;
