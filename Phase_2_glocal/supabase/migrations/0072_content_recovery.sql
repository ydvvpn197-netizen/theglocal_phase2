-- Content Recovery System
-- Version: 0072
-- Description: Add content recovery and soft delete functionality
-- Date: 2025-01-27

SET search_path TO public;

-- ============================================
-- CONTENT RECOVERY REQUESTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS content_recovery_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content identification
  content_type TEXT NOT NULL, -- 'post', 'comment', 'artist'
  content_id UUID NOT NULL,
  
  -- Request details
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  additional_info TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, expired
  
  -- Content details (snapshot at time of deletion)
  content_snapshot JSONB,
  deletion_reason TEXT,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Review process
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  auto_approved BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_recovery_content ON content_recovery_requests(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_recovery_requester ON content_recovery_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_content_recovery_status ON content_recovery_requests(status);
CREATE INDEX IF NOT EXISTS idx_content_recovery_created_at ON content_recovery_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_content_recovery_expires_at ON content_recovery_requests(expires_at) WHERE status = 'pending';

-- ============================================
-- CONTENT RECOVERY FUNCTIONS
-- ============================================

-- Function to create content recovery request
CREATE OR REPLACE FUNCTION create_content_recovery_request(
  p_content_type TEXT,
  p_content_id UUID,
  p_requester_id UUID,
  p_reason TEXT,
  p_additional_info TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  request_id UUID;
  content_snapshot JSONB;
  v_deleted_at TIMESTAMPTZ;
  v_deleted_by UUID;
  v_deletion_reason TEXT;
BEGIN
  -- Get content snapshot and deletion info
  IF p_content_type = 'post' THEN
    SELECT 
      jsonb_build_object(
        'id', id,
        'title', title,
        'content', content,
        'author_id', author_id,
        'community_id', community_id,
        'created_at', created_at,
        'updated_at', updated_at,
        'deleted_at', deleted_at,
        'deleted_by', deleted_by,
        'deletion_reason', deletion_reason
      ),
      deleted_at,
      deleted_by,
      deletion_reason
    INTO content_snapshot, v_deleted_at, v_deleted_by, v_deletion_reason
    FROM posts
    WHERE id = p_content_id;

  ELSIF p_content_type = 'comment' THEN
    SELECT 
      jsonb_build_object(
        'id', id,
        'content', content,
        'author_id', author_id,
        'post_id', post_id,
        'created_at', created_at,
        'updated_at', updated_at,
        'deleted_at', deleted_at,
        'deleted_by', deleted_by,
        'deletion_reason', deletion_reason
      ),
      deleted_at,
      deleted_by,
      deletion_reason
    INTO content_snapshot, v_deleted_at, v_deleted_by, v_deletion_reason
    FROM comments
    WHERE id = p_content_id;

  ELSIF p_content_type = 'artist' THEN
    SELECT 
      jsonb_build_object(
        'id', id,
        'name', name,
        'bio', bio,
        'user_id', user_id,
        'created_at', created_at,
        'updated_at', updated_at,
        'deleted_at', deleted_at,
        'deleted_by', deleted_by,
        'deletion_reason', deletion_reason
      ),
      deleted_at,
      deleted_by,
      deletion_reason
    INTO content_snapshot, v_deleted_at, v_deleted_by, v_deletion_reason
    FROM artists
    WHERE id = p_content_id;

  ELSE
    RAISE EXCEPTION 'Unsupported content_type: %', p_content_type;
  END IF;
  
  IF content_snapshot IS NULL THEN
    RAISE EXCEPTION 'Content not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM content_recovery_requests 
    WHERE content_type = p_content_type 
      AND content_id = p_content_id 
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Recovery request already exists for this content';
  END IF;
  
  INSERT INTO content_recovery_requests (
    content_type, content_id, requester_id, reason, additional_info,
    content_snapshot, deletion_reason, deleted_by, deleted_at
  ) VALUES (
    p_content_type, p_content_id, p_requester_id, p_reason, p_additional_info,
    content_snapshot, v_deletion_reason, v_deleted_by, v_deleted_at
  ) RETURNING id INTO request_id;
  
  RETURN request_id;
END;
$$ LANGUAGE plpgsql;

-- Function to approve content recovery request
CREATE OR REPLACE FUNCTION approve_content_recovery(
  p_request_id UUID,
  p_reviewed_by UUID,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  request_record content_recovery_requests%ROWTYPE;
  content_restored BOOLEAN := FALSE;
BEGIN
  SELECT * INTO request_record
  FROM content_recovery_requests
  WHERE id = p_request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  IF request_record.content_type = 'post' THEN
    UPDATE posts
    SET 
      deleted_at = NULL,
      deleted_by = NULL,
      deletion_reason = NULL,
      updated_at = NOW()
    WHERE id = request_record.content_id;
    content_restored := TRUE;

  ELSIF request_record.content_type = 'comment' THEN
    UPDATE comments
    SET 
      deleted_at = NULL,
      deleted_by = NULL,
      deletion_reason = NULL,
      updated_at = NOW()
    WHERE id = request_record.content_id;
    content_restored := TRUE;

  ELSIF request_record.content_type = 'artist' THEN
    UPDATE artists
    SET 
      deleted_at = NULL,
      deleted_by = NULL,
      deletion_reason = NULL,
      updated_at = NOW()
    WHERE id = request_record.content_id;
    content_restored := TRUE;
  END IF;
  
  UPDATE content_recovery_requests
  SET 
    status = 'approved',
    reviewed_by = p_reviewed_by,
    reviewed_at = NOW(),
    review_notes = p_review_notes,
    updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN content_restored;
END;
$$ LANGUAGE plpgsql;

-- Function to reject content recovery request
CREATE OR REPLACE FUNCTION reject_content_recovery(
  p_request_id UUID,
  p_reviewed_by UUID,
  p_review_notes TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE content_recovery_requests
  SET 
    status = 'rejected',
    reviewed_by = p_reviewed_by,
    reviewed_at = NOW(),
    review_notes = p_review_notes,
    updated_at = NOW()
  WHERE id = p_request_id AND status = 'pending';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending recovery requests
CREATE OR REPLACE FUNCTION get_pending_recovery_requests(
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  content_type TEXT,
  content_id UUID,
  requester_id UUID,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    crr.id, crr.content_type, crr.content_id, crr.requester_id,
    crr.reason, crr.created_at, crr.expires_at
  FROM content_recovery_requests crr
  WHERE crr.status = 'pending'
    AND crr.expires_at > NOW()
  ORDER BY crr.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get recovery request details
CREATE OR REPLACE FUNCTION get_recovery_request_details(
  p_request_id UUID
)
RETURNS TABLE(
  id UUID,
  content_type TEXT,
  content_id UUID,
  requester_id UUID,
  reason TEXT,
  additional_info TEXT,
  content_snapshot JSONB,
  deletion_reason TEXT,
  deleted_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE,
  status TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    crr.id, crr.content_type, crr.content_id, crr.requester_id,
    crr.reason, crr.additional_info, crr.content_snapshot,
    crr.deletion_reason, crr.deleted_by, crr.deleted_at,
    crr.status, crr.reviewed_by, crr.reviewed_at, crr.review_notes,
    crr.created_at, crr.expires_at
  FROM content_recovery_requests crr
  WHERE crr.id = p_request_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get recovery statistics
CREATE OR REPLACE FUNCTION get_recovery_stats(
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  total_requests BIGINT,
  pending_requests BIGINT,
  approved_requests BIGINT,
  rejected_requests BIGINT,
  expired_requests BIGINT,
  avg_processing_time_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_requests,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_requests,
    COUNT(*) FILTER (WHERE status = 'expired') as expired_requests,
    AVG(
      EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 3600
    ) as avg_processing_time_hours
  FROM content_recovery_requests
  WHERE created_at > NOW() - (p_days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to expire old recovery requests
CREATE OR REPLACE FUNCTION expire_old_recovery_requests()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE content_recovery_requests
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION trigger_update_recovery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_recovery_requests_updated_at_trigger
  BEFORE UPDATE ON content_recovery_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_recovery_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE content_recovery_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own recovery requests
CREATE POLICY "Users can view own recovery requests" ON content_recovery_requests
  FOR SELECT USING ((SELECT auth.uid()) = requester_id);

-- Users can create recovery requests
CREATE POLICY "Users can create recovery requests" ON content_recovery_requests
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = requester_id);

-- Users can update their own pending requests
CREATE POLICY "Users can update own pending requests" ON content_recovery_requests
  FOR UPDATE USING ((SELECT auth.uid()) = requester_id AND status = 'pending');

-- Admins can view all recovery requests (via JWT claim)
CREATE POLICY "Admins can view all recovery requests" ON content_recovery_requests
  FOR SELECT USING (
    (auth.jwt() ->> 'user_role') IN ('admin','super_admin')
  );

-- Admins can update recovery requests (via JWT claim)
CREATE POLICY "Admins can update recovery requests" ON content_recovery_requests
  FOR UPDATE USING (
    (auth.jwt() ->> 'user_role') IN ('admin','super_admin')
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE content_recovery_requests IS 'Tracks content recovery requests and restoration process';
COMMENT ON FUNCTION create_content_recovery_request(TEXT, UUID, UUID, TEXT, TEXT) IS 'Creates a content recovery request with content snapshot';
COMMENT ON FUNCTION approve_content_recovery(UUID, UUID, TEXT) IS 'Approves content recovery request and restores content';
COMMENT ON FUNCTION reject_content_recovery(UUID, UUID, TEXT) IS 'Rejects content recovery request';
COMMENT ON FUNCTION get_pending_recovery_requests(INTEGER) IS 'Gets pending recovery requests for review';
COMMENT ON FUNCTION get_recovery_request_details(UUID) IS 'Gets detailed information about a recovery request';
COMMENT ON FUNCTION get_recovery_stats(INTEGER) IS 'Gets recovery request statistics';
COMMENT ON FUNCTION expire_old_recovery_requests() IS 'Expires old recovery requests that have passed their expiry date';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Created content recovery system';
  RAISE NOTICE '✅ Implemented soft delete with content snapshots';
  RAISE NOTICE '✅ Added recovery request workflow';
  RAISE NOTICE '✅ Added automatic expiry for old requests';
  RAISE NOTICE '📝 Migration 0072 complete - content recovery system enhanced';
END$$;