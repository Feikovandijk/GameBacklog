-- Optimize RLS Policies to fix Supabase Linter Warnings
-- https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
-- https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies

BEGIN;

-- 1. Fix auth_rls_initplan for public.users
DROP POLICY IF EXISTS "users_read_own" ON "public"."users";
CREATE POLICY "users_read_own" ON "public"."users"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "users_update_own" ON "public"."users";
CREATE POLICY "users_update_own" ON "public"."users"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (id = (select auth.uid()));

-- 2. Fix auth_rls_initplan for public.user_games
DROP POLICY IF EXISTS "user_games_read_own" ON "public"."user_games";
CREATE POLICY "user_games_read_own" ON "public"."user_games"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_games_insert_own" ON "public"."user_games";
CREATE POLICY "user_games_insert_own" ON "public"."user_games"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_games_update_own" ON "public"."user_games";
CREATE POLICY "user_games_update_own" ON "public"."user_games"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_games_delete_own" ON "public"."user_games";
CREATE POLICY "user_games_delete_own" ON "public"."user_games"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (user_id = (select auth.uid()));

-- 3. Fix auth_rls_initplan for public.user_achievements
DROP POLICY IF EXISTS "user_achievements_read_own" ON "public"."user_achievements";
CREATE POLICY "user_achievements_read_own" ON "public"."user_achievements"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_achievements_insert_own" ON "public"."user_achievements";
CREATE POLICY "user_achievements_insert_own" ON "public"."user_achievements"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (user_id = (select auth.uid()));

-- 4. Fix auth_rls_initplan for public.user_activity
DROP POLICY IF EXISTS "user_activity_read_own" ON "public"."user_activity";
CREATE POLICY "user_activity_read_own" ON "public"."user_activity"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_activity_insert_own" ON "public"."user_activity";
CREATE POLICY "user_activity_insert_own" ON "public"."user_activity"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (user_id = (select auth.uid()));

-- 5. Fix auth_rls_initplan for public.game_notes
DROP POLICY IF EXISTS "game_notes_read_own" ON "public"."game_notes";
CREATE POLICY "game_notes_read_own" ON "public"."game_notes"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "game_notes_insert_own" ON "public"."game_notes";
CREATE POLICY "game_notes_insert_own" ON "public"."game_notes"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "game_notes_update_own" ON "public"."game_notes";
CREATE POLICY "game_notes_update_own" ON "public"."game_notes"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "game_notes_delete_own" ON "public"."game_notes";
CREATE POLICY "game_notes_delete_own" ON "public"."game_notes"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (user_id = (select auth.uid()));

-- 6. Fix multiple_permissive_policies for public.games
-- Consolidate "Public games are viewable by everyone" and "games_read_public"
DROP POLICY IF EXISTS "Public games are viewable by everyone" ON "public"."games";
DROP POLICY IF EXISTS "games_read_public" ON "public"."games";

CREATE POLICY "games_read_public" ON "public"."games"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

COMMIT;
