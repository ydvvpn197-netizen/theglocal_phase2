-- PayPal Support Migration
-- Version: 0062
-- Description: Add PayPal payment method support to subscriptions table
-- Date: 2025-01-27

-- ============================================
-- ADD PAYPAL COLUMNS TO SUBSCRIPTIONS TABLE
-- ============================================

-- Add PayPal subscription ID column
ALTER TABLE subscriptions 
ADD COLUMN paypal_subscription_id TEXT;

-- Add PayPal plan ID column
ALTER TABLE subscriptions 
ADD COLUMN paypal_plan_id TEXT;

-- Add payment method column to track which gateway is used
ALTER TABLE subscriptions 
ADD COLUMN payment_method TEXT DEFAULT 'razorpay';

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Index for payment method queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_method 
ON subscriptions (payment_method);

-- Index for PayPal subscription ID lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal_id 
ON subscriptions (paypal_subscription_id);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN subscriptions.paypal_subscription_id IS 'PayPal subscription ID for PayPal payments';
COMMENT ON COLUMN subscriptions.paypal_plan_id IS 'PayPal plan ID for PayPal subscriptions';
COMMENT ON COLUMN subscriptions.payment_method IS 'Payment gateway used: razorpay or paypal';
