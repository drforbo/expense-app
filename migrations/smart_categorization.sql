-- Smart categorization system
-- Run this in Supabase SQL Editor

-- 1. Categorization history table (learning memory)
CREATE TABLE IF NOT EXISTS categorization_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  merchant_name TEXT NOT NULL,
  merchant_name_normalized TEXT NOT NULL,
  category_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  business_percent INTEGER NOT NULL DEFAULT 0,
  tax_deductible BOOLEAN NOT NULL DEFAULT false,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_date DATE NOT NULL,
  user_description TEXT,
  categorization_source TEXT DEFAULT 'manual',
  was_corrected BOOLEAN DEFAULT false,
  original_category_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cat_history_user ON categorization_history(user_id);
CREATE INDEX IF NOT EXISTS idx_cat_history_merchant ON categorization_history(user_id, merchant_name_normalized);

-- RLS
ALTER TABLE categorization_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own categorization history" ON categorization_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categorization history" ON categorization_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. New onboarding fields on user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS job_role TEXT,
  ADD COLUMN IF NOT EXISTS main_clients TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS work_location TEXT DEFAULT 'home';

-- 3. Auto-categorization fields on uploaded_transactions
ALTER TABLE uploaded_transactions
  ADD COLUMN IF NOT EXISTS auto_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS auto_category_id TEXT,
  ADD COLUMN IF NOT EXISTS auto_category_name TEXT,
  ADD COLUMN IF NOT EXISTS auto_business_percent INTEGER,
  ADD COLUMN IF NOT EXISTS auto_confidence DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS auto_explanation TEXT,
  ADD COLUMN IF NOT EXISTS auto_review_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_uploaded_txn_auto_status
  ON uploaded_transactions(user_id, auto_status);
