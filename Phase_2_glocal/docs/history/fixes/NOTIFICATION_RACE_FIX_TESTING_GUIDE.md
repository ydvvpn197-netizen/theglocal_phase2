# Notification System Race Condition Fix - Testing Guide

## Overview

This guide provides comprehensive testing scenarios to validate all race condition fixes in the notification system.

## Pre-Testing Setup

### 1. Apply Database Migration

```bash
# Using Supabase CLI
supabase migration up

# Or apply manually via Supabase Dashboard
# Run: supabase/migrations/0135_fix_notification_races.sql
```

### 2. Verify Environment

- Ensure you're testing in development mode for verbose logging
- Open browser console to monitor logs
- Have multiple browser tabs/windows ready for concurrent testing

### 3. Test Users

- Create at least 2 test users for message/notification testing
- Note their IDs for verification

## Testing Scenarios

### 1. Rapid Messaging (Batching Test)

**Objective:** Verify that rapid messages create a single batched notification instead of multiple.

**Steps:**

1. Open two browser windows with different users
2. User A sends 10 messages in rapid succession (< 1 second apart) to User B
3. Check User B's notification dropdown

**Expected Result:**

- ✅ Single notification showing "10 new messages" or similar batch count
- ✅ No duplicate notifications
- ✅ Console shows advisory lock acquisition logs
- ✅ Notification badge shows correct count

**Logs to Look For:**

```
[Notification][RT] 🔔 INSERT: [notification-id]
Notification created: [id] for user [user-id]
Updated batched notification [id] (count: 10)
```

---

### 2. Concurrent Mark as Read

**Objective:** Verify no race conditions when marking same notification as read from multiple tabs.

**Steps:**

1. Open same user account in 3 different browser tabs
2. Generate a notification (send a message from another user)
3. Simultaneously click the same notification in all 3 tabs

**Expected Result:**

- ✅ Notification is marked as read exactly once
- ✅ No errors in console
- ✅ Count decrements by 1 (not 3)
- ✅ All tabs show the notification as read after sync
- ✅ Database has only one `read_at` timestamp

**Logs to Look For:**

```
[Notification][v1][Mutation] mark_as_read_start: [id]
[Notification][v1][Mutation] mark_as_read_success: [id]
[Notification][Duplicate] ⏭️ Skipped duplicate from mutation: [id]
```

---

### 3. Mark All During New Notification Arrival

**Objective:** Verify new notifications arriving during "Mark All as Read" operation are not incorrectly marked as read.

**Steps:**

1. User A has 5 unread notifications
2. User A clicks "Mark All as Read"
3. During the operation (within 1 second), User B sends User A a new message
4. Wait for operation to complete

**Expected Result:**

- ✅ Original 5 notifications are marked as read
- ✅ New notification from step 3 remains unread
- ✅ Count shows 1 unread notification
- ✅ No count flicker observed

**Logs to Look For:**

```
[Notification][v2][Mutation] mark_all_as_read_start: batch
[NotificationDropdown] Marking all notifications as read...
[Notification][RT] 🔔 INSERT: [new-notification-id]
[Notification][v2][Mutation] mark_all_as_read_success: batch
```

---

### 4. Refresh During Mutation

**Objective:** Verify notification count doesn't flicker when page refreshes during mutation.

**Steps:**

1. User has 5 unread notifications
2. Click on a notification to mark it as read
3. Immediately refresh the page (within 1 second)
4. Observe count during and after refresh

**Expected Result:**

- ✅ Count shows 4 unread (or preserves previous count during refresh)
- ✅ No flicker to 0 or incorrect value
- ✅ After refresh completes, count is accurate (4 unread)
- ✅ Notification is marked as read in all tabs

**Logs to Look For:**

```
[Notification][Cache] refresh_start: { frozenCount: 4 }
[Notification][Count] optimistic_decrement: 4, delta: -1
[Notification][Performance] refresh_complete: [duration]ms
```

---

