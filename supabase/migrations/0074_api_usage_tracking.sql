-- API Usage Tracking
-- Version: 0074
-- Description: Add comprehensive API usage tracking and budget monitoring
-- Date: 2025-01-27

SET search_path TO public;

-- ============================================
-- API USAGE LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- API identification
  service_name TEXT NOT NULL, -- 'google_maps', 'news_api', 'reddit_api', 'openai'
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET', -- GET, POST, PUT, DELETE
  
  -- Request details
  request_url TEXT,
  request_headers JSONB,
  request_body JSONB,
  response_status INTEGER,
  response_headers JSONB,
  response_body JSONB,
  
  -- Usage metrics
  cost_usd DECIMAL(10, 4) DEFAULT 0.00,
  tokens_used INTEGER DEFAULT 0,
  requests_count INTEGER DEFAULT 1,
  data_transferred_bytes BIGINT DEFAULT 0,
  
  -- Performance metrics
  response_time_ms INTEGER,
  timeout_occurred BOOLEAN DEFAULT FALSE,
  retry_count INTEGER DEFAULT 0,
  
  -- Context
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_service ON api_usage_logs(service_name);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_cost ON api_usage_logs(cost_usd);

-- ============================================
-- API BUDGET CONFIGURATION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS api_budget_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Service configuration
  service_name TEXT NOT NULL UNIQUE,
  daily_budget_usd DECIMAL(10, 2) NOT NULL,
  monthly_budget_usd DECIMAL(10, 2) NOT NULL,
  warning_threshold DECIMAL(3, 2) DEFAULT 0.80, -- 80% threshold
  critical_threshold DECIMAL(3, 2) DEFAULT 0.95, -- 95% threshold
  
  -- Rate limiting
  requests_per_minute INTEGER DEFAULT 60,
  requests_per_hour INTEGER DEFAULT 1000,
  requests_per_day INTEGER DEFAULT 10000,
  
  -- Cost tracking
  cost_per_request DECIMAL(10, 6) DEFAULT 0.001,
  cost_per_token DECIMAL(10, 6) DEFAULT 0.0001,
  cost_per_mb DECIMAL(10, 6) DEFAULT 0.01,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  auto_disable_on_budget_exceeded BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default budget configurations
INSERT INTO api_budget_config (service_name, daily_budget_usd, monthly_budget_usd, cost_per_request) VALUES
('google_maps', 100.00, 2000.00, 0.005),
('news_api', 50.00, 1000.00, 0.001),
('reddit_api', 25.00, 500.00, 0.0005),
('openai', 200.00, 5000.00, 0.002);

-- ============================================
-- API USAGE FUNCTIONS
-- ============================================

