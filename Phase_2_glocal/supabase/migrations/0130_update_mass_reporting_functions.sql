-- Update mass reporting helper functions to use reported_by column
-- Version: 0130
-- Date: 2025-11-12

SET search_path TO public;

CREATE OR REPLACE FUNCTION detect_mass_reporting(
  p_content_type TEXT,
  p_content_id UUID,
  p_threshold INTEGER DEFAULT 5,
  p_time_window_hours INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  report_count INTEGER;
  unique_reporters INTEGER;
  first_report TIMESTAMPTZ;
  last_report TIMESTAMPTZ;
BEGIN
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

  IF report_count >= p_threshold
     AND (last_report - first_report) <= (p_time_window_hours || ' hours')::INTERVAL THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION create_mass_reporting_event(
  p_content_type TEXT,
  p_content_id UUID,
  p_threshold INTEGER DEFAULT 5,
  p_time_window_hours INTEGER DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  event_id UUID;
  report_count INTEGER;
  unique_reporters INTEGER;
  first_report TIMESTAMPTZ;
  last_report TIMESTAMPTZ;
  reporter_analysis JSONB;
  suspicious_patterns TEXT[];
BEGIN
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

  reporter_analysis := jsonb_build_object(
    'total_reports', report_count,
    'unique_reporters', unique_reporters,
    'reporter_overlap', CASE
      WHEN unique_reporters > 0 THEN (report_count::DECIMAL / unique_reporters)::NUMERIC
      ELSE 0
    END,
    'time_span_minutes', COALESCE(EXTRACT(EPOCH FROM (last_report - first_report)) / 60, 0),
    'reports_per_hour', CASE
      WHEN COALESCE(EXTRACT(EPOCH FROM (last_report - first_report)) / 3600, 0) > 0
        THEN report_count::DECIMAL / (EXTRACT(EPOCH FROM (last_report - first_report)) / 3600)
      ELSE report_count
    END
  );

  suspicious_patterns := ARRAY[]::TEXT[];

  IF unique_reporters >= 3
     AND (unique_reporters > 0 AND (report_count::DECIMAL / unique_reporters) < 2.0) THEN
    suspicious_patterns := array_append(suspicious_patterns, 'coordinated');
  END IF;

  IF unique_reporters > 0 AND report_count >= 10
     AND (report_count::DECIMAL / unique_reporters) > 5.0 THEN
    suspicious_patterns := array_append(suspicious_patterns, 'spam');
  END IF;

  IF unique_reporters >= 5 AND report_count >= 8 THEN
    suspicious_patterns := array_append(suspicious_patterns, 'harassment');
  END IF;

  INSERT INTO mass_reporting_events (
    content_type,
    content_id,
    report_count,
    unique_reporters,
    first_report_at,
    last_report_at,
    detection_threshold,
    time_window_hours,
    reporter_analysis,
    suspicious_patterns,
    manual_review_required,
    auto_action_taken
  )
  VALUES (
    p_content_type,
    p_content_id,
    report_count,
    unique_reporters,
    first_report,
    last_report,
    p_threshold,
    p_time_window_hours,
    reporter_analysis,
    suspicious_patterns,
    CASE WHEN array_length(suspicious_patterns, 1) > 0 THEN TRUE ELSE FALSE END,
    CASE WHEN array_length(suspicious_patterns, 1) > 0 THEN 'flagged' ELSE 'none' END
  )
  RETURNING id INTO event_id;

  RETURN event_id;
END;
$$;

DO $$
BEGIN
  RAISE NOTICE '✅ Mass reporting helper functions updated to use reported_by';
END
$$;


