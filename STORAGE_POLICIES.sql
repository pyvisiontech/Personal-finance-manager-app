-- Storage Policies for STATEMENTS bucket
-- Run this in Supabase SQL Editor

-- Policy 1: Allow authenticated users to upload files to statements bucket
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'statements');

-- Policy 2: Allow users to view their own files (files in their user_id folder)
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'statements' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Allow users to update their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'statements' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Allow users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'statements' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