-- Function to log API usage
CREATE OR REPLACE FUNCTION log_api_usage(
  p_service_name TEXT,
  p_endpoint TEXT,
  p_method TEXT DEFAULT 'GET',
  p_request_url TEXT DEFAULT NULL,
  p_response_status INTEGER DEFAULT NULL,
  p_cost_usd DECIMAL DEFAULT 0.00,
  p_tokens_used INTEGER DEFAULT 0,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO api_usage_logs (
    service_name, endpoint, method, request_url, response_status,
    cost_usd, tokens_used, response_time_ms, user_id, session_id,
    ip_address, user_agent
  ) VALUES (
    p_service_name, p_endpoint, p_method, p_request_url, p_response_status,
    p_cost_usd, p_tokens_used, p_response_time_ms, p_user_id, p_session_id,
    p_ip_address, p_user_agent
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get daily usage for service
CREATE OR REPLACE FUNCTION get_daily_api_usage(
  p_service_name TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_cost DECIMAL,
  total_requests BIGINT,
  total_tokens BIGINT,
  avg_response_time NUMERIC,
  error_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(cost_usd), 0) as total_cost,
    COUNT(*) as total_requests,
    COALESCE(SUM(tokens_used), 0) as total_tokens,
    AVG(response_time_ms) as avg_response_time,
    COUNT(*) FILTER (WHERE response_status >= 400) as error_count
  FROM api_usage_logs
  WHERE service_name = p_service_name
  AND DATE(created_at) = p_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get monthly usage for service
CREATE OR REPLACE FUNCTION get_monthly_api_usage(
  p_service_name TEXT,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  p_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)
)
RETURNS TABLE(
  total_cost DECIMAL,
  total_requests BIGINT,
  total_tokens BIGINT,
  avg_response_time NUMERIC,
  error_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(cost_usd), 0) as total_cost,
    COUNT(*) as total_requests,
    COALESCE(SUM(tokens_used), 0) as total_tokens,
    AVG(response_time_ms) as avg_response_time,
    COUNT(*) FILTER (WHERE response_status >= 400) as error_count
  FROM api_usage_logs
  WHERE service_name = p_service_name
  AND EXTRACT(YEAR FROM created_at) = p_year
  AND EXTRACT(MONTH FROM created_at) = p_month;
END;
$$ LANGUAGE plpgsql;

-- Function to check budget status
CREATE OR REPLACE FUNCTION check_budget_status(
  p_service_name TEXT,
  p_period TEXT DEFAULT 'daily' -- 'daily' or 'monthly'
)
RETURNS TABLE(
  service_name TEXT,
  period TEXT,
  budget_limit DECIMAL,
  current_usage DECIMAL,
  usage_percentage DECIMAL,
  status TEXT,
  days_remaining INTEGER
) AS $$
DECLARE
  budget_config RECORD;
  current_usage DECIMAL;
  usage_percentage DECIMAL;
  status TEXT;
  days_remaining INTEGER;
BEGIN
  -- Get budget configuration
  SELECT * INTO budget_config
  FROM api_budget_config
  WHERE service_name = p_service_name AND is_active = TRUE;
  
  IF budget_config IS NULL THEN
    RETURN;
  END IF;
  
  -- Get current usage
  IF p_period = 'daily' THEN
    SELECT COALESCE(SUM(cost_usd), 0) INTO current_usage
    FROM api_usage_logs
    WHERE service_name = p_service_name
    AND DATE(created_at) = CURRENT_DATE;
    
    usage_percentage := (current_usage / budget_config.daily_budget_usd) * 100;
    days_remaining := 1;
  ELSE
    SELECT COALESCE(SUM(cost_usd), 0) INTO current_usage
    FROM api_usage_logs
    WHERE service_name = p_service_name
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE);
    
    usage_percentage := (current_usage / budget_config.monthly_budget_usd) * 100;
    days_remaining := EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day') - CURRENT_DATE);
  END IF;
  
  -- Determine status
  IF usage_percentage >= budget_config.critical_threshold * 100 THEN
    status := 'critical';
  ELSIF usage_percentage >= budget_config.warning_threshold * 100 THEN
    status := 'warning';
  ELSE
    status := 'normal';
  END IF;
  
  RETURN QUERY
  SELECT 
    p_service_name,
    p_period,
    CASE WHEN p_period = 'daily' THEN budget_config.daily_budget_usd ELSE budget_config.monthly_budget_usd END,
    current_usage,
    usage_percentage,
    status,
    days_remaining;
END;
$$ LANGUAGE plpgsql;

