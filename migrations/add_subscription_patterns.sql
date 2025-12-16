-- Migration: Add subscription patterns for recurring transaction detection
-- This enables the app to detect and auto-categorize recurring subscriptions

-- Subscription patterns table - Track detected recurring transactions
CREATE TABLE IF NOT EXISTS subscription_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Pattern identification
  merchant_name_normalized TEXT NOT NULL,
  merchant_name_display TEXT NOT NULL,  -- Original display name

  -- Amount matching (with tolerance)
  amount DECIMAL(10, 2) NOT NULL,
  amount_tolerance DECIMAL(10, 2) DEFAULT 0.50,  -- Allow 50p variance

  -- Frequency detection
  frequency TEXT NOT NULL,  -- 'weekly', 'monthly', 'yearly'
  avg_interval_days INTEGER,  -- Average days between charges

  -- Confidence and status
  confidence_score DECIMAL(3, 2) DEFAULT 0.00,  -- 0.00 to 1.00
  status TEXT DEFAULT 'detected',  -- 'detected', 'confirmed', 'rejected'

  -- Categorization (set when confirmed)
  category_id TEXT,
  category_name TEXT,
  business_percent INTEGER DEFAULT 0,

  -- Matched transactions
  matched_transaction_ids TEXT[],  -- Array of transaction IDs
  transaction_count INTEGER DEFAULT 0,

  -- Next expected charge (for future auto-categorization)
  last_charge_date DATE,
  next_expected_date DATE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(user_id, merchant_name_normalized, amount)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_subscription_patterns_user
  ON subscription_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_patterns_status
  ON subscription_patterns(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscription_patterns_merchant
  ON subscription_patterns(merchant_name_normalized);

-- Row Level Security (RLS)
ALTER TABLE subscription_patterns ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own patterns
CREATE POLICY "Users can view own subscription patterns"
  ON subscription_patterns
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own patterns
CREATE POLICY "Users can insert own subscription patterns"
  ON subscription_patterns
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own patterns
CREATE POLICY "Users can update own subscription patterns"
  ON subscription_patterns
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own patterns
CREATE POLICY "Users can delete own subscription patterns"
  ON subscription_patterns
  FOR DELETE
  USING (auth.uid() = user_id);
