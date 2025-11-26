-- ============================================================================
-- MIGRATION: Add Feedback Table
-- Run this in Supabase SQL Editor
-- ============================================================================

-- FEEDBACK TABLE
-- Stores user feedback for product improvement
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Feedback content
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'improvement', 'other')),
  message TEXT NOT NULL,

  -- Optional context
  page_url TEXT,
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,

  -- User agent info for debugging
  user_agent TEXT,

  -- Status tracking
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved', 'wont_fix')),
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

-- RLS Policies
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can submit feedback"
  ON public.feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON public.feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE public.feedback IS 'User feedback submissions for bugs, features, and improvements';
COMMENT ON COLUMN public.feedback.type IS 'Type of feedback: bug, feature, improvement, or other';
COMMENT ON COLUMN public.feedback.status IS 'Review status: new, reviewed, resolved, wont_fix';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
