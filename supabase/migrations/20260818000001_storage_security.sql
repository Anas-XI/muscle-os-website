-- Migration: Storage Security and Restrictions (Task 16)
-- Date: 2026-08-18

-- Ensure the storage schema exists
CREATE SCHEMA IF NOT EXISTS storage;

-- 1. Create a secure bucket for user uploads (e.g., profile pictures, intake forms)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user_uploads', 'user_uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the storage objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Restrict File Uploads (Task 16)
-- Policy: Users can only upload files to their own folder (auth.uid() = folder name)
-- AND restrict file type to images (jpeg, png, webp) or pdfs
-- AND restrict file size to under 5MB.
CREATE POLICY "Users can upload their own secure files" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'user_uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  (LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'pdf')) AND
  (COALESCE(file_size, 0) < 5242880) -- 5 MB
);

-- Policy: Users can read their own files
CREATE POLICY "Users can read their own secure files" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'user_uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update their own secure files" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'user_uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete their own secure files" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'user_uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
