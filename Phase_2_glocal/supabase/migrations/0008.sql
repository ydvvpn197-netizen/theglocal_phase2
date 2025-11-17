-- Community Admin Functions Migration
-- Version: 0008
-- Description: Add functions for community admin dashboard statistics and management
-- Date: 2025-10-08

-- ============================================
-- COMMUNITY STATISTICS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_community_stats(p_community_id UUID)
RETURNS TABLE (
  member_count BIGINT,
  post_count BIGINT,
  active_members_7d BIGINT,
  growth_7d BIGINT,
  pending_reports BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total members
    (SELECT COUNT(*) FROM community_members WHERE community_id = p_community_id)::BIGINT,
    
    -- Total posts
    (SELECT COUNT(*) FROM posts WHERE community_id = p_community_id AND NOT is_deleted)::BIGINT,
    
    -- Active members in last 7 days (posted or commented)
    (SELECT COUNT(DISTINCT author_id) 
     FROM posts 
     WHERE community_id = p_community_id 
       AND created_at >= (NOW() - INTERVAL '7 days'))::BIGINT,
    
    -- New members in last 7 days
    (SELECT COUNT(*) 
     FROM community_members 
     WHERE community_id = p_community_id 
       AND joined_at >= (NOW() - INTERVAL '7 days'))::BIGINT,
    
    -- Pending reports
    (SELECT COUNT(*) 
     FROM reports 
     WHERE community_id = p_community_id 
       AND status = 'pending')::BIGINT;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_community_stats IS
  'Returns statistics for a community including members, posts, activity, growth, and pending reports';

-- ============================================
-- MODERATION LOG PUBLIC VIEW FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_public_moderation_log(
  p_community_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  action TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ml.id,
    ml.content_type,
    ml.action,
    ml.reason,
    ml.created_at
  FROM moderation_log ml
  WHERE (p_community_id IS NULL OR ml.community_id = p_community_id)
  ORDER BY ml.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_public_moderation_log IS
  'Returns anonymized moderation log for transparency (no user IDs exposed)';

-- ============================================
-- CHECK IF USER IS COMMUNITY ADMIN
-- ============================================

CREATE OR REPLACE FUNCTION is_community_admin(
  p_user_id UUID,
  p_community_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM community_members 
    WHERE user_id = p_user_id 
      AND community_id = p_community_id 
      AND role = 'admin'
  ) INTO v_is_admin;
  
  RETURN v_is_admin;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_community_admin IS
  'Checks if a user is an admin of a specific community';

-- ============================================
-- GET COMMUNITY REPORT SUMMARY
-- ============================================

CREATE OR REPLACE FUNCTION get_community_report_summary(p_community_id UUID)
RETURNS TABLE (
  total_reports BIGINT,
  pending_reports BIGINT,
  actioned_reports BIGINT,
  dismissed_reports BIGINT,
  avg_resolution_time_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_reports,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_reports,
    COUNT(*) FILTER (WHERE status = 'actioned')::BIGINT as actioned_reports,
    COUNT(*) FILTER (WHERE status = 'dismissed')::BIGINT as dismissed_reports,
    AVG(
      EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600
    ) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_time_hours
  FROM reports
  WHERE community_id = p_community_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_community_report_summary IS
  'Returns summary statistics about reports for a community';

