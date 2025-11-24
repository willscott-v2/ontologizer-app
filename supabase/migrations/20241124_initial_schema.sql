-- Ontologizer Database Schema
-- Migration: Initial Schema
-- Description: Creates core tables for URL analysis, entity extraction, and caching

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- Extended user profile information beyond Supabase auth.users
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,

  -- Usage tracking
  analyses_count INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ANALYSES TABLE
-- Stores URL analysis results with AI-extracted entities and content
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- URL and content information
  url TEXT NOT NULL,
  title TEXT,
  meta_description TEXT,
  raw_html TEXT,
  cleaned_text TEXT,

  -- AI extraction results (JSONB for flexibility)
  entities JSONB, -- {people: [], organizations: [], locations: [], products: [], events: []}
  topics JSONB, -- {primary: [], secondary: [], keywords: []}
  sentiment JSONB, -- {score: 0.5, label: "neutral", confidence: 0.9}
  content_structure JSONB, -- {headings: [], sections: [], outline: []}

  -- JSON-LD structured data
  json_ld JSONB,
  schema_types TEXT[], -- e.g., ["Article", "Organization", "Person"]

  -- AI processing metadata
  model_used TEXT, -- e.g., "gpt-5"
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  processing_time_ms INTEGER,

  -- Status and errors
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  error_message TEXT,

  -- Shareability
  is_public BOOLEAN DEFAULT FALSE,
  share_token TEXT UNIQUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_url ON public.analyses(url);
CREATE INDEX IF NOT EXISTS idx_analyses_share_token ON public.analyses(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON public.analyses(status);

-- GIN index for JSONB searches
CREATE INDEX IF NOT EXISTS idx_analyses_entities ON public.analyses USING GIN(entities);
CREATE INDEX IF NOT EXISTS idx_analyses_topics ON public.analyses USING GIN(topics);

-- ============================================================================
-- ENTITY_CACHE TABLE
-- Caches extracted entities to reduce API calls (7-day TTL)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.entity_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL,
  content_hash TEXT NOT NULL, -- MD5/SHA256 of cleaned content

  -- Cached entity data
  entities JSONB NOT NULL,
  topics JSONB,

  -- Cache metadata
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  hit_count INTEGER DEFAULT 0,

  UNIQUE(url, content_hash)
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_entity_cache_url ON public.entity_cache(url);
CREATE INDEX IF NOT EXISTS idx_entity_cache_hash ON public.entity_cache(content_hash);
CREATE INDEX IF NOT EXISTS idx_entity_cache_expires ON public.entity_cache(expires_at);

-- ============================================================================
-- URL_CACHE TABLE
-- Caches fetched URL content to reduce HTTP requests (1-hour TTL)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.url_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT UNIQUE NOT NULL,

  -- Cached content
  raw_html TEXT,
  cleaned_text TEXT,
  title TEXT,
  meta_description TEXT,
  content_hash TEXT,

  -- HTTP metadata
  status_code INTEGER,
  content_type TEXT,
  content_length INTEGER,

  -- Cache metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
  hit_count INTEGER DEFAULT 0
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_url_cache_url ON public.url_cache(url);
CREATE INDEX IF NOT EXISTS idx_url_cache_expires ON public.url_cache(expires_at);

-- ============================================================================
-- FEEDBACK TABLE
-- Stores user feedback and ratings for analyses
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Feedback content
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  feedback_type TEXT, -- e.g., "accuracy", "completeness", "usefulness", "bug"

  -- Metadata
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for feedback lookups
CREATE INDEX IF NOT EXISTS idx_feedback_analysis_id ON public.feedback(analysis_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

-- ============================================================================
-- TEMPLATES TABLE (for future use)
-- Pre-built schema templates for common use cases
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  schema_type TEXT NOT NULL, -- e.g., "Article", "Product", "Organization"
  template_json JSONB NOT NULL,
  category TEXT, -- e.g., "blog", "ecommerce", "local-business"
  is_public BOOLEAN DEFAULT TRUE,

  -- Usage tracking
  use_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for template searches
CREATE INDEX IF NOT EXISTS idx_templates_schema_type ON public.templates(schema_type);
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates(category);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION public.clean_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.entity_cache WHERE expires_at < NOW();
  DELETE FROM public.url_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to generate share token
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to increment analysis count
CREATE OR REPLACE FUNCTION public.increment_analyses_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET analyses_count = analyses_count + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update token usage
CREATE OR REPLACE FUNCTION public.update_token_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_tokens IS NOT NULL AND NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET total_tokens_used = total_tokens_used + NEW.total_tokens
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Update updated_at on profiles
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: Update updated_at on analyses
CREATE TRIGGER set_analyses_updated_at
  BEFORE UPDATE ON public.analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: Update updated_at on templates
CREATE TRIGGER set_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: Increment analyses count when new analysis is created
CREATE TRIGGER increment_user_analyses_count
  AFTER INSERT ON public.analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_analyses_count();

-- Trigger: Update token usage when analysis is completed
CREATE TRIGGER update_user_token_usage
  AFTER INSERT OR UPDATE OF total_tokens ON public.analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_token_usage();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE public.profiles IS 'Extended user profile information';
COMMENT ON TABLE public.analyses IS 'URL analysis results with AI-extracted entities and structured data';
COMMENT ON TABLE public.entity_cache IS 'Cache for extracted entities (7-day TTL)';
COMMENT ON TABLE public.url_cache IS 'Cache for fetched URL content (1-hour TTL)';
COMMENT ON TABLE public.feedback IS 'User feedback and ratings for analyses';
COMMENT ON TABLE public.templates IS 'Pre-built schema templates';

COMMENT ON COLUMN public.analyses.entities IS 'AI-extracted entities: people, organizations, locations, products, events';
COMMENT ON COLUMN public.analyses.topics IS 'AI-extracted topics and keywords';
COMMENT ON COLUMN public.analyses.sentiment IS 'Sentiment analysis results';
COMMENT ON COLUMN public.analyses.json_ld IS 'Generated JSON-LD structured data';
COMMENT ON COLUMN public.analyses.share_token IS 'Unique token for public sharing';
