-- ============================================
-- Notifications RLS + Schema Hardening
-- Version: 0130
-- Description: Re-assert RLS policies for notifications and
--              add missing optional data payload column
-- Date: 2025-11-07
-- ============================================

SET search_path TO public;

-- ============================================
-- Ensure optional metadata column exists
-- ============================================

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS data JSONB;

-- ============================================
-- Re-apply RLS policies (idempotent)
-- ============================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

COMMENT ON POLICY "Users can view their own notifications" ON notifications IS 'Restrict notification visibility to owners';
COMMENT ON POLICY "Users can update their own notifications" ON notifications IS 'Allow users to mark their notifications read';
COMMENT ON POLICY "Users can delete their own notifications" ON notifications IS 'Allow users to delete their own notifications';
COMMENT ON POLICY "System can insert notifications" ON notifications IS 'Permit trusted backend triggers/functions to insert notifications';