-- Function to get usage statistics
CREATE OR REPLACE FUNCTION get_api_usage_stats(
  p_days_back INTEGER DEFAULT 7
)
RETURNS TABLE(
  service_name TEXT,
  total_cost DECIMAL,
  total_requests BIGINT,
  avg_daily_cost DECIMAL,
  avg_response_time NUMERIC,
  error_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aul.service_name,
    COALESCE(SUM(aul.cost_usd), 0) as total_cost,
    COUNT(*) as total_requests,
    COALESCE(SUM(aul.cost_usd), 0) / p_days_back as avg_daily_cost,
    AVG(aul.response_time_ms) as avg_response_time,
    (COUNT(*) FILTER (WHERE aul.response_status >= 400)::DECIMAL / COUNT(*)) * 100 as error_rate
  FROM api_usage_logs aul
  WHERE aul.created_at > NOW() - (p_days_back || ' days')::INTERVAL
  GROUP BY aul.service_name
  ORDER BY total_cost DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get top endpoints by cost
CREATE OR REPLACE FUNCTION get_top_endpoints_by_cost(
  p_service_name TEXT,
  p_days_back INTEGER DEFAULT 7,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  endpoint TEXT,
  total_cost DECIMAL,
  total_requests BIGINT,
  avg_cost_per_request DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aul.endpoint,
    COALESCE(SUM(aul.cost_usd), 0) as total_cost,
    COUNT(*) as total_requests,
    COALESCE(SUM(aul.cost_usd), 0) / COUNT(*) as avg_cost_per_request
  FROM api_usage_logs aul
  WHERE aul.service_name = p_service_name
  AND aul.created_at > NOW() - (p_days_back || ' days')::INTERVAL
  GROUP BY aul.endpoint
  ORDER BY total_cost DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get user API usage
CREATE OR REPLACE FUNCTION get_user_api_usage(
  p_user_id UUID,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  service_name TEXT,
  total_cost DECIMAL,
  total_requests BIGINT,
  last_used TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aul.service_name,
    COALESCE(SUM(aul.cost_usd), 0) as total_cost,
    COUNT(*) as total_requests,
    MAX(aul.created_at) as last_used
  FROM api_usage_logs aul
  WHERE aul.user_id = p_user_id
  AND aul.created_at > NOW() - (p_days_back || ' days')::INTERVAL
  GROUP BY aul.service_name
  ORDER BY total_cost DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_update_api_budget_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER api_budget_config_updated_at_trigger
  BEFORE UPDATE ON api_budget_config
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_api_budget_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on API usage tables
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_budget_config ENABLE ROW LEVEL SECURITY;

-- Users can view their own API usage
CREATE POLICY "Users can view own API usage" ON api_usage_logs
  FOR SELECT USING (user_id = auth.uid());

-- Admins can view all API usage
CREATE POLICY "Admins can view all API usage" ON api_usage_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND (is_admin = TRUE OR is_super_admin = TRUE)
    )
  );

-- Only admins can manage budget configuration
CREATE POLICY "Admins can manage budget config" ON api_budget_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND (is_admin = TRUE OR is_super_admin = TRUE)
    )
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE api_usage_logs IS 'Tracks all external API usage for cost monitoring and optimization';
COMMENT ON TABLE api_budget_config IS 'Configuration for API budget limits and monitoring thresholds';
COMMENT ON FUNCTION log_api_usage(TEXT, TEXT, TEXT, TEXT, INTEGER, DECIMAL, INTEGER, INTEGER, UUID, TEXT, INET, TEXT) IS 'Logs API usage with cost and performance metrics';
COMMENT ON FUNCTION get_daily_api_usage(TEXT, DATE) IS 'Gets daily API usage statistics for a service';
COMMENT ON FUNCTION get_monthly_api_usage(TEXT, INTEGER, INTEGER) IS 'Gets monthly API usage statistics for a service';
COMMENT ON FUNCTION check_budget_status(TEXT, TEXT) IS 'Checks if service is within budget limits';
COMMENT ON FUNCTION get_api_usage_stats(INTEGER) IS 'Gets comprehensive API usage statistics';
COMMENT ON FUNCTION get_top_endpoints_by_cost(TEXT, INTEGER, INTEGER) IS 'Gets most expensive endpoints for optimization';
COMMENT ON FUNCTION get_user_api_usage(UUID, INTEGER) IS 'Gets API usage statistics for a specific user';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Created API usage tracking system';
  RAISE NOTICE '✅ Implemented budget monitoring and alerts';
  RAISE NOTICE '✅ Added cost optimization analytics';
  RAISE NOTICE '✅ Added user-specific usage tracking';
  RAISE NOTICE '📝 Migration 0074 complete - API usage tracking enhanced';
END$$;
