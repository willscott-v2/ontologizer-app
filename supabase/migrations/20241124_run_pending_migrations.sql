-- ============================================================================
-- MIGRATION: Add comprehensive token and cost tracking
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ukwxaubrlvlubttofonv/sql
-- ============================================================================

-- ALTER PROFILES TABLE
-- Add separate tracking for OpenAI and Gemini usage
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS openai_tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS gemini_tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost_usd NUMERIC(10, 4) DEFAULT 0.00;

-- Update comments
COMMENT ON COLUMN public.profiles.openai_tokens_used IS 'Total OpenAI (GPT-4o) tokens consumed';
COMMENT ON COLUMN public.profiles.gemini_tokens_used IS 'Total Gemini (2.5 Flash) tokens consumed';
COMMENT ON COLUMN public.profiles.total_cost_usd IS 'Estimated total cost in USD';

-- ALTER ANALYSES TABLE
-- Add detailed token tracking and cost estimation
ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS openai_prompt_tokens INTEGER,
ADD COLUMN IF NOT EXISTS openai_completion_tokens INTEGER,
ADD COLUMN IF NOT EXISTS openai_total_tokens INTEGER,
ADD COLUMN IF NOT EXISTS openai_cost_usd NUMERIC(10, 6),
ADD COLUMN IF NOT EXISTS gemini_prompt_tokens INTEGER,
ADD COLUMN IF NOT EXISTS gemini_completion_tokens INTEGER,
ADD COLUMN IF NOT EXISTS gemini_total_tokens INTEGER,
ADD COLUMN IF NOT EXISTS gemini_cost_usd NUMERIC(10, 6),
ADD COLUMN IF NOT EXISTS total_cost_usd NUMERIC(10, 6);

-- Update comments
COMMENT ON COLUMN public.analyses.openai_prompt_tokens IS 'OpenAI input tokens';
COMMENT ON COLUMN public.analyses.openai_completion_tokens IS 'OpenAI output tokens';
COMMENT ON COLUMN public.analyses.openai_total_tokens IS 'OpenAI total tokens';
COMMENT ON COLUMN public.analyses.openai_cost_usd IS 'OpenAI cost estimate';
COMMENT ON COLUMN public.analyses.gemini_prompt_tokens IS 'Gemini input tokens';
COMMENT ON COLUMN public.analyses.gemini_completion_tokens IS 'Gemini output tokens';
COMMENT ON COLUMN public.analyses.gemini_total_tokens IS 'Gemini total tokens';
COMMENT ON COLUMN public.analyses.gemini_cost_usd IS 'Gemini cost estimate';
COMMENT ON COLUMN public.analyses.total_cost_usd IS 'Total analysis cost';

-- Drop old token usage function
DROP TRIGGER IF EXISTS update_user_token_usage ON public.analyses;
DROP FUNCTION IF EXISTS public.update_token_usage();

-- New function to update comprehensive token and cost tracking
CREATE OR REPLACE FUNCTION public.update_user_token_and_cost_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET
      openai_tokens_used = openai_tokens_used + COALESCE(NEW.openai_total_tokens, 0),
      gemini_tokens_used = gemini_tokens_used + COALESCE(NEW.gemini_total_tokens, 0),
      total_tokens_used = total_tokens_used +
        COALESCE(NEW.openai_total_tokens, 0) +
        COALESCE(NEW.gemini_total_tokens, 0),
      total_cost_usd = total_cost_usd + COALESCE(NEW.total_cost_usd, 0)
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER update_user_token_and_cost_usage
  AFTER INSERT OR UPDATE OF openai_total_tokens, gemini_total_tokens, total_cost_usd ON public.analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_token_and_cost_usage();

-- HELPER FUNCTION: Calculate OpenAI GPT-4o Cost
-- Pricing: $2.50/1M input, $10.00/1M output
CREATE OR REPLACE FUNCTION public.calculate_openai_cost(
  input_tokens INTEGER,
  output_tokens INTEGER
)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    (COALESCE(input_tokens, 0) * 0.0000025) +
    (COALESCE(output_tokens, 0) * 0.00001)
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.calculate_openai_cost IS 'Calculate OpenAI GPT-4o cost: $2.50/1M input, $10.00/1M output per token';

