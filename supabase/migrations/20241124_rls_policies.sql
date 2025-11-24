-- Row Level Security (RLS) Policies
-- Migration: RLS Policies
-- Description: Implements security policies for all tables

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.url_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Service role can do everything (for server-side operations)
CREATE POLICY "Service role has full access to profiles"
  ON public.profiles
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- ANALYSES TABLE POLICIES
-- ============================================================================

-- Users can view their own analyses
CREATE POLICY "Users can view own analyses"
  ON public.analyses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone can view public analyses (shared via token)
CREATE POLICY "Anyone can view public analyses"
  ON public.analyses
  FOR SELECT
  USING (is_public = TRUE);

-- Users can insert their own analyses
CREATE POLICY "Users can insert own analyses"
  ON public.analyses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own analyses
CREATE POLICY "Users can update own analyses"
  ON public.analyses
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own analyses
CREATE POLICY "Users can delete own analyses"
  ON public.analyses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role has full access to analyses"
  ON public.analyses
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- ENTITY_CACHE TABLE POLICIES
-- Cache is accessible to all authenticated users (read-only for users)
-- ============================================================================

-- Authenticated users can read cache
CREATE POLICY "Authenticated users can read entity cache"
  ON public.entity_cache
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only service role can write to cache
CREATE POLICY "Service role can write to entity cache"
  ON public.entity_cache
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- URL_CACHE TABLE POLICIES
-- Similar to entity_cache
-- ============================================================================

-- Authenticated users can read cache
CREATE POLICY "Authenticated users can read url cache"
  ON public.url_cache
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only service role can write to cache
CREATE POLICY "Service role can write to url cache"
  ON public.url_cache
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- FEEDBACK TABLE POLICIES
-- ============================================================================

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON public.feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view feedback for their analyses
CREATE POLICY "Users can view feedback for own analyses"
  ON public.feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = feedback.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- Users can insert feedback
CREATE POLICY "Users can insert feedback"
  ON public.feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own feedback
CREATE POLICY "Users can update own feedback"
  ON public.feedback
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own feedback
CREATE POLICY "Users can delete own feedback"
  ON public.feedback
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role has full access to feedback"
  ON public.feedback
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- TEMPLATES TABLE POLICIES
-- Public templates are viewable by everyone
-- ============================================================================

-- Everyone can view public templates
CREATE POLICY "Anyone can view public templates"
  ON public.templates
  FOR SELECT
  USING (is_public = TRUE);

-- Only service role can manage templates
CREATE POLICY "Service role can manage templates"
  ON public.templates
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- HELPER FUNCTION FOR PROFILE CREATION
-- Automatically create profile when user signs up
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant access to tables
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.analyses TO authenticated;
GRANT ALL ON public.analyses TO service_role;

GRANT SELECT ON public.entity_cache TO authenticated;
GRANT ALL ON public.entity_cache TO service_role;

GRANT SELECT ON public.url_cache TO authenticated;
GRANT ALL ON public.url_cache TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;

GRANT SELECT ON public.templates TO anon, authenticated;
GRANT ALL ON public.templates TO service_role;

-- Grant sequence access (for auto-incrementing IDs if needed)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
