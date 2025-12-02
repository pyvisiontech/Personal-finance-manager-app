-- Migration: Replace profiles table with clients table
-- WARNING: This will delete the profiles table and replace it with clients
-- Make sure you have a backup before running this!

-- ============================================================================
-- Step 1: Create clients table with all necessary columns
-- ============================================================================

CREATE TABLE IF NOT EXISTS clients (
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
-- Step 2: Migrate data from profiles to clients (if profiles exists)
-- ============================================================================

-- Add new columns to profiles if they don't exist (for migration)
DO $$
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='first_name') THEN
    ALTER TABLE profiles ADD COLUMN first_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_name') THEN
    ALTER TABLE profiles ADD COLUMN last_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='phone_number') THEN
    ALTER TABLE profiles ADD COLUMN phone_number TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='accountant_id') THEN
    ALTER TABLE profiles ADD COLUMN accountant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Note: We're keeping only first_name and last_name, not full_name
-- If you have existing data in full_name, you'll need to manually update first_name and last_name

-- Copy all data from profiles to clients
INSERT INTO clients (id, first_name, last_name, phone_number, email, accountant_id, currency, created_at, updated_at)
SELECT 
  id,
  first_name,
  last_name,
  phone_number,
  email,
  accountant_id,
  currency,
  created_at,
  updated_at
FROM profiles
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone_number = EXCLUDED.phone_number,
  email = EXCLUDED.email,
  accountant_id = EXCLUDED.accountant_id,
  currency = EXCLUDED.currency,
  updated_at = NOW();

-- ============================================================================
-- Step 3: Update all foreign key references from profiles to clients
-- ============================================================================

-- Update accounts table
ALTER TABLE accounts 
DROP CONSTRAINT IF EXISTS accounts_user_id_fkey;

ALTER TABLE accounts
ADD CONSTRAINT accounts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Update transactions table
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;

ALTER TABLE transactions
ADD CONSTRAINT transactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Update transaction_categories table
ALTER TABLE transaction_categories 
DROP CONSTRAINT IF EXISTS transaction_categories_user_id_fkey;

ALTER TABLE transaction_categories
ADD CONSTRAINT transaction_categories_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Update statement_imports table
ALTER TABLE statement_imports 
DROP CONSTRAINT IF EXISTS statement_imports_user_id_fkey;

ALTER TABLE statement_imports
ADD CONSTRAINT statement_imports_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Update categorizer_feedback table
ALTER TABLE categorizer_feedback 
DROP CONSTRAINT IF EXISTS categorizer_feedback_user_id_fkey;

ALTER TABLE categorizer_feedback
ADD CONSTRAINT categorizer_feedback_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Update budget_periods table
ALTER TABLE budget_periods 
DROP CONSTRAINT IF EXISTS budget_periods_user_id_fkey;

ALTER TABLE budget_periods
ADD CONSTRAINT budget_periods_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Update insights_cache table
ALTER TABLE insights_cache 
DROP CONSTRAINT IF EXISTS insights_cache_user_id_fkey;

ALTER TABLE insights_cache
ADD CONSTRAINT insights_cache_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES clients(id) ON DELETE CASCADE;

-- ============================================================================
-- Step 4: Update triggers and functions
-- ============================================================================

-- Update the handle_new_user function to insert into clients
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.clients (id, email, first_name, last_name, phone_number, currency)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    'INR'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the update_updated_at trigger to work with clients
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Step 5: Drop old profiles table and its triggers
-- ============================================================================

-- Drop the sync trigger if it exists (from previous migration)
DROP TRIGGER IF EXISTS sync_profile_to_client_on_insert ON profiles;
DROP TRIGGER IF EXISTS sync_profile_to_client_on_update ON profiles;
DROP FUNCTION IF EXISTS sync_profile_to_client();

-- Drop the old trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger to use clients
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Drop profiles table (WARNING: This deletes the table!)
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================================================
-- Step 6: Add RLS policies for clients table
-- ============================================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own client" ON clients;
DROP POLICY IF EXISTS "Users can update own client" ON clients;
DROP POLICY IF EXISTS "Service role can manage clients" ON clients;

-- Allow users to view their own client record
CREATE POLICY "Users can view own client" ON clients
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own client record
CREATE POLICY "Users can update own client" ON clients
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow service role to do everything (for backend Python)
CREATE POLICY "Service role can manage clients" ON clients
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Step 7: Verify migration (optional - you can run these to check)
-- ============================================================================

-- Check clients table has data
-- SELECT id, email, first_name, last_name, phone_number, accountant_id FROM clients LIMIT 5;

-- Check that foreign keys are working
-- SELECT COUNT(*) FROM accounts WHERE user_id IN (SELECT id FROM clients);
-- SELECT COUNT(*) FROM transactions WHERE user_id IN (SELECT id FROM clients);

