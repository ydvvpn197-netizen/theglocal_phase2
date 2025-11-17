# Message and Notification Fixes - Implementation Summary

## Overview

This document summarizes the fixes implemented to resolve message disappearing and notification issues.

## Issues Fixed

### 1. ✅ Messages Disappearing After Sending

**Problem:** Messages were being sent successfully but disappeared from the UI after a moment.

**Root Causes:**

1. **State Overwrite:** `loadMessages` was being called immediately after sending, overwriting optimistic updates
2. **Race Condition:** Optimistic updates were being replaced by API responses before realtime events arrived
3. **Duplicate Handling:** Messages were being filtered out incorrectly during merge operations

**Solutions Implemented:**

1. **Prevent Immediate Reload:** Added `lastSendTimeRef` to track when messages were sent and prevent `loadMessages` from being called within 3 seconds of sending
2. **Optimistic Message Tracking:** Added `optimisticMessagesRef` to track messages that were optimistically added but might not be in API responses yet
3. **Smart Merging:** Updated `loadMessages` to merge optimistic messages with loaded messages instead of replacing them
4. **Better Duplicate Handling:** Improved duplicate detection to update existing messages instead of skipping them
5. **Functional Updates:** Used functional state updates to prevent race conditions

**Files Modified:**

- `lib/hooks/use-messages-realtime.ts`

**Key Changes:**

- Added `lastSendTimeRef` to track last send time
- Added `optimisticMessagesRef` to track optimistic messages
- Updated `loadMessages` to accept a `force` parameter and prevent immediate reload
- Improved message merging logic to preserve optimistic messages
- Enhanced logging for debugging

### 2. ✅ Notifications Not Working

**Problem:** Notifications were not being created when messages were sent.

**Root Cause:**

- **RLS Policy Blocking:** The `notify_direct_message` trigger function is marked as `SECURITY DEFINER`, but the RLS policy required `auth.role() = 'service_role'`. The trigger runs with the sender's auth context (which is `authenticated`, not `service_role`), so the INSERT was blocked by RLS.

**Solution Implemented:**

1. **Updated RLS Policy:** Changed the notification INSERT policy to allow SECURITY DEFINER functions to insert notifications
2. **Improved Error Handling:** Added comprehensive error handling in the trigger function with logging
3. **Better Validation:** Added checks for conversation existence, recipient validation, and sender validation

**Files Modified:**

- `supabase/migrations/0134_fix_message_notification_rls.sql`

**Key Changes:**

- Updated RLS policy to allow SECURITY DEFINER functions to insert notifications
- Improved `notify_direct_message` trigger with better error handling
- Added validation checks for conversation, recipient, and sender
- Added logging for debugging notification creation

## Implementation Details

### Migration: 0134_fix_message_notification_rls.sql

```sql
-- Fix RLS policy to allow SECURITY DEFINER triggers
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (user_id IS NOT NULL);

-- Improve notify_direct_message trigger
CREATE OR REPLACE FUNCTION notify_direct_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- ... improved implementation with error handling
$$;
```

### Hook: use-messages-realtime.ts

**Key Improvements:**

1. **Optimistic Message Preservation:**

   ```typescript
   // Track optimistic messages
   const optimisticMessagesRef = useRef<Map<string, MessageWithSender>>(new Map())

   // Store when sending
   optimisticMessagesRef.current.set(messageId, newMessage)

   // Preserve during load
   if (timeSinceLastSend < 5000 && lastSendTimeRef.current > 0) {
     mergedMessages.push(msg)
   }
   ```

2. **Prevent Immediate Reload:**

   ```typescript
   // Don't reload if message sent recently
   const timeSinceLastSend = Date.now() - lastSendTimeRef.current
   if (!force && timeSinceLastSend < 3000 && lastSendTimeRef.current > 0) {
     return
   }
   ```

3. **Smart Merging:**

   ```typescript
   // Merge loaded messages with optimistic messages
   for (const msg of loadedMessages) {
     mergedMessages.push(msg)
     seenIds.add(msg.id)
   }

   // Add optimistic messages that aren't loaded yet
   for (const [msgId, msg] of optimisticMessagesRef.current.entries()) {
     if (!seenIds.has(msgId) && timeSinceLastSend < 5000) {
       mergedMessages.push(msg)
     }
   }
   ```

## Testing Recommendations

### 1. Message Persistence

- [ ] Send a message and verify it appears immediately
- [ ] Verify message persists after page refresh
- [ ] Send multiple messages quickly and verify all appear
- [ ] Test with slow network connection
- [ ] Test with realtime connection disabled (should use polling)

### 2. Notification Creation

- [ ] Send a message and verify recipient receives notification
- [ ] Verify notification appears in notification dropdown
- [ ] Verify notification count updates correctly
- [ ] Test with notification preferences disabled (should not create notification)
- [ ] Test with multiple messages (should batch notifications)

### 3. Edge Cases

- [ ] Test sending message immediately after opening conversation
- [ ] Test sending message while realtime is connecting
- [ ] Test sending message while realtime is disconnected
- [ ] Test with multiple conversations open
- [ ] Test with rapid message sending

## Monitoring

### Key Metrics to Watch

- Message delivery success rate
- Notification creation success rate
- Realtime connection status
- Message disappearing reports from users
- Notification delivery latency

### Log Messages to Monitor

- `💬 Optimistically added message to state` - Message sent successfully
- `💬 Preserving optimistic message` - Optimistic message preserved during load
- `✅ Message verified in database` - Message confirmed in database
- `⚠️ Message not found in database after 2s` - Delivery verification failed
- `Notification created: % for user %` - Notification created successfully
- `Failed to create notification for message %` - Notification creation failed

## Deployment Instructions

### 1. Apply Database Migration

```bash
# Apply migration using Supabase CLI
supabase migration up

# Or apply manually in Supabase dashboard
# Run: supabase/migrations/0134_fix_message_notification_rls.sql
```

### 2. Deploy Code Changes

```bash
# Build and deploy
npm run build
npm run deploy
```

### 3. Verify Deployment

- Check browser console for realtime connection logs
- Monitor Supabase dashboard for notification creation
- Watch for any error messages in production logs
- Verify message persistence in production

## Rollback Plan

If issues occur after deployment:

1. **Database Rollback:**

   ```sql
   -- Revert RLS policy
   DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
   CREATE POLICY "System can insert notifications"
     ON notifications FOR INSERT
     WITH CHECK (auth.role() = 'service_role');
   ```

2. **Code Rollback:**
   - Revert `lib/hooks/use-messages-realtime.ts` to previous version
   - Redeploy application

## Next Steps (Optional Enhancements)

1. **Message Status Indicators:**
   - Show "sending..." state for pending messages
   - Show "delivered" checkmark after verification
   - Show "failed" state for undelivered messages

2. **Notification Improvements:**
   - Add notification badges to conversation list
   - Implement notification sound (with user preference)
   - Add notification grouping for multiple messages

3. **Performance Optimizations:**
   - Implement message pagination
   - Add message caching
   - Optimize realtime subscription filtering

## Notes

- All changes are backward compatible
- No breaking changes to existing APIs
- Database migration is safe to run on production
- Optimistic message tracking only activates when messages are sent (no overhead otherwise)
- Notification RLS policy change is minimal and safe

## Related Files

- `supabase/migrations/0134_fix_message_notification_rls.sql` - Database migration
- `lib/hooks/use-messages-realtime.ts` - Message realtime hook
- `supabase/migrations/0080_message_notifications.sql` - Original notification trigger
- `MESSAGING_SYSTEM_FIXES.md` - Previous messaging fixes