### 5. Network Lag Simulation

**Objective:** Verify system handles slow network correctly without duplicates.

**Steps:**

1. Open Chrome DevTools > Network tab
2. Set throttling to "Slow 3G" or "Offline"
3. Send 5 messages rapidly
4. Re-enable network
5. Wait for sync

**Expected Result:**

- ✅ All messages eventually sync
- ✅ No duplicate notifications created
- ✅ Correct notification count after sync
- ✅ No race condition errors in console

**Logs to Look For:**

```
[Notification][Cache] refresh_skipped_offline: { reason: 'offline' }
[Notification][RT] 🔔 INSERT: [id]
[Notification][Duplicate] ⏭️ Skipped duplicate from realtime: [id]
```

---

### 6. Realtime Disconnect/Reconnect

**Objective:** Verify proper sync after realtime connection drops.

**Steps:**

1. User A opens app (ensure realtime is connected)
2. Disconnect network temporarily (airplane mode or DevTools)
3. User B sends 3 messages to User A
4. Reconnect network
5. Wait for sync

**Expected Result:**

- ✅ All 3 messages appear after reconnect
- ✅ Single batched notification (if within 5 min window)
- ✅ Correct unread count
- ✅ No duplicate notifications

---

### 7. Multiple Tabs with Different Operations

**Objective:** Verify operations in different tabs don't cause race conditions.

**Steps:**

1. Open 3 tabs with same user
2. Tab 1: Click "Mark All as Read"
3. Tab 2: Simultaneously click on a specific notification
4. Tab 3: Simultaneously delete a notification

**Expected Result:**

- ✅ All operations complete successfully
- ✅ No errors in any tab
- ✅ Final state is consistent across all tabs after sync
- ✅ Count is accurate in all tabs

---

### 8. Dropdown Open/Close Count Flicker

**Objective:** Verify count doesn't flicker when opening notification dropdown.

**Steps:**

1. User has 5 unread notifications
2. Observe count in badge
3. Click notification icon to open dropdown
4. Watch count during dropdown opening animation
5. Close and reopen dropdown multiple times

**Expected Result:**

- ✅ Count remains stable (5) at all times
- ✅ No flicker to 0 or other incorrect values
- ✅ Dropdown only refreshes if data is >1 minute old

**Logs to Look For:**

```
[Notification][Cache] refresh_start: { frozenCount: 5 }
increment_skipped_frozen: { id: [notification-id] }
```

---

### 9. Rapid Mark/Unmark (Not Expected, But Test Edge Case)

**Objective:** Verify mutation queue handles rapid contradictory operations.

**Steps:**

1. Have a notification visible
2. Rapidly click it 5 times in succession
3. Observe behavior

**Expected Result:**

- ✅ Operations are queued and executed serially
- ✅ Notification ends up in consistent state (marked as read)
- ✅ No race condition errors
- ✅ Count is accurate

---

### 10. Notification Creation During App Initialization

**Objective:** Verify notifications arriving during app load are handled correctly.

**Steps:**

1. User B sends message to User A
2. User A immediately refreshes page
3. During page load, User B sends another message
4. Wait for page to fully load

**Expected Result:**

- ✅ Both notifications appear
- ✅ Count is accurate (2)
- ✅ No missing notifications
- ✅ No duplicates

---

## Performance Validation

### Metrics to Monitor

1. **Mark as Read Latency:**
   - Target: <10ms P99
   - Check console logs for performance metrics
   - `[Notification][Performance] mark_as_read: [duration]ms`

2. **Advisory Lock Acquisition:**
   - Should be nearly instant (<5ms)
   - Check database logs for lock wait times

3. **Summary Query Performance:**
   - Should use atomic function
   - Check query plans if needed

### SQL Verification Queries