-- HELPER FUNCTION: Calculate Gemini 2.5 Flash Cost
-- Pricing: $0.10/1M input, $0.30/1M output
CREATE OR REPLACE FUNCTION public.calculate_gemini_cost(
  input_tokens INTEGER,
  output_tokens INTEGER
)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    (COALESCE(input_tokens, 0) * 0.0000001) +
    (COALESCE(output_tokens, 0) * 0.0000003)
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.calculate_gemini_cost IS 'Calculate Gemini 2.5 Flash cost: $0.10/1M input, $0.30/1M output tokens';

-- DATA MIGRATION
-- Migrate existing token data to new columns
UPDATE public.analyses
SET
  openai_prompt_tokens = prompt_tokens,
  openai_completion_tokens = completion_tokens,
  openai_total_tokens = total_tokens,
  openai_cost_usd = public.calculate_openai_cost(prompt_tokens, completion_tokens),
  total_cost_usd = public.calculate_openai_cost(prompt_tokens, completion_tokens)
WHERE
  prompt_tokens IS NOT NULL
  AND openai_total_tokens IS NULL;

-- Recalculate profile totals
UPDATE public.profiles p
SET
  openai_tokens_used = (
    SELECT COALESCE(SUM(openai_total_tokens), 0)
    FROM public.analyses
    WHERE user_id = p.id
  ),
  gemini_tokens_used = (
    SELECT COALESCE(SUM(gemini_total_tokens), 0)
    FROM public.analyses
    WHERE user_id = p.id
  ),
  total_cost_usd = (
    SELECT COALESCE(SUM(total_cost_usd), 0)
    FROM public.analyses
    WHERE user_id = p.id
  );

-- ============================================================================
-- MIGRATION: Enriched Entity Cache
-- ============================================================================

-- ENRICHED_ENTITY_CACHE TABLE
-- Caches enriched entities to reduce external API calls (7-day TTL)
CREATE TABLE IF NOT EXISTS public.enriched_entity_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_name TEXT NOT NULL,
  entity_name_normalized TEXT NOT NULL UNIQUE,

  -- Enriched entity data (JSONB for flexibility)
  entity_data JSONB NOT NULL,

  -- Quality metrics
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  sources INTEGER NOT NULL DEFAULT 0,

  -- Cache metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  hit_count INTEGER DEFAULT 0
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_enriched_entity_cache_normalized ON public.enriched_entity_cache(entity_name_normalized);
CREATE INDEX IF NOT EXISTS idx_enriched_entity_cache_expires ON public.enriched_entity_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_enriched_entity_cache_confidence ON public.enriched_entity_cache(confidence);
CREATE INDEX IF NOT EXISTS idx_enriched_entity_cache_sources ON public.enriched_entity_cache(sources);

-- GIN index for JSONB searches
CREATE INDEX IF NOT EXISTS idx_enriched_entity_cache_data ON public.enriched_entity_cache USING GIN(entity_data);

-- Comments
COMMENT ON TABLE public.enriched_entity_cache IS 'Cache for enriched entities from Wikipedia, Wikidata, Google KG, ProductOntology (7-day TTL, 80%+ confidence, 2+ sources)';
COMMENT ON COLUMN public.enriched_entity_cache.entity_name IS 'Original entity name';
COMMENT ON COLUMN public.enriched_entity_cache.entity_name_normalized IS 'Lowercase, trimmed entity name for matching';
COMMENT ON COLUMN public.enriched_entity_cache.entity_data IS 'Enriched entity data with URLs and metadata';
COMMENT ON COLUMN public.enriched_entity_cache.confidence IS 'Confidence score 0-100 based on number and quality of sources';
COMMENT ON COLUMN public.enriched_entity_cache.sources IS 'Number of external sources found (Wikipedia, Wikidata, etc)';
COMMENT ON COLUMN public.enriched_entity_cache.hit_count IS 'Number of times this cached entity has been retrieved';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
