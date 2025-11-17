-- Payment Webhook Logging
-- Version: 0070
-- Description: Add comprehensive webhook logging and monitoring
-- Date: 2025-01-27

SET search_path TO public;

-- ============================================
-- WEBHOOK LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Webhook identification
  event_type TEXT NOT NULL,
  payment_method TEXT NOT NULL, -- 'razorpay', 'paypal'
  external_event_id TEXT, -- External webhook event ID

  -- Request details
  payload JSONB NOT NULL,
  headers JSONB,
  ip_address INET,
  user_agent TEXT,

  -- Processing status
  status TEXT NOT NULL DEFAULT 'received', -- received, processing, completed, failed
  processed_at TIMESTAMP WITH TIME ZONE,
  processing_duration_ms INTEGER,

  -- Retry handling
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP WITH TIME ZONE,

  -- Error handling
  error_message TEXT,
  error_code TEXT,
  error_details JSONB,

  -- Related entities
  payment_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamps
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_payment_method ON webhook_logs(payment_method);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_received_at ON webhook_logs(received_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_payment_transaction_id ON webhook_logs(payment_transaction_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_next_retry_at ON webhook_logs(next_retry_at) WHERE status = 'failed';

-- ============================================
-- WEBHOOK PROCESSING FUNCTIONS
-- ============================================

-- Function to log webhook event
CREATE OR REPLACE FUNCTION log_webhook_event(
  p_event_type TEXT,
  p_payment_method TEXT,
  p_payload JSONB,
  p_headers JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_external_event_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  webhook_id UUID;
BEGIN
  INSERT INTO webhook_logs (
    event_type, payment_method, payload, headers,
    ip_address, user_agent, external_event_id
  ) VALUES (
    p_event_type, p_payment_method, p_payload, p_headers,
    p_ip_address, p_user_agent, p_external_event_id
  ) RETURNING id INTO webhook_id;

  RETURN webhook_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update webhook processing status
CREATE OR REPLACE FUNCTION update_webhook_status(
  p_webhook_id UUID,
  p_status TEXT,
  p_processing_duration_ms INTEGER DEFAULT NULL,
  p_payment_transaction_id UUID DEFAULT NULL,
  p_subscription_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_error_details JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE webhook_logs
  SET
    status = p_status,
    processed_at = CASE WHEN p_status IN ('completed', 'failed') THEN NOW() ELSE processed_at END,
    processing_duration_ms = p_processing_duration_ms,
    payment_transaction_id = COALESCE(p_payment_transaction_id, payment_transaction_id),
    subscription_id = COALESCE(p_subscription_id, subscription_id),
    user_id = COALESCE(p_user_id, user_id),
    error_message = p_error_message,
    error_code = p_error_code,
    error_details = p_error_details,
    updated_at = NOW()
  WHERE id = p_webhook_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get failed webhooks for retry
CREATE OR REPLACE FUNCTION get_failed_webhooks_for_retry(
  p_hours_ago INTEGER DEFAULT 24
)
RETURNS TABLE(
  id UUID,
  event_type TEXT,
  payment_method TEXT,
  payload JSONB,
  retry_count INTEGER,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wl.id, wl.event_type, wl.payment_method, wl.payload,
    wl.retry_count, wl.next_retry_at, wl.received_at
  FROM webhook_logs wl
  WHERE wl.status = 'failed'
    AND wl.retry_count < wl.max_retries
    AND (wl.next_retry_at IS NULL OR wl.next_retry_at <= NOW())
    AND wl.received_at > NOW() - (p_hours_ago || ' hours')::INTERVAL
  ORDER BY wl.received_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to increment webhook retry count
CREATE OR REPLACE FUNCTION increment_webhook_retry(
  p_webhook_id UUID,
  p_next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_retry_count INTEGER;
  v_max_retries INTEGER;
BEGIN
  SELECT retry_count, max_retries
  INTO current_retry_count, v_max_retries
  FROM webhook_logs
  WHERE id = p_webhook_id;

  IF current_retry_count IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE webhook_logs
  SET
    retry_count = retry_count + 1,
    next_retry_at = COALESCE(p_next_retry_at, NOW() + INTERVAL '1 hour'),
    updated_at = NOW()
  WHERE id = p_webhook_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get webhook statistics
CREATE OR REPLACE FUNCTION get_webhook_stats(
  p_hours_back INTEGER DEFAULT 24
)
RETURNS TABLE(
  total_webhooks BIGINT,
  successful_webhooks BIGINT,
  failed_webhooks BIGINT,
  pending_webhooks BIGINT,
  avg_processing_time_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_webhooks,
    COUNT(*) FILTER (WHERE status = 'completed') AS successful_webhooks,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed_webhooks,
    COUNT(*) FILTER (WHERE status IN ('received', 'processing')) AS pending_webhooks,
    AVG(processing_duration_ms) AS avg_processing_time_ms
  FROM webhook_logs
  WHERE received_at > NOW() - (p_hours_back || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_update_webhook_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webhook_logs_updated_at_trigger
  BEFORE UPDATE ON webhook_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_webhook_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Replace profiles reference with users.is_super_admin
-- Allow only super admins to view webhook logs
DO $$
BEGIN
  -- Drop existing policy if it exists to avoid conflicts during re-runs
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'webhook_logs' AND policyname = 'Admins can view webhook logs'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can view webhook logs" ON public.webhook_logs';
  END IF;
END$$;

CREATE POLICY "Admins can view webhook logs" ON webhook_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = (SELECT auth.uid())
        AND u.is_super_admin = TRUE
    )
  );

-- Allow system (authenticated) to insert/update logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'webhook_logs' AND policyname = 'System can insert webhook logs'
  ) THEN
    EXECUTE 'CREATE POLICY "System can insert webhook logs" ON webhook_logs FOR INSERT TO authenticated WITH CHECK (TRUE)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'webhook_logs' AND policyname = 'System can update webhook logs'
  ) THEN
    EXECUTE 'CREATE POLICY "System can update webhook logs" ON webhook_logs FOR UPDATE TO authenticated USING (TRUE)';
  END IF;
END$$;

-- Helpful index for RLS lookup
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

-- Function to clean up old webhook logs
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs(
  p_days_old INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM webhook_logs
  WHERE received_at < NOW() - (p_days_old || ' days')::INTERVAL
    AND status IN ('completed', 'failed');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE webhook_logs IS 'Logs all payment webhook events for monitoring and debugging';
COMMENT ON FUNCTION log_webhook_event(TEXT, TEXT, JSONB, JSONB, INET, TEXT, TEXT) IS 'Logs a webhook event with all relevant details';
COMMENT ON FUNCTION update_webhook_status(UUID, TEXT, INTEGER, UUID, UUID, UUID, TEXT, TEXT, JSONB) IS 'Updates webhook processing status and related entities';
COMMENT ON FUNCTION get_failed_webhooks_for_retry(INTEGER) IS 'Gets failed webhooks eligible for retry within specified time window';
COMMENT ON FUNCTION get_webhook_stats(INTEGER) IS 'Gets webhook processing statistics for monitoring';
COMMENT ON FUNCTION cleanup_old_webhook_logs(INTEGER) IS 'Deletes old webhook logs older than N days that are completed or failed';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Created webhook_logs table with comprehensive logging';
  RAISE NOTICE '✅ Implemented retry mechanism for failed webhooks';
  RAISE NOTICE '✅ Added webhook statistics and monitoring';
  RAISE NOTICE '✅ Added cleanup function for old webhook logs';
  RAISE NOTICE '✅ RLS policy uses users.is_super_admin';
  RAISE NOTICE '📝 Migration 0070 complete - webhook logging enhanced';
END$$;