```sql
-- Verify no duplicate notifications for same batch key
SELECT batch_key, COUNT(*) as count
FROM notifications
WHERE read_at IS NULL
  AND batch_key IS NOT NULL
GROUP BY batch_key
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- Check notification batching is working
SELECT
  batch_key,
  batch_count,
  title,
  created_at
FROM notifications
WHERE batch_count > 1
ORDER BY created_at DESC
LIMIT 10;

-- Verify read_at timestamps are not in the future
SELECT *
FROM notifications
WHERE read_at > NOW();
-- Should return 0 rows
```

---

## Automated Testing Script

Create a test script to simulate concurrent operations:

```javascript
// test-notification-races.js
async function testConcurrentMarkAsRead(notificationId) {
  const promises = Array(10)
    .fill(null)
    .map(() => fetch(`/api/notifications/${notificationId}`, { method: 'PATCH' }))

  const results = await Promise.all(promises)
  const successful = results.filter((r) => r.ok).length

  console.log(`Concurrent marks: ${successful} successful out of 10`)
  // Should be 1 successful, rest should be idempotent
}

async function testRapidNotifications() {
  const startTime = Date.now()

  for (let i = 0; i < 20; i++) {
    // Send message (triggers notification)
    await sendMessage(`Test message ${i}`)
  }

  const duration = Date.now() - startTime
  console.log(`Sent 20 messages in ${duration}ms`)

  // Check notifications table
  // Should have 1 notification with batch_count = 20
}
```

---

## Success Criteria

### All Tests Must Pass:

- ✅ Zero duplicate notifications
- ✅ Zero count flicker incidents
- ✅ 100% accurate unread counts across all tabs
- ✅ <10ms P99 latency for mark-as-read operations
- ✅ Proper notification batching (1 notification for rapid messages)
- ✅ No race condition errors in console logs
- ✅ Consistent state across multiple tabs/windows
- ✅ Proper handling of network issues and reconnection

### Logs Should Show:

- Advisory lock acquisition for batching
- Version tracking in mutations
- Frozen count during refresh
- Duplicate detection working
- Performance metrics within targets

---

## Rollback Procedures

If any critical issues are found:

### 1. Database Rollback

```sql
-- Only if absolutely necessary
-- This will revert to previous trigger behavior
BEGIN;
  -- Restore old notify_direct_message without advisory locks
  -- (Keep backup of old function)
COMMIT;
```

### 2. Code Rollback

```bash
# Revert notification-context.tsx changes
git revert [commit-hash]

# Redeploy
npm run build
npm run deploy
```

### 3. Feature Flag (Future Enhancement)

```typescript
// Add to .env
ENABLE_RACE_FIXES = false

// In code
if (process.env.ENABLE_RACE_FIXES !== 'false') {
  // Use new race-safe logic
} else {
  // Fall back to old logic
}
```

---

## Monitoring Post-Deployment

### Key Metrics to Watch:

1. Notification creation rate
2. Duplicate notification rate (should be 0)
3. Database lock wait times
4. API endpoint latencies
5. Error rates in Sentry/logging

### Alert Thresholds:

- Mark as read P99 latency > 50ms → Investigate
- Any duplicate notifications → Critical issue
- Advisory lock failures > 1% → Database performance issue
- Count flicker reports from users → Immediate investigation

---

## Notes

- All fixes are backward compatible
- Database migration is idempotent (safe to run multiple times)
- Frontend changes gracefully degrade if RPC functions unavailable
- Comprehensive logging helps debug any edge cases

---

## Contact for Issues

If any tests fail or unexpected behavior occurs:

1. Check console logs for specific error messages
2. Review database logs for lock/transaction issues
3. Verify RPC functions exist and are working
4. Check Supabase realtime connection status

## Testing Completion Checklist

- [ ] Database migration applied successfully
- [ ] All 10 test scenarios pass
- [ ] Performance metrics within targets
- [ ] No SQL verification queries return anomalies
- [ ] Multiple browser tabs tested
- [ ] Network lag scenarios tested
- [ ] Realtime disconnect/reconnect tested
- [ ] No race condition errors in production logs
- [ ] User-facing features work as expected
