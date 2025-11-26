-- Migration: Enriched Entity Cache
-- Description: Caches enriched entity data from Wikipedia, Wikidata, Google KG, ProductOntology

-- ============================================================================
-- ENRICHED_ENTITY_CACHE TABLE
-- Caches enriched entities to reduce external API calls (7-day TTL)
-- ============================================================================
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
