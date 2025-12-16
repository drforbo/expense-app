-- Migration: Add merchant patterns for smart categorization suggestions
-- This enables the app to learn from user categorizations and suggest categories for similar transactions

-- Merchant patterns table - Learn from user categorizations
CREATE TABLE IF NOT EXISTS merchant_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Pattern identification
  merchant_name_normalized TEXT NOT NULL,  -- Lowercase, trimmed, cleaned

  -- Learned categorization (most common for this merchant)
  most_common_category_id TEXT,
  most_common_category_name TEXT,
  most_common_business_percent INTEGER,
  typical_answers JSONB,  -- Most common Q&A answers for this merchant

  -- Statistics
  occurrence_count INTEGER DEFAULT 1,
  last_categorization_date DATE,

  -- Amount tracking for smart suggestions
  avg_amount DECIMAL(10, 2),
  min_amount DECIMAL(10, 2),
  max_amount DECIMAL(10, 2),

  -- Category history for merchants with variable categorizations
  category_history JSONB,  -- Array of {categoryId, categoryName, businessPercent, amount, date}

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, merchant_name_normalized)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_merchant_patterns_user
  ON merchant_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_patterns_merchant
  ON merchant_patterns(merchant_name_normalized);
CREATE INDEX IF NOT EXISTS idx_merchant_patterns_user_merchant
  ON merchant_patterns(user_id, merchant_name_normalized);

-- Row Level Security (RLS)
ALTER TABLE merchant_patterns ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own patterns
CREATE POLICY "Users can view own merchant patterns"
  ON merchant_patterns
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own patterns
CREATE POLICY "Users can insert own merchant patterns"
  ON merchant_patterns
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own patterns
CREATE POLICY "Users can update own merchant patterns"
  ON merchant_patterns
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own patterns
CREATE POLICY "Users can delete own merchant patterns"
  ON merchant_patterns
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add categorization_source to categorized_transactions
-- This tracks how each transaction was categorized
ALTER TABLE categorized_transactions
ADD COLUMN IF NOT EXISTS categorization_source TEXT DEFAULT 'manual';
-- Values: 'manual', 'subscription_auto', 'suggestion_accepted', 'same_as_above'

-- Add index for filtering by source
CREATE INDEX IF NOT EXISTS idx_categorized_transactions_source
  ON categorized_transactions(categorization_source);
