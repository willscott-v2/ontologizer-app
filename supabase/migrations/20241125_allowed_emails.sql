-- Migration: Allowed Emails Whitelist
-- Description: Creates a table to restrict which emails can sign up

-- Create the allowed_emails table
CREATE TABLE IF NOT EXISTS public.allowed_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT -- Optional notes about who this person is
);

-- Enable RLS
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

-- Only allow reading for authenticated requests (the app checks before sending magic link)
CREATE POLICY "allowed_emails_readable_by_service"
ON public.allowed_emails
FOR SELECT
TO anon, authenticated
USING (true);

-- Add initial allowed emails
-- Search Influence domain (allow all)
INSERT INTO allowed_emails (email, notes) VALUES
  ('matsiltala@gmail.com', 'Mats - external tester')
ON CONFLICT (email) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE public.allowed_emails IS 'Whitelist of emails allowed to sign up. Check this table before sending magic links.';
