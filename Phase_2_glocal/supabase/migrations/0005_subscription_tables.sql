-- Subscription Tables Migration
-- Version: 0005
-- Description: Add subscription_orders and subscriptions tables for artist payment tracking
-- Date: 2025-10-07

-- ============================================
-- SUBSCRIPTION ORDERS TABLE
-- ============================================
CREATE TABLE subscription_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT UNIQUE NOT NULL, -- Razorpay order ID
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Amount in paise
  currency TEXT NOT NULL DEFAULT 'INR',
  plan TEXT NOT NULL, -- monthly, yearly
  status TEXT NOT NULL DEFAULT 'created', -- created, paid, failed
  payment_id TEXT, -- Razorpay payment ID
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  razorpay_subscription_id TEXT UNIQUE, -- Razorpay subscription ID
  plan TEXT NOT NULL, -- monthly, yearly
  status TEXT NOT NULL DEFAULT 'trial', -- trial, active, paused, cancelled, completed
  amount INTEGER NOT NULL, -- Amount in paise
  currency TEXT NOT NULL DEFAULT 'INR',
  order_id TEXT REFERENCES subscription_orders(order_id),
  payment_id TEXT, -- Initial payment ID
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  current_start TIMESTAMPTZ,
  current_end TIMESTAMPTZ,
  last_charged TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  resumed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(artist_id) -- One active subscription per artist
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_subscription_orders_artist_id ON subscription_orders(artist_id);
CREATE INDEX idx_subscription_orders_user_id ON subscription_orders(user_id);
CREATE INDEX idx_subscription_orders_order_id ON subscription_orders(order_id);
CREATE INDEX idx_subscription_orders_status ON subscription_orders(status);
CREATE INDEX idx_subscriptions_artist_id ON subscriptions(artist_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_razorpay_subscription_id ON subscriptions(razorpay_subscription_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE subscription_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Subscription Orders Policies
CREATE POLICY "Users can view their own subscription orders"
  ON subscription_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscription orders"
  ON subscription_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update subscription orders"
  ON subscription_orders FOR UPDATE
  USING (true); -- Webhook updates

-- Subscriptions Policies
CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update subscriptions"
  ON subscriptions FOR UPDATE
  USING (true); -- Webhook updates

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_subscription_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_orders_updated_at
BEFORE UPDATE ON subscription_orders
FOR EACH ROW
EXECUTE FUNCTION update_subscription_orders_updated_at();

CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_subscriptions_updated_at();

