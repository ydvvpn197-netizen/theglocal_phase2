-- Super Admin and User Bans Migration
-- Version: 0008
-- Description: Add super admin flags and user ban fields
-- Date: 2025-10-08

-- ============================================
-- ADD SUPER ADMIN FLAG TO USERS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- ============================================
-- ADD BAN FIELDS TO USERS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'is_banned'
  ) THEN
    ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'ban_expires_at'
  ) THEN
    ALTER TABLE users ADD COLUMN ban_expires_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'ban_reason'
  ) THEN
    ALTER TABLE users ADD COLUMN ban_reason TEXT;
  END IF;
END $$;

-- ============================================
-- ADD FEATURED FIELD TO COMMUNITIES
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communities'
    AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE communities ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_is_super_admin
ON users (is_super_admin)
WHERE is_super_admin = TRUE;

CREATE INDEX IF NOT EXISTS idx_users_is_banned
ON users (is_banned)
WHERE is_banned = TRUE;

CREATE INDEX IF NOT EXISTS idx_communities_is_featured
ON communities (is_featured)
WHERE is_featured = TRUE;

-- ============================================
-- UPDATE RLS POLICIES TO PREVENT BANNED USERS
-- ============================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON comments;

-- Recreate policies with ban check
CREATE POLICY "Non-banned users can create posts"
  ON posts FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    NOT EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_banned = TRUE
      AND (users.ban_expires_at IS NULL OR users.ban_expires_at > NOW())
    )
  );

CREATE POLICY "Non-banned users can create comments"
  ON comments FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    NOT EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_banned = TRUE
      AND (users.ban_expires_at IS NULL OR users.ban_expires_at > NOW())
    )
  );

-- ============================================
-- FUNCTION TO AUTO-UNBAN EXPIRED BANS
-- ============================================

CREATE OR REPLACE FUNCTION auto_unban_expired_users()
RETURNS TABLE(user_id UUID, unbanned_at TIMESTAMPTZ)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE users
  SET
    is_banned = FALSE,
    ban_expires_at = NULL,
    ban_reason = NULL,
    updated_at = NOW()
  WHERE
    is_banned = TRUE AND
    ban_expires_at IS NOT NULL AND
    ban_expires_at < NOW()
  RETURNING id, NOW();
END;
$$;

COMMENT ON COLUMN users.is_super_admin IS 'Flag to indicate if user has super admin privileges';
COMMENT ON COLUMN users.is_banned IS 'Flag to indicate if user is currently banned';
COMMENT ON COLUMN users.ban_expires_at IS 'Timestamp when temporary ban expires (NULL for permanent bans)';
COMMENT ON COLUMN users.ban_reason IS 'Reason provided for the ban';
COMMENT ON COLUMN communities.is_featured IS 'Flag to indicate if community is featured by super admin';
COMMENT ON FUNCTION auto_unban_expired_users() IS 'Automatically unbans users whose temporary ban has expired';
