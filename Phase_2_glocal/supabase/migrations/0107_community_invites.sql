-- ============================================
-- COMMUNITY INVITE NOTIFICATIONS
-- Version: 0107
-- Description: Add notification when users are invited to communities
-- Date: 2025-01-29
-- ============================================

SET search_path TO public;

-- ============================================
-- NOTIFY COMMUNITY INVITE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION notify_community_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_community RECORD;
  v_inviter_handle TEXT;
BEGIN
  -- Only process new invites with a user_id (not email/phone only invites)
  IF NEW.invited_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get community details
  SELECT c.*, u.anonymous_handle as inviter_handle
  INTO v_community
  FROM communities c
  JOIN users u ON c.id = NEW.community_id
  WHERE c.id = NEW.community_id;

  -- Get inviter handle
  SELECT anonymous_handle INTO v_inviter_handle
  FROM users
  WHERE id = NEW.invited_by;

  -- Create notification for invited user
  IF v_community IS NOT NULL AND v_inviter_handle IS NOT NULL THEN
    PERFORM create_notification(
      NEW.invited_user_id,
      'community_invite',
      'Community invitation',
      'You have been invited to join ' || v_community.name || ' by ' || v_inviter_handle,
      '/communities/' || v_community.slug,
      NEW.invited_by,
      NEW.community_id,
      'community'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- CREATE TRIGGER
-- ============================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_notify_community_invite ON community_invites;

-- Trigger for community invites
CREATE TRIGGER trigger_notify_community_invite
  AFTER INSERT ON community_invites
  FOR EACH ROW
  WHEN (NEW.invited_user_id IS NOT NULL)
  EXECUTE FUNCTION notify_community_invite();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION notify_community_invite IS 'Creates notification when a user is invited to a community';
COMMENT ON TRIGGER trigger_notify_community_invite ON community_invites IS 'Triggers notification creation for community invites';

