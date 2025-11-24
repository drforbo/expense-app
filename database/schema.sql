-- User profiles table (stores onboarding data)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Onboarding data
  work_type TEXT NOT NULL, -- content_creation, freelancing, side_hustle, other
  custom_work_type TEXT, -- if work_type = 'other'
  time_commitment TEXT, -- full_time, part_time, occasional
  monthly_income DECIMAL(10, 2),
  receives_gifted_items BOOLEAN DEFAULT false,
  has_international_income BOOLEAN DEFAULT false,
  tracking_goal TEXT, -- compliance, deductions, organization

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_user
  ON user_profiles(user_id);

-- Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Categorized transactions table
CREATE TABLE IF NOT EXISTS categorized_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Transaction details from Plaid
  plaid_transaction_id TEXT NOT NULL,
  merchant_name TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_date DATE NOT NULL,
  plaid_category TEXT[],

  -- Categorization results
  category_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  business_percent INTEGER NOT NULL DEFAULT 100,
  explanation TEXT,
  tax_deductible BOOLEAN NOT NULL DEFAULT false,

  -- Optional: Expense splits (for home office, vehicle, dual-use items)
  -- Format: [{"categoryId": "home_office", "amount": 30, "percent": 30}, {...}]
  splits JSONB,

  -- User's answers (stored as JSON)
  user_answers JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint to prevent duplicates
  UNIQUE(user_id, plaid_transaction_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_categorized_transactions_user
  ON categorized_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_categorized_transactions_date
  ON categorized_transactions(transaction_date DESC);

-- Row Level Security (RLS)
ALTER TABLE categorized_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own transactions
CREATE POLICY "Users can view own transactions"
  ON categorized_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own transactions
CREATE POLICY "Users can insert own transactions"
  ON categorized_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own transactions
CREATE POLICY "Users can update own transactions"
  ON categorized_transactions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own transactions
CREATE POLICY "Users can delete own transactions"
  ON categorized_transactions
  FOR DELETE
  USING (auth.uid() = user_id);
