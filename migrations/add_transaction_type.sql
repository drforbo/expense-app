-- Add transaction_type column to categorized_transactions
-- Run this in Supabase SQL Editor

-- Add the transaction_type column
ALTER TABLE categorized_transactions
ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'expense';

-- Add comment for documentation
COMMENT ON COLUMN categorized_transactions.transaction_type IS 'Type of transaction: expense or income';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_categorized_transactions_type ON categorized_transactions(transaction_type);
