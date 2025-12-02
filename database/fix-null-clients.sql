-- Fix NULL values in clients table
-- This updates records that have NULL first_name or phone_number

-- Option 1: Update with placeholder values (safe for testing)
UPDATE clients 
SET 
  first_name = COALESCE(first_name, 'User'),
  last_name = COALESCE(last_name, ''),
  phone_number = COALESCE(phone_number, '0000000000')
WHERE first_name IS NULL OR phone_number IS NULL;

-- Option 2: If you want to see which records need updating first, run this:
-- SELECT id, email, first_name, last_name, phone_number 
-- FROM clients 
-- WHERE first_name IS NULL OR phone_number IS NULL;

-- After running Option 1, verify the update:
SELECT id, email, first_name, last_name, phone_number 
FROM clients;

