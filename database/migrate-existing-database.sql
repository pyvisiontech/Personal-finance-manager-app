-- Migration SQL for Existing Database
-- Run this in your Supabase SQL Editor to update your database for Python backend compatibility

-- ============================================================================
-- Step 1: Add new columns to profiles table
-- ============================================================================

-- Add first_name, last_name, phone_number, accountant_id columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS accountant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================================
-- Step 2: Migrate full_name to first_name and last_name
-- ============================================================================

-- Split full_name into first_name and last_name for existing records
UPDATE profiles
SET 
  first_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' THEN
      TRIM(SPLIT_PART(full_name, ' ', 1))
    ELSE NULL
  END,
  last_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' AND POSITION(' ' IN full_name) > 0 THEN
      TRIM(SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1))
    ELSE NULL
  END
WHERE first_name IS NULL AND full_name IS NOT NULL;

-- ============================================================================
-- Step 3: Create clients table (for Python backend)
-- ============================================================================

CREATE TABLE IF NOT EXISTS clients (
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
-- Step 4: Backfill existing profiles to clients table
-- ============================================================================

INSERT INTO clients (id, first_name, last_name, phone_number, email, accountant_id, created_at, updated_at)
SELECT 
  id,
  first_name,
  last_name,
  phone_number,
  email,
  accountant_id,
  created_at,
  updated_at
FROM profiles
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone_number = EXCLUDED.phone_number,
  email = EXCLUDED.email,
  accountant_id = EXCLUDED.accountant_id,
  updated_at = NOW();

-- ============================================================================
-- Step 5: Create sync function to keep clients in sync with profiles
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

-- ============================================================================
-- Step 6: Create triggers to auto-sync profiles to clients
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS sync_profile_to_client_on_insert ON profiles;
DROP TRIGGER IF EXISTS sync_profile_to_client_on_update ON profiles;

-- Create new triggers
CREATE TRIGGER sync_profile_to_client_on_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_to_client();

CREATE TRIGGER sync_profile_to_client_on_update
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_to_client();

-- ============================================================================
-- Step 7: Update the handle_new_user trigger to use new fields
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

-- Trigger already exists, so we just update the function above
-- The trigger will automatically use the new function

-- ============================================================================
-- Step 8: Add RLS policies for clients table
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
-- Step 9: Verify migration (optional - you can run these to check)
-- ============================================================================

-- Check profiles with new columns
-- SELECT id, email, first_name, last_name, phone_number, accountant_id FROM profiles LIMIT 5;

-- Check clients table has data
-- SELECT id, email, first_name, last_name, phone_number, accountant_id FROM clients LIMIT 5;

-- Check that counts match
-- SELECT 
--   (SELECT COUNT(*) FROM profiles) as profiles_count,
--   (SELECT COUNT(*) FROM clients) as clients_count;

