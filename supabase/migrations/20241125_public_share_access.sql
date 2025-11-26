-- Migration: Public Share Access
-- Description: Adds RLS policy to allow anonymous users to read public analyses via share_token

-- Policy: Allow anyone to read public analyses by share_token
-- This enables the public share page to work without authentication
CREATE POLICY "public_analyses_readable_by_share_token"
ON public.analyses
FOR SELECT
TO anon, authenticated
USING (is_public = true AND share_token IS NOT NULL);

-- Add comment for documentation
COMMENT ON POLICY "public_analyses_readable_by_share_token" ON public.analyses IS
'Allows anyone to read analyses that have been made public via share token';
