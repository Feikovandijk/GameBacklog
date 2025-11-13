-- Create the user_activity table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp ON user_activity(timestamp DESC);

-- RLS
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Policies: Users can read their own activity; service can insert
DROP POLICY IF EXISTS user_activity_read_own ON user_activity;
CREATE POLICY user_activity_read_own ON user_activity
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_activity_insert_own ON user_activity;
CREATE POLICY user_activity_insert_own ON user_activity
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Permissions
GRANT SELECT, INSERT ON user_activity TO authenticated;
GRANT ALL ON user_activity TO service_role;