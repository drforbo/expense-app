-- User checklist progress table (tracks completed checklist items)
CREATE TABLE IF NOT EXISTS user_checklist_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- Enable RLS
ALTER TABLE user_checklist_progress ENABLE ROW LEVEL SECURITY;

-- Policies for user_checklist_progress
CREATE POLICY "Users can view own checklist progress"
ON user_checklist_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checklist progress"
ON user_checklist_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checklist progress"
ON user_checklist_progress FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own checklist progress"
ON user_checklist_progress FOR DELETE
USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_checklist_progress_user ON user_checklist_progress(user_id);
