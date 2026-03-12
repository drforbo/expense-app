-- Add batch upload fields to bank_statements
ALTER TABLE bank_statements
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS statement_month TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Add push token to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
