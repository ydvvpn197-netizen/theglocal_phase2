-- Mass Reporting Detection
-- Version: 0071
-- Description: Add mass reporting detection and automated moderation
-- Date: 2025-01-27

SET search_path TO public;

-- ============================================
-- MASS REPORTING DETECTION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS mass_reporting_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content identification
  content_type TEXT NOT NULL, -- 'post', 'comment', 'artist'
  content_id UUID NOT NULL,
  
  -- Reporting details
  report_count INTEGER NOT NULL DEFAULT 0,
  unique_reporters INTEGER NOT NULL DEFAULT 0,
  first_report_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_report_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Detection criteria
  detection_threshold INTEGER NOT NULL DEFAULT 5, -- Reports needed to trigger
  time_window_hours INTEGER NOT NULL DEFAULT 1, -- Time window for detection
  
  -- Status and actions
  status TEXT NOT NULL DEFAULT 'detected', -- detected, reviewed, resolved, dismissed
  auto_action_taken TEXT, -- 'flagged', 'hidden', 'suspended', 'none'
  manual_review_required BOOLEAN DEFAULT FALSE,
  
  -- Reporter analysis
  reporter_analysis JSONB DEFAULT '{}'::jsonb, -- Analysis of reporter patterns
  suspicious_patterns TEXT[], -- Array of detected patterns
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Related entities
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mass_reporting_content ON mass_reporting_events(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_mass_reporting_status ON mass_reporting_events(status);
CREATE INDEX IF NOT EXISTS idx_mass_reporting_created_at ON mass_reporting_events(created_at);
CREATE INDEX IF NOT EXISTS idx_mass_reporting_manual_review ON mass_reporting_events(manual_review_required) WHERE manual_review_required = TRUE;

-- ============================================
-- REPORTING PATTERNS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS reporting_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pattern identification
  pattern_type TEXT NOT NULL, -- 'coordinated', 'spam', 'harassment', 'fake'
  pattern_description TEXT,
  
  -- Pattern criteria
  min_reports INTEGER NOT NULL DEFAULT 3,
  time_window_minutes INTEGER NOT NULL DEFAULT 60,
  reporter_overlap_threshold DECIMAL(3,2) DEFAULT 0.5, -- 50% overlap
  
  -- Pattern detection
  is_active BOOLEAN DEFAULT TRUE,
  confidence_threshold DECIMAL(3,2) DEFAULT 0.8, -- 80% confidence
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default patterns
INSERT INTO reporting_patterns (pattern_type, pattern_description, min_reports, time_window_minutes, reporter_overlap_threshold)
SELECT t.* FROM (
  VALUES
    ('coordinated', 'Coordinated reporting by multiple users', 5, 60, 0.3),
    ('spam', 'Spam reporting pattern', 3, 30, 0.7),
    ('harassment', 'Harassment reporting pattern', 4, 120, 0.4),
    ('fake', 'Fake reporting pattern', 6, 180, 0.2)
) AS t(pattern_type, pattern_description, min_reports, time_window_minutes, reporter_overlap_threshold)
WHERE NOT EXISTS (
  SELECT 1 FROM reporting_patterns rp WHERE rp.pattern_type = t.pattern_type
);

-- ============================================
-- MASS REPORTING DETECTION FUNCTIONS
-- ============================================

-- Function to detect mass reporting
CREATE OR REPLACE FUNCTION detect_mass_reporting(
  p_content_type TEXT,
  p_content_id UUID,
  p_threshold INTEGER DEFAULT 5,
  p_time_window_hours INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  report_count INTEGER;
  unique_reporters INTEGER;
  first_report TIMESTAMP WITH TIME ZONE;
  last_report TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get reporting statistics for the content
  SELECT 
    COUNT(*),
    COUNT(DISTINCT reported_by),
    MIN(created_at),
    MAX(created_at)
  INTO report_count, unique_reporters, first_report, last_report
  FROM reports
  WHERE content_type = p_content_type
    AND content_id = p_content_id
    AND created_at > NOW() - (p_time_window_hours || ' hours')::INTERVAL;
  
  -- Check if threshold is met and within window
  IF report_count >= p_threshold AND (last_report - first_report) <= (p_time_window_hours || ' hours')::INTERVAL THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to create mass reporting event
CREATE OR REPLACE FUNCTION create_mass_reporting_event(
  p_content_type TEXT,
  p_content_id UUID,
  p_threshold INTEGER DEFAULT 5,
  p_time_window_hours INTEGER DEFAULT 1
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
  report_count INTEGER;
  unique_reporters INTEGER;
  first_report TIMESTAMP WITH TIME ZONE;
  last_report TIMESTAMP WITH TIME ZONE;
  reporter_analysis JSONB;
  suspicious_patterns TEXT[];
BEGIN
  -- Get reporting statistics
  SELECT 
    COUNT(*),
    COUNT(DISTINCT reported_by),
    MIN(created_at),
    MAX(created_at)
  INTO report_count, unique_reporters, first_report, last_report
  FROM reports
  WHERE content_type = p_content_type
    AND content_id = p_content_id
    AND created_at > NOW() - (p_time_window_hours || ' hours')::INTERVAL;
  
  -- Analyze reporter patterns
  SELECT jsonb_build_object(
    'total_reports', report_count,
    'unique_reporters', unique_reporters,
    'reporter_overlap', CASE 
      WHEN unique_reporters > 0 THEN (report_count::DECIMAL / unique_reporters)::numeric
      ELSE 0 
    END,
    'time_span_minutes', COALESCE(EXTRACT(EPOCH FROM (last_report - first_report)) / 60, 0),
    'reports_per_hour', CASE
      WHEN COALESCE(EXTRACT(EPOCH FROM (last_report - first_report)) / 3600, 0) > 0
        THEN report_count::DECIMAL / (EXTRACT(EPOCH FROM (last_report - first_report)) / 3600)
      ELSE report_count
    END
  ) INTO reporter_analysis;
  
  -- Detect suspicious patterns
  suspicious_patterns := ARRAY[]::TEXT[];
  
  -- Coordinated
  IF unique_reporters >= 3 AND (unique_reporters > 0 AND (report_count::DECIMAL / unique_reporters) < 2.0) THEN
    suspicious_patterns := array_append(suspicious_patterns, 'coordinated');
  END IF;
  
  -- Spam
  IF unique_reporters > 0 AND report_count >= 10 AND (report_count::DECIMAL / unique_reporters) > 5.0 THEN
    suspicious_patterns := array_append(suspicious_patterns, 'spam');
  END IF;
  
  -- Harassment
  IF unique_reporters >= 5 AND report_count >= 8 THEN
    suspicious_patterns := array_append(suspicious_patterns, 'harassment');
  END IF;
  
  -- Create mass reporting event
  INSERT INTO mass_reporting_events (
    content_type, content_id, report_count, unique_reporters,
    first_report_at, last_report_at, detection_threshold, time_window_hours,
    reporter_analysis, suspicious_patterns,
    manual_review_required, auto_action_taken
  ) VALUES (
    p_content_type, p_content_id, report_count, unique_reporters,
    first_report, last_report, p_threshold, p_time_window_hours,
    reporter_analysis, suspicious_patterns,
    CASE WHEN array_length(suspicious_patterns, 1) > 0 THEN TRUE ELSE FALSE END,
    CASE WHEN array_length(suspicious_patterns, 1) > 0 THEN 'flagged' ELSE 'none' END
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get mass reporting events for review
CREATE OR REPLACE FUNCTION get_mass_reporting_for_review(
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  content_type TEXT,
  content_id UUID,
  report_count INTEGER,
  unique_reporters INTEGER,
  suspicious_patterns TEXT[],
  created_at TIMESTAMP WITH TIME ZONE,
  auto_action_taken TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mre.id, mre.content_type, mre.content_id, mre.report_count,
    mre.unique_reporters, mre.suspicious_patterns, mre.created_at, mre.auto_action_taken
  FROM mass_reporting_events mre
  WHERE mre.status = 'detected'
    AND mre.manual_review_required = TRUE
  ORDER BY mre.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to resolve mass reporting event
CREATE OR REPLACE FUNCTION resolve_mass_reporting_event(
  p_event_id UUID,
  p_resolution TEXT, -- 'dismissed', 'action_taken', 'escalated'
  p_reviewed_by UUID,
  p_resolution_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE mass_reporting_events
  SET 
    status = 'resolved',
    reviewed_by = p_reviewed_by,
    resolution_notes = p_resolution_notes,
    resolved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_event_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get mass reporting statistics
CREATE OR REPLACE FUNCTION get_mass_reporting_stats(
  p_days_back INTEGER DEFAULT 7
)
RETURNS TABLE(
  total_events BIGINT,
  detected_events BIGINT,
  resolved_events BIGINT,
  dismissed_events BIGINT,
  avg_reports_per_event NUMERIC,
  most_common_patterns TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE status = 'detected') as detected_events,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved_events,
    COUNT(*) FILTER (WHERE status = 'dismissed') as dismissed_events,
    AVG(report_count) as avg_reports_per_event,
    ARRAY(
      SELECT p FROM (
        SELECT unnest(suspicious_patterns) AS p
        FROM mass_reporting_events
        WHERE created_at > NOW() - (p_days_back || ' days')::INTERVAL
      ) u
      GROUP BY p
      ORDER BY COUNT(*) DESC
      LIMIT 5
    ) as most_common_patterns
  FROM mass_reporting_events
  WHERE created_at > NOW() - (p_days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_update_mass_reporting_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mass_reporting_events_updated_at_trigger
  BEFORE UPDATE ON mass_reporting_events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_mass_reporting_updated_at();

-- Trigger to detect mass reporting on new reports
CREATE OR REPLACE FUNCTION trigger_detect_mass_reporting()
RETURNS TRIGGER AS $$
DECLARE
  is_mass_reporting BOOLEAN;
  event_id UUID;
BEGIN
  -- Check if this report triggers mass reporting detection
  SELECT detect_mass_reporting(
    NEW.content_type, 
    NEW.content_id, 
    5, -- threshold
    1  -- 1 hour window
  ) INTO is_mass_reporting;
  
  IF is_mass_reporting THEN
    -- Check if mass reporting event already exists
    SELECT id INTO event_id
    FROM mass_reporting_events
    WHERE content_type = NEW.content_type
      AND content_id = NEW.content_id
      AND status = 'detected'
      AND created_at > NOW() - INTERVAL '1 hour';
    
    -- Create new event if none exists
    IF event_id IS NULL THEN
      SELECT create_mass_reporting_event(
        NEW.content_type,
        NEW.content_id,
        5, -- threshold
        1  -- 1 hour window
      ) INTO event_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reports_mass_reporting_detection_trigger
  AFTER INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION trigger_detect_mass_reporting();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on mass reporting tables
ALTER TABLE mass_reporting_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reporting_patterns ENABLE ROW LEVEL SECURITY;

-- Helper: determine if current user is an admin.
-- Replace the body with your actual admin logic (e.g., query user_profiles or check JWT claims).
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  -- Example alternatives you may implement:
  -- 1) SELECT (auth.jwt() ->> 'role') = 'admin';
  -- 2) SELECT EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND is_admin = TRUE);
  -- Safe default: no admin unless implemented.
  SELECT FALSE;
$$;

-- Only admins can view mass reporting events
CREATE POLICY "Admins can view mass reporting events" ON mass_reporting_events
  FOR SELECT TO authenticated
  USING ( (SELECT is_current_user_admin()) );

-- Only admins can update mass reporting events
CREATE POLICY "Admins can update mass reporting events" ON mass_reporting_events
  FOR UPDATE TO authenticated
  USING ( (SELECT is_current_user_admin()) )
  WITH CHECK ( (SELECT is_current_user_admin()) );

-- Only admins can manage reporting patterns
CREATE POLICY "Admins can manage reporting patterns" ON reporting_patterns
  FOR ALL TO authenticated
  USING ( (SELECT is_current_user_admin()) )
  WITH CHECK ( (SELECT is_current_user_admin()) );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE mass_reporting_events IS 'Tracks mass reporting events and automated moderation actions';
COMMENT ON TABLE reporting_patterns IS 'Defines patterns for detecting coordinated or suspicious reporting';
COMMENT ON FUNCTION detect_mass_reporting(TEXT, UUID, INTEGER, INTEGER) IS 'Detects if content has been mass reported within time window';
COMMENT ON FUNCTION create_mass_reporting_event(TEXT, UUID, INTEGER, INTEGER) IS 'Creates mass reporting event with pattern analysis';
COMMENT ON FUNCTION get_mass_reporting_for_review(INTEGER) IS 'Gets mass reporting events requiring manual review';
COMMENT ON FUNCTION resolve_mass_reporting_event(UUID, TEXT, UUID, TEXT) IS 'Resolves mass reporting event with reviewer notes';
COMMENT ON FUNCTION is_current_user_admin() IS 'Returns true if the current user is considered an admin; replace implementation to match your schema';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Created mass reporting detection system';
  RAISE NOTICE '✅ Implemented automated pattern detection';
  RAISE NOTICE '✅ Added manual review workflow';
  RAISE NOTICE '✅ Added reporting statistics and analytics';
  RAISE NOTICE '📝 Migration 0071 complete - mass reporting detection enhanced';
END$$;