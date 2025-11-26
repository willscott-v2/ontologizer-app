-- Performance indexes for analyses table
-- These indexes optimize common query patterns in the dashboard and analysis lookups

-- Index for listing user analyses sorted by date (most common dashboard query)
CREATE INDEX IF NOT EXISTS idx_analyses_user_created
ON analyses(user_id, created_at DESC);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_analyses_status
ON analyses(status);

-- Index for URL lookups (for cache checking)
CREATE INDEX IF NOT EXISTS idx_analyses_url
ON analyses(url);

-- Composite index for user + status queries
CREATE INDEX IF NOT EXISTS idx_analyses_user_status
ON analyses(user_id, status);

-- Index for cost tracking queries
CREATE INDEX IF NOT EXISTS idx_analyses_cost
ON analyses(total_cost_usd DESC);

-- Clean up expired entity cache entries (run periodically)
-- This function can be called via a scheduled job or trigger
CREATE OR REPLACE FUNCTION cleanup_expired_entity_cache()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM enriched_entity_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Comment for documentation
COMMENT ON FUNCTION cleanup_expired_entity_cache() IS
'Removes expired entries from the entity cache. Call periodically via cron or manually.';
