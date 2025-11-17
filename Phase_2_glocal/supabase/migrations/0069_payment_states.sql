-- Payment State Management
-- Version: 0069
-- Description: Add comprehensive payment state tracking and management
-- Date: 2025-01-27

SET search_path TO public;

-- ============================================
-- PAYMENT TRANSACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Payment details
  amount INTEGER NOT NULL, -- Amount in smallest currency unit (paise/cents)
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT NOT NULL, -- 'razorpay', 'paypal'
  
  -- State management
  status TEXT NOT NULL DEFAULT 'created', -- created, pending, processing, completed, failed, refunded
  previous_status TEXT,
  state_transitions JSONB DEFAULT '[]'::jsonb,
  
  -- External payment provider details
  external_payment_id TEXT, -- Razorpay payment ID or PayPal transaction ID
  external_order_id TEXT, -- Razorpay order ID or PayPal order ID
  external_subscription_id TEXT, -- For recurring payments
  
  -- Idempotency and retry handling
  idempotency_key TEXT UNIQUE,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  error_code TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_artist_id ON payment_transactions(artist_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_external_payment_id ON payment_transactions(external_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_idempotency_key ON payment_transactions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at);

-- ============================================
-- PAYMENT STATE MACHINE FUNCTIONS
-- ============================================

-- Function to validate state transitions
CREATE OR REPLACE FUNCTION is_valid_payment_state_transition(
  current_status TEXT,
  new_status TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Define valid state transitions
  CASE current_status
    WHEN 'created' THEN
      RETURN new_status IN ('pending', 'processing', 'failed');
    WHEN 'pending' THEN
      RETURN new_status IN ('processing', 'completed', 'failed');
    WHEN 'processing' THEN
      RETURN new_status IN ('completed', 'failed');
    WHEN 'completed' THEN
      RETURN new_status IN ('refunded');
    WHEN 'failed' THEN
      RETURN new_status IN ('pending', 'processing'); -- Allow retry
    WHEN 'refunded' THEN
      RETURN FALSE; -- No transitions from refunded
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to update payment status with validation
CREATE OR REPLACE FUNCTION update_payment_status(
  p_transaction_id UUID,
  p_new_status TEXT,
  p_external_payment_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_status TEXT;
  transition_record JSONB;
BEGIN
  -- Get current status
  SELECT status INTO current_status
  FROM payment_transactions
  WHERE id = p_transaction_id;
  
  IF current_status IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Validate state transition
  IF NOT is_valid_payment_state_transition(current_status, p_new_status) THEN
    RAISE EXCEPTION 'Invalid state transition from % to %', current_status, p_new_status;
  END IF;
  
  -- Create transition record
  transition_record := jsonb_build_object(
    'from_status', current_status,
    'to_status', p_new_status,
    'timestamp', NOW(),
    'external_payment_id', p_external_payment_id,
    'error_message', p_error_message,
    'error_code', p_error_code
  );
  
  -- Update payment transaction
  UPDATE payment_transactions
  SET 
    status = p_new_status,
    previous_status = current_status,
    state_transitions = state_transitions || transition_record,
    external_payment_id = COALESCE(p_external_payment_id, external_payment_id),
    error_message = p_error_message,
    error_code = p_error_code,
    metadata = COALESCE(p_metadata, metadata),
    updated_at = NOW(),
    completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END,
    failed_at = CASE WHEN p_new_status = 'failed' THEN NOW() ELSE failed_at END,
    refunded_at = CASE WHEN p_new_status = 'refunded' THEN NOW() ELSE refunded_at END
  WHERE id = p_transaction_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to create payment transaction with idempotency
CREATE OR REPLACE FUNCTION create_payment_transaction(
  p_user_id UUID,
  p_artist_id UUID,
  p_subscription_id UUID,
  p_amount INTEGER,
  p_currency TEXT,
  p_payment_method TEXT,
  p_idempotency_key TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  transaction_id UUID;
  existing_transaction_id UUID;
BEGIN
  -- Check for existing transaction with same idempotency key
  SELECT id INTO existing_transaction_id
  FROM payment_transactions
  WHERE idempotency_key = p_idempotency_key;
  
  IF existing_transaction_id IS NOT NULL THEN
    RETURN existing_transaction_id;
  END IF;
  
  -- Create new transaction
  INSERT INTO payment_transactions (
    user_id, artist_id, subscription_id, amount, currency, 
    payment_method, idempotency_key, metadata
  ) VALUES (
    p_user_id, p_artist_id, p_subscription_id, p_amount, p_currency,
    p_payment_method, p_idempotency_key, p_metadata
  ) RETURNING id INTO transaction_id;
  
  RETURN transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get payment transaction by external ID
CREATE OR REPLACE FUNCTION get_payment_by_external_id(
  p_external_payment_id TEXT,
  p_payment_method TEXT
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  artist_id UUID,
  amount INTEGER,
  currency TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id, pt.user_id, pt.artist_id, pt.amount, 
    pt.currency, pt.status, pt.created_at
  FROM payment_transactions pt
  WHERE pt.external_payment_id = p_external_payment_id
  AND pt.payment_method = p_payment_method;
END;
$$ LANGUAGE plpgsql;

-- Function to get failed payments for retry
CREATE OR REPLACE FUNCTION get_failed_payments_for_retry(
  p_hours_ago INTEGER DEFAULT 1
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  artist_id UUID,
  amount INTEGER,
  currency TEXT,
  payment_method TEXT,
  retry_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id, pt.user_id, pt.artist_id, pt.amount, 
    pt.currency, pt.payment_method, pt.retry_count, pt.created_at
  FROM payment_transactions pt
  WHERE pt.status = 'failed'
  AND pt.retry_count < pt.max_retries
  AND pt.created_at > NOW() - (p_hours_ago || ' hours')::INTERVAL
  ORDER BY pt.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_update_payment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_transactions_updated_at_trigger
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_payment_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on payment_transactions table
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment transactions
CREATE POLICY "Users can view own payment transactions" ON payment_transactions
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own payment transactions
CREATE POLICY "Users can create own payment transactions" ON payment_transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own payment transactions (for status updates)
CREATE POLICY "Users can update own payment transactions" ON payment_transactions
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE payment_transactions IS 'Tracks all payment transactions with state management and idempotency';
COMMENT ON FUNCTION is_valid_payment_state_transition(TEXT, TEXT) IS 'Validates payment state transitions according to business rules';
COMMENT ON FUNCTION update_payment_status(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) IS 'Updates payment status with validation and audit trail';
COMMENT ON FUNCTION create_payment_transaction(UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB) IS 'Creates payment transaction with idempotency key support';
COMMENT ON FUNCTION get_payment_by_external_id(TEXT, TEXT) IS 'Retrieves payment transaction by external payment provider ID';
COMMENT ON FUNCTION get_failed_payments_for_retry(INTEGER) IS 'Gets failed payments eligible for retry within specified time window';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Created payment_transactions table with state management';
  RAISE NOTICE '✅ Implemented state transition validation';
  RAISE NOTICE '✅ Added idempotency key support';
  RAISE NOTICE '✅ Added retry mechanism for failed payments';
  RAISE NOTICE '📝 Migration 0069 complete - payment state management enhanced';
END$$;
