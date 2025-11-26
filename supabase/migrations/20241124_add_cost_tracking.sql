-- Migration: Add comprehensive token and cost tracking
-- Description: Tracks OpenAI and Gemini usage separately with cost estimates

-- ============================================================================
-- ALTER PROFILES TABLE
-- Add separate tracking for OpenAI and Gemini usage
-- ============================================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS openai_tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS gemini_tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost_usd NUMERIC(10, 4) DEFAULT 0.00;

-- Update comment
COMMENT ON COLUMN public.profiles.openai_tokens_used IS 'Total OpenAI (GPT-5) tokens consumed';
COMMENT ON COLUMN public.profiles.gemini_tokens_used IS 'Total Gemini (2.5 Flash) tokens consumed';
COMMENT ON COLUMN public.profiles.total_cost_usd IS 'Estimated total cost in USD';

-- ============================================================================
-- ALTER ANALYSES TABLE
-- Add detailed token tracking and cost estimation
-- ============================================================================
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

-- ============================================================================
-- UPDATED FUNCTIONS
-- ============================================================================

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

-- ============================================================================
-- HELPER FUNCTION: Calculate OpenAI GPT-5 Cost
-- Pricing: $0.000005/input token, $0.000015/output token
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_openai_cost(
  input_tokens INTEGER,
  output_tokens INTEGER
)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    (COALESCE(input_tokens, 0) * 0.000005) +
    (COALESCE(output_tokens, 0) * 0.000015)
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.calculate_openai_cost IS 'Calculate OpenAI GPT-5 cost: $0.000005 input, $0.000015 output per token';

-- ============================================================================
-- HELPER FUNCTION: Calculate Gemini 2.5 Flash Cost
-- Pricing: $0.10/1M input tokens, $0.30/1M output tokens
-- ============================================================================
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

-- ============================================================================
-- DATA MIGRATION
-- Migrate existing token data to new columns
-- ============================================================================

-- Migrate existing analyses token data (assumes old data is OpenAI)
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
