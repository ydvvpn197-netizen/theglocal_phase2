-- Appeals Process
-- Version: 0073
-- Description: Add content moderation appeals system
-- Date: 2025-01-27

SET search_path TO public;

-- ============================================
-- PREP: Ensure admin flags exist on users
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'is_admin'
  ) THEN
    EXECUTE 'ALTER TABLE public.users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'is_super_admin'
  ) THEN
    EXECUTE 'ALTER TABLE public.users ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT FALSE';
  END IF;
END$$;

-- Helpful indexes for policy checks
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin);
CREATE INDEX IF NOT EXISTS idx_users_is_super_admin ON public.users(is_super_admin);

-- ============================================
-- APPEALS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content identification
  content_type TEXT NOT NULL, -- 'post', 'comment', 'artist', 'user'
  content_id UUID NOT NULL,

  -- Appeal details
  appellant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appeal_reason TEXT NOT NULL,
  additional_evidence TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, under_review, approved, rejected, escalated

  -- Original moderation action
  original_action TEXT NOT NULL, -- 'deleted', 'hidden', 'suspended', 'banned'
  original_reason TEXT,
  moderated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  moderated_at TIMESTAMP WITH TIME ZONE,

  -- Review process
  assigned_reviewer UUID REFERENCES users(id) ON DELETE SET NULL,
  review_started_at TIMESTAMP WITH TIME ZONE,
  review_completed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  reviewer_decision TEXT, -- 'approved', 'rejected', 'escalated'

  -- Escalation
  escalated_to UUID REFERENCES users(id) ON DELETE SET NULL,
  escalated_at TIMESTAMP WITH TIME ZONE,
  escalation_reason TEXT,

  -- Auto-escalation tracking
  auto_escalation_count INTEGER DEFAULT 0,
  max_auto_escalations INTEGER DEFAULT 3,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),

  -- Optional integrity constraints for enumerations
  CONSTRAINT appeals_status_chk CHECK (status IN ('pending','under_review','approved','rejected','escalated')),
  CONSTRAINT appeals_original_action_chk CHECK (original_action IN ('deleted','hidden','suspended','banned')),
  CONSTRAINT appeals_reviewer_decision_chk CHECK (reviewer_decision IS NULL OR reviewer_decision IN ('approved','rejected','escalated'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_appeals_content ON appeals(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_appeals_appellant ON appeals(appellant_id);
CREATE INDEX IF NOT EXISTS idx_appeals_status ON appeals(status);
CREATE INDEX IF NOT EXISTS idx_appeals_assigned_reviewer ON appeals(assigned_reviewer);
CREATE INDEX IF NOT EXISTS idx_appeals_created_at ON appeals(created_at);
CREATE INDEX IF NOT EXISTS idx_appeals_expires_at ON appeals(expires_at) WHERE status = 'pending';

-- ============================================
-- APPEAL COMMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS appeal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Appeal reference
  appeal_id UUID NOT NULL REFERENCES appeals(id) ON DELETE CASCADE,

  -- Comment details
  commenter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- Internal reviewer comments

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for appeal comments
CREATE INDEX IF NOT EXISTS idx_appeal_comments_appeal_id ON appeal_comments(appeal_id);
CREATE INDEX IF NOT EXISTS idx_appeal_comments_commenter ON appeal_comments(commenter_id);
CREATE INDEX IF NOT EXISTS idx_appeal_comments_created_at ON appeal_comments(created_at);

-- ============================================
-- APPEAL FUNCTIONS
-- ============================================

-- Function to create appeal
CREATE OR REPLACE FUNCTION create_appeal(
  p_content_type TEXT,
  p_content_id UUID,
  p_appellant_id UUID,
  p_appeal_reason TEXT,
  p_additional_evidence TEXT DEFAULT NULL,
  p_original_action TEXT DEFAULT NULL,
  p_original_reason TEXT DEFAULT NULL,
  p_moderated_by UUID DEFAULT NULL,
  p_moderated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  appeal_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM appeals
    WHERE content_type = p_content_type
      AND content_id = p_content_id
      AND appellant_id = p_appellant_id
      AND status IN ('pending', 'under_review')
  ) THEN
    RAISE EXCEPTION 'Appeal already exists for this content';
  END IF;

  INSERT INTO appeals (
    content_type, content_id, appellant_id, appeal_reason, additional_evidence,
    original_action, original_reason, moderated_by, moderated_at
  ) VALUES (
    p_content_type, p_content_id, p_appellant_id, p_appeal_reason, p_additional_evidence,
    p_original_action, p_original_reason, p_moderated_by, p_moderated_at
  ) RETURNING id INTO appeal_id;

  RETURN appeal_id;
END;
$$ LANGUAGE plpgsql;

-- Function to assign reviewer
CREATE OR REPLACE FUNCTION assign_appeal_reviewer(
  p_appeal_id UUID,
  p_reviewer_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE appeals
  SET
    assigned_reviewer = p_reviewer_id,
    status = 'under_review',
    review_started_at = NOW(),
    updated_at = NOW()
  WHERE id = p_appeal_id AND status = 'pending';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to complete appeal review
CREATE OR REPLACE FUNCTION complete_appeal_review(
  p_appeal_id UUID,
  p_reviewer_decision TEXT,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  appeal_record RECORD;
  content_restored BOOLEAN := FALSE;
BEGIN
  SELECT * INTO appeal_record
  FROM appeals
  WHERE id = p_appeal_id AND status = 'under_review';

  IF appeal_record IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_reviewer_decision = 'approved' THEN
    IF appeal_record.content_type = 'post' AND appeal_record.original_action = 'deleted' THEN
      UPDATE posts
      SET
        deleted_at = NULL,
        deleted_by = NULL,
        deletion_reason = NULL,
        updated_at = NOW()
      WHERE id = appeal_record.content_id;
      content_restored := TRUE;
    ELSIF appeal_record.content_type = 'comment' AND appeal_record.original_action = 'deleted' THEN
      UPDATE comments
      SET
        deleted_at = NULL,
        deleted_by = NULL,
        deletion_reason = NULL,
        updated_at = NOW()
      WHERE id = appeal_record.content_id;
      content_restored := TRUE;
    ELSIF appeal_record.content_type = 'artist' AND appeal_record.original_action = 'deleted' THEN
      UPDATE artists
      SET
        deleted_at = NULL,
        deleted_by = NULL,
        deletion_reason = NULL,
        updated_at = NOW()
      WHERE id = appeal_record.content_id;
      content_restored := TRUE;
    END IF;
  END IF;

  UPDATE appeals
  SET
    status = CASE
      WHEN p_reviewer_decision = 'approved' THEN 'approved'
      WHEN p_reviewer_decision = 'rejected' THEN 'rejected'
      WHEN p_reviewer_decision = 'escalated' THEN 'escalated'
      ELSE status
    END,
    reviewer_decision = p_reviewer_decision,
    review_notes = p_review_notes,
    review_completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_appeal_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to escalate appeal
CREATE OR REPLACE FUNCTION escalate_appeal(
  p_appeal_id UUID,
  p_escalated_to UUID,
  p_escalation_reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE appeals
  SET
    status = 'escalated',
    escalated_to = p_escalated_to,
    escalated_at = NOW(),
    escalation_reason = p_escalation_reason,
    updated_at = NOW()
  WHERE id = p_appeal_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending appeals
CREATE OR REPLACE FUNCTION get_pending_appeals(
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  content_type TEXT,
  content_id UUID,
  appellant_id UUID,
  appeal_reason TEXT,
  original_action TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, a.content_type, a.content_id, a.appellant_id,
    a.appeal_reason, a.original_action, a.created_at, a.expires_at
  FROM appeals a
  WHERE a.status = 'pending'
    AND a.expires_at > NOW()
  ORDER BY a.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get appeals for reviewer
CREATE OR REPLACE FUNCTION get_appeals_for_reviewer(
  p_reviewer_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  content_type TEXT,
  content_id UUID,
  appellant_id UUID,
  appeal_reason TEXT,
  original_action TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  review_started_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, a.content_type, a.content_id, a.appellant_id,
    a.appeal_reason, a.original_action, a.created_at, a.review_started_at
  FROM appeals a
  WHERE a.assigned_reviewer = p_reviewer_id
    AND a.status = 'under_review'
  ORDER BY a.review_started_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get appeal statistics
CREATE OR REPLACE FUNCTION get_appeal_stats(
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  total_appeals BIGINT,
  pending_appeals BIGINT,
  under_review_appeals BIGINT,
  approved_appeals BIGINT,
  rejected_appeals BIGINT,
  escalated_appeals BIGINT,
  avg_processing_time_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_appeals,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_appeals,
    COUNT(*) FILTER (WHERE status = 'under_review') as under_review_appeals,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_appeals,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_appeals,
    COUNT(*) FILTER (WHERE status = 'escalated') as escalated_appeals,
    AVG(
      EXTRACT(EPOCH FROM (review_completed_at - created_at)) / 3600
    ) as avg_processing_time_hours
  FROM appeals
  WHERE created_at > NOW() - (p_days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-escalate old appeals
CREATE OR REPLACE FUNCTION auto_escalate_old_appeals()
RETURNS INTEGER AS $$
DECLARE
  escalated_count INTEGER;
BEGIN
  UPDATE appeals
  SET
    status = 'escalated',
    auto_escalation_count = auto_escalation_count + 1,
    escalation_reason = 'Auto-escalated due to age',
    escalated_at = NOW(),
    updated_at = NOW()
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '7 days'
    AND auto_escalation_count < max_auto_escalations;

  GET DIAGNOSTICS escalated_count = ROW_COUNT;
  RETURN escalated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to add appeal comment
CREATE OR REPLACE FUNCTION add_appeal_comment(
  p_appeal_id UUID,
  p_commenter_id UUID,
  p_comment_text TEXT,
  p_is_internal BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  comment_id UUID;
BEGIN
  INSERT INTO appeal_comments (
    appeal_id, commenter_id, comment_text, is_internal
  ) VALUES (
    p_appeal_id, p_commenter_id, p_comment_text, p_is_internal
  ) RETURNING id INTO comment_id;

  RETURN comment_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION trigger_update_appeal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appeals_updated_at_trigger
  BEFORE UPDATE ON appeals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_appeal_updated_at();

CREATE TRIGGER appeal_comments_updated_at_trigger
  BEFORE UPDATE ON appeal_comments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_appeal_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE appeal_comments ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "Users can view own appeals" ON appeals
  FOR SELECT USING (appellant_id = auth.uid());

CREATE POLICY "Users can create appeals" ON appeals
  FOR INSERT WITH CHECK (appellant_id = auth.uid());

CREATE POLICY "Users can update own pending appeals" ON appeals
  FOR UPDATE USING (appellant_id = auth.uid() AND status = 'pending');

-- Admin policies (now safe because columns exist)
CREATE POLICY "Admins can view all appeals" ON appeals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND (is_admin = TRUE OR is_super_admin = TRUE)
    )
  );

CREATE POLICY "Admins can update appeals" ON appeals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND (is_admin = TRUE OR is_super_admin = TRUE)
    )
  );

CREATE POLICY "Users can view comments on own appeals" ON appeal_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appeals
      WHERE id = appeal_id
        AND appellant_id = auth.uid()
    )
  );

CREATE POLICY "Users can add comments to own appeals" ON appeal_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM appeals
      WHERE id = appeal_id
        AND appellant_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all appeal comments" ON appeal_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND (is_admin = TRUE OR is_super_admin = TRUE)
    )
  );

CREATE POLICY "Admins can add comments to any appeal" ON appeal_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND (is_admin = TRUE OR is_super_admin = TRUE)
    )
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE appeals IS 'Tracks content moderation appeals and review process';
COMMENT ON TABLE appeal_comments IS 'Stores comments and notes on appeals';
COMMENT ON FUNCTION create_appeal(TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID, TIMESTAMP WITH TIME ZONE) IS 'Creates a new appeal for moderated content';
COMMENT ON FUNCTION assign_appeal_reviewer(UUID, UUID) IS 'Assigns a reviewer to an appeal';
COMMENT ON FUNCTION complete_appeal_review(UUID, TEXT, TEXT) IS 'Completes appeal review with decision';
COMMENT ON FUNCTION escalate_appeal(UUID, UUID, TEXT) IS 'Escalates appeal to higher authority';
COMMENT ON FUNCTION get_pending_appeals(INTEGER) IS 'Gets pending appeals for assignment';
COMMENT ON FUNCTION get_appeals_for_reviewer(UUID, INTEGER) IS 'Gets appeals assigned to a specific reviewer';
COMMENT ON FUNCTION get_appeal_stats(INTEGER) IS 'Gets appeal processing statistics';
COMMENT ON FUNCTION auto_escalate_old_appeals() IS 'Auto-escalates old appeals that have not been processed';
COMMENT ON FUNCTION add_appeal_comment(UUID, UUID, TEXT, BOOLEAN) IS 'Adds a comment to an appeal';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Created appeals system';
  RAISE NOTICE '✅ Implemented appeal workflow with reviewer assignment';
  RAISE NOTICE '✅ Added auto-escalation for old appeals';
  RAISE NOTICE '✅ Added appeal comments and communication';
  RAISE NOTICE '📝 Migration 0073 complete - appeals system enhanced';
END$$;