-- Migration: Add clients table and sync with profiles
-- Run this in your Supabase SQL Editor

-- Step 1: Add accountant_id column to profiles (if it doesn't exist)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS accountant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 2: Create clients table (for Python backend compatibility)
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

-- Step 3: Backfill existing profiles data to clients
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

-- Step 4: Create sync function
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

-- Step 5: Create triggers to auto-sync
DROP TRIGGER IF EXISTS sync_profile_to_client_on_insert ON profiles;
CREATE TRIGGER sync_profile_to_client_on_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_to_client();

DROP TRIGGER IF EXISTS sync_profile_to_client_on_update ON profiles;
CREATE TRIGGER sync_profile_to_client_on_update
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_to_client();

-- Step 6: Add RLS policies for clients table (similar to profiles)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

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

