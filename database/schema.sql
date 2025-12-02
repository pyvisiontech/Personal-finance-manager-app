

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create currency enum type
CREATE TYPE currency_type AS ENUM ('USD', 'INR', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CNY', 'SGD', 'AED');

-- ============================================================================
-- 1. PROFILES TABLE
-- Extends Supabase auth.users
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  email TEXT,
  accountant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  currency currency_type NOT NULL DEFAULT 'INR',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 1B. CLIENTS TABLE (for Python backend compatibility)
-- Python backend expects a 'clients' table, so we create it as a mirror of profiles
-- ============================================================================
CREATE TABLE clients (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  email TEXT,
  accountant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 2. CATEGORIES TABLE
-- Transaction categories (global system categories)
-- ============================================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  type TEXT DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 3. ACCOUNTS TABLE
-- Bank accounts, UPI, wallets, etc.
-- ============================================================================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                      -- e.g. HDFC Savings, SBI Credit Card
  institution TEXT,                        -- HDFC, ICICI, Google Pay, Paytm
  account_type TEXT NOT NULL,              -- bank, upi, credit_card, wallet, cash
  account_number TEXT,                     -- masked last 4 digits
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 4. TRANSACTIONS TABLE
-- All financial transactions
-- ============================================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('manual', 'statement', 'bank_link', 'invoice')),
  amount NUMERIC NOT NULL,
  currency currency_type NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
  raw_description TEXT,                                   -- original text from statement
  merchant TEXT,                                          -- parsed merchant name
  status TEXT DEFAULT 'final' CHECK (status IN ('pending', 'final')),
  category_ai_id UUID REFERENCES categories(id),          -- AI assigned category
  category_user_id UUID REFERENCES categories(id),        -- User overridden category
  occurred_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 5. TRANSACTION_CATEGORIES TABLE (HISTORY)
-- Tracks category assignment history for AI training
-- ============================================================================
CREATE TABLE transaction_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  confidence NUMERIC,                                -- AI confidence score (0-1)
  assigned_by TEXT NOT NULL CHECK (assigned_by IN ('auto_model', 'user_override')),
  model_version TEXT,                                -- version of model used
  feedback TEXT,                                     -- optional correction note
  user_id UUID REFERENCES profiles(id),             -- who made the override
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 6. STATEMENT_IMPORTS TABLE
-- Tracks uploaded bank statements and invoices
-- ============================================================================
CREATE TABLE statement_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('bank_statement', 'invoice')),
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
  processor_job_id TEXT,                            -- id from Python backend/job queue
  processed_at TIMESTAMP,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 7. CATEGIZER_FEEDBACK TABLE
-- Tracks user corrections for AI training (RAG)
-- ============================================================================
CREATE TABLE categorizer_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  old_category UUID REFERENCES categories(id),
  new_category UUID REFERENCES categories(id) NOT NULL,
  reason TEXT,                                        -- optional justification
  user_id UUID REFERENCES profiles(id),
  source TEXT DEFAULT 'user_override' CHECK (source IN ('user_override', 'analyst_review')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 8. BUDGET_PERIODS TABLE
-- Budgeting windows (monthly, weekly, yearly, custom)
-- ============================================================================
CREATE TABLE budget_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('monthly', 'weekly', 'yearly', 'custom')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

-- ============================================================================
-- 9. BUDGET_CATEGORIES TABLE
-- Budget allocated per category per period
-- ============================================================================
CREATE TABLE budget_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_period_id UUID REFERENCES budget_periods(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  planned_amount NUMERIC NOT NULL CHECK (planned_amount >= 0),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 10. INSIGHTS_CACHE TABLE
-- Pre-computed analytics for dashboards
-- ============================================================================
CREATE TABLE insights_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  period_start DATE,
  period_end DATE,
  insights JSONB,                                   -- store charts & summary in JSON
  generated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_transactions_user_date ON transactions(user_id, occurred_at DESC);
CREATE INDEX idx_transactions_category ON transactions(category_user_id) WHERE category_user_id IS NOT NULL;
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_statement_imports_user ON statement_imports(user_id, status);
CREATE INDEX idx_insights_cache_user ON insights_cache(user_id, period_start, period_end);

-- ============================================================================
-- FUNCTION: Auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: Auto-create profile on user signup
-- This is the RECOMMENDED approach - automatic and reliable
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, phone_number)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- FUNCTION: Sync profiles to clients table (for Python backend)
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_profile_to_client()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update client record when profile changes
  INSERT INTO public.clients (id, first_name, last_name, phone_number, email, accountant_id, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.first_name,
    NEW.last_name,
    NEW.phone_number,
    NEW.email,
    NEW.accountant_id,
    COALESCE(NEW.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    accountant_id = EXCLUDED.accountant_id,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync profiles to clients on insert
CREATE TRIGGER sync_profile_to_client_on_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_to_client();

-- Trigger to sync profiles to clients on update
CREATE TRIGGER sync_profile_to_client_on_update
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_to_client();

-- ============================================================================
-- SEED DEFAULT CATEGORIES (Global system categories)
-- ============================================================================
INSERT INTO categories (name, icon, type) VALUES
  ('Food', '🍔', 'expense'),
  ('Groceries', '🛒', 'expense'),
  ('Rent', '🏠', 'expense'),
  ('Transport', '🚗', 'expense'),
  ('Shopping', '🛍️', 'expense'),
  ('Medical', '🏥', 'expense'),
  ('UPI', '📱', 'expense'),
  ('Entertainment', '🎬', 'expense'),
  ('Utilities', '💡', 'expense'),
  ('Education', '📚', 'expense'),
  ('Salary', '💰', 'income'),
  ('Freelance', '💼', 'income'),
  ('Investment', '📈', 'income'),
  ('Other Income', '💵', 'income')
ON CONFLICT (name) DO NOTHING;

