-- Razorpay Subscription Updates Migration
-- Version: 0045
-- Description: Add plan_id and other fields for Razorpay subscription integration
-- Date: 2025-10-16

-- ============================================
-- UPDATE SUBSCRIPTIONS TABLE
-- ============================================

-- Add razorpay_plan_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriptions' AND column_name = 'razorpay_plan_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN razorpay_plan_id TEXT;
  END IF;
END $$;

-- Add next_billing_date if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriptions' AND column_name = 'next_billing_date'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN next_billing_date TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================
-- UPDATE ARTISTS TABLE
-- ============================================

-- Add trial_end_date if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'artists' AND column_name = 'trial_end_date'
  ) THEN
    ALTER TABLE artists ADD COLUMN trial_end_date TIMESTAMPTZ;
  END IF;
END $$;

-- Add subscription_cancelled_at if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'artists' AND column_name = 'subscription_cancelled_at'
  ) THEN
    ALTER TABLE artists ADD COLUMN subscription_cancelled_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================
-- ADD INDEXES FOR PERFORMANCE
-- ============================================

-- Index on razorpay_plan_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_plan_id 
ON subscriptions(razorpay_plan_id);

-- Index on next_billing_date for cron jobs
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date 
ON subscriptions(next_billing_date) 
WHERE status IN ('active', 'trial');

-- Index on subscription status for reporting
CREATE INDEX IF NOT EXISTS idx_artists_subscription_status 
ON artists(subscription_status);

-- ============================================
-- UPDATE RLS POLICIES FOR ADMIN ACCESS
-- ============================================

-- Drop existing admin policies if they exist
DROP POLICY IF EXISTS "Super admins can view all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Super admins can view all subscription orders" ON subscription_orders;

-- Super admins can view all subscriptions
CREATE POLICY "Super admins can view all subscriptions"
ON subscriptions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.is_super_admin = true
  )
);

-- Super admins can view all subscription orders
CREATE POLICY "Super admins can view all subscription orders"
ON subscription_orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.is_super_admin = true
  )
);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN subscriptions.razorpay_plan_id IS 'Razorpay Plan ID (plan_xxxxx)';
COMMENT ON COLUMN subscriptions.next_billing_date IS 'Next billing date for active subscriptions';
COMMENT ON COLUMN artists.trial_end_date IS 'End date of free trial period';
COMMENT ON COLUMN artists.subscription_cancelled_at IS 'Timestamp when subscription was cancelled';

