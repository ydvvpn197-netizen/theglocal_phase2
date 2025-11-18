-- Session Security & Management
-- Version: 0067
-- Description: Add session tracking and security measures
-- Date: 2025-01-27

SET search_path TO public;

-- Ensure gen_random_uuid() is available (safe if already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- SESSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  device_info JSONB,
  ip_address INET,
  user_agent TEXT,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- ============================================
-- SUSPICIOUS ACTIVITY TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS suspicious_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  ip_address INET,
  activity_type TEXT NOT NULL, -- 'failed_login', 'multiple_sessions', 'unusual_location'
  details JSONB,
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_suspicious_activity_user_id ON suspicious_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_ip ON suspicious_activity(ip_address);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_type ON suspicious_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_unresolved ON suspicious_activity(resolved_at) WHERE resolved_at IS NULL;

-- ============================================
-- SESSION SECURITY FUNCTIONS
-- ============================================

-- Function to create a new session
CREATE OR REPLACE FUNCTION create_user_session(
  p_user_id UUID,
  p_session_token TEXT,
  p_device_info JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  session_id UUID;
  session_count INTEGER;
BEGIN
  -- Check current session count for user
  SELECT COUNT(*) INTO session_count
  FROM user_sessions 
  WHERE user_id = p_user_id AND is_active = TRUE;
  
  -- If user has 3 or more active sessions, deactivate oldest
  IF session_count >= 3 THEN
    UPDATE user_sessions u
    SET is_active = FALSE
    WHERE u.id IN (
      SELECT id
      FROM user_sessions
      WHERE user_id = p_user_id
        AND is_active = TRUE
      ORDER BY last_activity ASC
      LIMIT 1
    );
  END IF;
  
  -- Create new session
  INSERT INTO user_sessions (
    user_id, session_token, device_info, ip_address, user_agent
  ) VALUES (
    p_user_id, p_session_token, p_device_info, p_ip_address, p_user_agent
  ) RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate session
CREATE OR REPLACE FUNCTION validate_session(p_session_token TEXT)
RETURNS TABLE(
  is_valid BOOLEAN,
  user_id UUID,
  session_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (s.is_active = TRUE AND s.expires_at > NOW()) as is_valid,
    s.user_id,
    s.id as session_id
  FROM user_sessions s
  WHERE s.session_token = p_session_token;
END;
$$ LANGUAGE plpgsql;

-- Function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity(
  p_session_token TEXT,
  p_ip_address INET DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE user_sessions 
  SET 
    last_activity = NOW(),
    ip_address = COALESCE(p_ip_address, ip_address)
  WHERE session_token = p_session_token 
    AND is_active = TRUE 
    AND expires_at > NOW();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to deactivate session
CREATE OR REPLACE FUNCTION deactivate_session(p_session_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE user_sessions 
  SET is_active = FALSE 
  WHERE session_token = p_session_token;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to deactivate all user sessions
CREATE OR REPLACE FUNCTION deactivate_all_user_sessions(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  deactivated_count INTEGER;
BEGIN
  UPDATE user_sessions 
  SET is_active = FALSE 
  WHERE user_id = p_user_id AND is_active = TRUE;
  
  GET DIAGNOSTICS deactivated_count = ROW_COUNT;
  RETURN deactivated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to detect suspicious activity
CREATE OR REPLACE FUNCTION detect_suspicious_activity(
  p_user_id UUID,
  p_ip_address INET,
  p_activity_type TEXT,
  p_details JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  recent_failures INTEGER;
  session_count INTEGER;
  should_alert BOOLEAN := FALSE;
BEGIN
  -- Check for multiple failed login attempts
  IF p_activity_type = 'failed_login' THEN
    SELECT COUNT(*) INTO recent_failures
    FROM suspicious_activity 
    WHERE user_id = p_user_id 
      AND activity_type = 'failed_login'
      AND created_at > NOW() - INTERVAL '1 hour';
    
    IF recent_failures >= 10 THEN
      should_alert := TRUE;
    END IF;
  END IF;
  
  -- Check for multiple concurrent sessions from different IPs
  IF p_activity_type = 'multiple_sessions' THEN
    SELECT COUNT(DISTINCT ip_address) INTO session_count
    FROM user_sessions 
    WHERE user_id = p_user_id 
      AND is_active = TRUE 
      AND created_at > NOW() - INTERVAL '1 hour';
    
    IF session_count > 3 THEN
      should_alert := TRUE;
    END IF;
  END IF;
  
  -- Log suspicious activity
  IF should_alert THEN
    INSERT INTO suspicious_activity (
      user_id, ip_address, activity_type, details, severity
    ) VALUES (
      p_user_id, p_ip_address, p_activity_type, p_details, 'high'
    );
  END IF;
  
  RETURN should_alert;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  -- Deactivate expired sessions
  UPDATE user_sessions 
  SET is_active = FALSE 
  WHERE expires_at < NOW() AND is_active = TRUE;
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  -- Delete very old inactive sessions (older than 90 days)
  DELETE FROM user_sessions 
  WHERE is_active = FALSE 
    AND last_activity < NOW() - INTERVAL '90 days';
  
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on sessions table
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_sessions' AND policyname = 'Users can view own sessions'
  ) THEN
    CREATE POLICY "Users can view own sessions" ON user_sessions
      FOR SELECT TO authenticated
      USING ((SELECT auth.uid()) = user_id);
  END IF;
END$$;

-- Users can update their own sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_sessions' AND policyname = 'Users can update own sessions'
  ) THEN
    CREATE POLICY "Users can update own sessions" ON user_sessions
      FOR UPDATE TO authenticated
      USING ((SELECT auth.uid()) = user_id);
  END IF;
END$$;

-- Enable RLS on suspicious activity table
ALTER TABLE suspicious_activity ENABLE ROW LEVEL SECURITY;

-- Only super admins can view suspicious activity (fixed: removed is_admin)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'suspicious_activity' AND policyname = 'Admins can view suspicious activity'
  ) THEN
    CREATE POLICY "Admins can view suspicious activity" ON suspicious_activity
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = (SELECT auth.uid())
            AND u.is_super_admin = TRUE
        )
      );
  END IF;
END$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to automatically clean up expired sessions
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_sessions()
RETURNS TRIGGER AS $$
BEGIN
  -- Run cleanup if this is a new session creation
  IF TG_OP = 'INSERT' THEN
    PERFORM cleanup_expired_sessions();
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cleanup_expired_sessions_trigger ON user_sessions;
CREATE TRIGGER cleanup_expired_sessions_trigger
  AFTER INSERT ON user_sessions
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_cleanup_expired_sessions();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE user_sessions IS 'Tracks user sessions for security and concurrent session management';
COMMENT ON TABLE suspicious_activity IS 'Logs suspicious user activity for security monitoring';
COMMENT ON FUNCTION create_user_session(UUID, TEXT, JSONB, INET, TEXT) IS 'Creates a new user session with automatic cleanup of excess sessions';
COMMENT ON FUNCTION validate_session(TEXT) IS 'Validates a session token and returns session info';
COMMENT ON FUNCTION detect_suspicious_activity(UUID, INET, TEXT, JSONB) IS 'Detects and logs suspicious user activity patterns';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Created session security tables and functions';
  RAISE NOTICE '✅ Implemented max 3 concurrent sessions per user';
  RAISE NOTICE '✅ Added suspicious activity detection';
  RAISE NOTICE '✅ Added automatic session cleanup';
  RAISE NOTICE '📝 Migration 0067 complete - session security enhanced';
END$$;