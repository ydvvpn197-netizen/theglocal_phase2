# Realtime Supabase Testing Guide

This guide helps you verify that realtime subscriptions are working correctly in both the frontend and Supabase database.

## 🔍 Frontend Verification

### 1. **Browser Console Checks**

Open your browser's Developer Console (F12) and look for these log messages:

#### ✅ Successful Connection Indicators:

- `📡 Feed realtime status: SUBSCRIBED`
- `✅ Successfully subscribed to notifications channel`
- `✅ Successfully subscribed to user profile updates`
- `📡 Events realtime status: SUBSCRIBED`
- `💬 Comments realtime status for [postId]: SUBSCRIBED`

#### ⚠️ Error Indicators:

- `❌ Error subscribing to [feature] channel`
- `CHANNEL_ERROR` status
- `Failed to subscribe to [feature] updates`

### 2. **Network Tab Verification**

1. Open **Network Tab** in DevTools
2. Filter by **WS** (WebSocket) or search for `realtime`
3. Look for WebSocket connections to your Supabase project
4. Check connection status:
   - **Status 101**: WebSocket connection established ✅
   - **Status 200**: HTTP upgrade failed ❌

### 3. **UI Status Indicators**

Check for `RealtimeStatus` components in the UI:

- **Green WiFi icon** = Connected ✅
- **Spinning loader** = Connecting... 🔄
- **Red WiFi icon** = Disconnected ❌

Locations:

- Post feed page
- Poll feed page
- Event list page
- Comments sections
- Notifications dropdown

### 4. **Manual Testing Steps**

#### Test Posts Realtime:

1. Open two browser tabs with the post feed
2. Create a new post in Tab 1
3. **Expected**: Post appears immediately in Tab 2 without refresh

#### Test Comments Realtime:

1. Open a post detail page
2. Open another tab with the same post
3. Add a comment in Tab 1
4. **Expected**: Comment appears immediately in Tab 2

#### Test Votes Realtime:

1. Open a post with vote buttons
2. Click upvote/downvote
3. **Expected**: Vote count updates immediately (no page refresh)

#### Test Notifications Realtime:

1. Open notifications dropdown
2. Have another user interact with your content (comment, vote, etc.)
3. **Expected**: Notification appears immediately

#### Test Events Realtime:

1. Open events list page
2. Create a new event (as an artist)
3. **Expected**: Event appears immediately in the list

#### Test User Profile Realtime:

1. Open your profile in one tab
2. Update your profile in another tab/session
3. **Expected**: Profile updates appear in real time

## 🗄️ Supabase Database Verification

### 1. **Check Realtime Publication Status**

Run this SQL query in Supabase SQL Editor:

```sql
-- Check which tables are enabled for realtime
SELECT
  pubname as publication_name,
  tablename as table_name,
  schemaname as schema_name
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

**Expected Tables** (should include):

- ✅ `posts`
- ✅ `comments`
- ✅ `poll_comments`
- ✅ `polls`
- ✅ `poll_options`
- ✅ `votes`
- ✅ `notifications`
- ✅ `users`
- ✅ `events`
- ✅ `communities`
- ✅ `community_members`
- ✅ `user_presence`
- ✅ `conversations`
- ✅ `messages`

### 2. **Check Replica Identity**

Run this to verify tables have proper replica identity:

```sql
-- Check replica identity for realtime tables
SELECT
  tablename,
  CASE
    WHEN relreplident = 'd' THEN 'DEFAULT'
    WHEN relreplident = 'n' THEN 'NOTHING'
    WHEN relreplident = 'f' THEN 'FULL'
    WHEN relreplident = 'i' THEN 'INDEX'
  END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND tablename IN (
    'posts', 'comments', 'poll_comments', 'polls', 'poll_options',
    'votes', 'notifications', 'users', 'events', 'communities',
    'community_members', 'user_presence', 'conversations', 'messages'
  )
ORDER BY tablename;
```

**Expected**: All tables should have `FULL` replica identity for UPDATE tracking.

### 3. **Test Realtime with SQL**

Create a test row and watch for realtime updates:

```sql
-- Test INSERT (replace with actual data)
INSERT INTO posts (title, body, author_id, community_id)
VALUES ('Test Realtime Post', 'Testing realtime subscription', 'YOUR_USER_ID', 'YOUR_COMMUNITY_ID')
RETURNING *;

-- Test UPDATE
UPDATE posts
SET title = 'Updated Test Post'
WHERE title = 'Test Realtime Post';

-- Test DELETE
DELETE FROM posts
WHERE title = 'Updated Test Post';
```

**Expected**: Frontend should receive these changes in real time.

## 🔧 Using MCP Server (Programmatic Checks)

### Check Table Realtime Status

You can use the Supabase MCP server to check publication status:

```javascript
// Check if a table is in the realtime publication
// This would be done via MCP server query
```

### List Active Channels

```javascript
// Get active realtime channels
// Note: This requires Supabase API access
```

## 🐛 Common Issues & Solutions

### Issue 1: "CHANNEL_ERROR" Status

**Symptoms**:

- Console shows `CHANNEL_ERROR`
- UI shows red WiFi icon
- No realtime updates

**Solutions**:

1. Check if table is in `supabase_realtime` publication
2. Verify RLS policies allow SELECT operations
3. Check network connectivity
4. Verify Supabase project is active

### Issue 2: Subscriptions Not Receiving Updates

**Symptoms**:

- Connection shows `SUBSCRIBED`
- But no updates appear

**Solutions**:

1. Check if `REPLICA IDENTITY FULL` is set on the table
2. Verify the filter in subscription matches your data
3. Check browser console for errors
4. Verify you're subscribed to the correct table

### Issue 3: Duplicate Updates

**Symptoms**:

- Same update appears multiple times

**Solutions**:

1. Check if multiple subscriptions are active
2. Verify connection manager is properly cleaning up
3. Check for duplicate event handlers

### Issue 4: Connection Limit Reached

**Symptoms**:

- Console shows "Connection limit reached"
- New subscriptions fail

**Solutions**:

1. Check connection manager logs
2. Verify old subscriptions are being cleaned up
3. Check Supabase connection limits (200 max)

## 📊 Monitoring Dashboard

### Check Active Connections

In browser console, you can check connection manager state:

```javascript
// Access connection manager (if exposed)
// Check number of active subscriptions
```

### Real-time Testing Script

Create a test script to verify all realtime features:

```javascript
// Test script (run in browser console)
async function testRealtime() {
  console.log('Testing realtime subscriptions...')

  // Check for realtime status indicators in DOM
  const statusIndicators = document.querySelectorAll('[data-realtime-status]')
  console.log(`Found ${statusIndicators.length} realtime status indicators`)

  // Check console logs for subscription status
  // Look for SUBSCRIBED status messages
}
```

## ✅ Verification Checklist

### Frontend:

- [ ] Browser console shows `SUBSCRIBED` status for all features
- [ ] Network tab shows active WebSocket connections
- [ ] UI shows green WiFi icons (connected state)
- [ ] Test INSERT/UPDATE/DELETE operations work in real time
- [ ] No `CHANNEL_ERROR` messages in console
- [ ] Real-time updates appear without page refresh

### Supabase:

- [ ] All tables are in `supabase_realtime` publication
- [ ] All tables have `REPLICA IDENTITY FULL`
- [ ] RLS policies allow SELECT for realtime subscriptions
- [ ] No errors in Supabase logs
- [ ] Realtime service is enabled in project settings

### Features:

- [ ] Posts: New posts appear immediately
- [ ] Comments: New comments appear immediately
- [ ] Polls: New polls appear immediately
- [ ] Poll Comments: New poll comments appear immediately
- [ ] Votes: Vote counts update immediately
- [ ] Notifications: Notifications appear immediately
- [ ] Events: New events appear immediately
- [ ] User Profile: Profile changes reflect immediately
- [ ] User Presence: Online status updates in real time

## 🚀 Quick Test Commands

### Test via Supabase Dashboard:

1. Go to **Database** → **Replication**
2. Verify tables are listed
3. Check **Realtime** status is "Enabled"

### Test via API:

```bash
# Check if realtime is enabled (requires API key)
curl -X GET \
  'https://YOUR_PROJECT.supabase.co/rest/v1/' \
  -H 'apikey: YOUR_API_KEY'
```

## 📝 Debugging Tips

1. **Enable Verbose Logging**:
   - Set `console.log` level to verbose in browser
   - Check all realtime-related console messages

2. **Check Connection Manager**:
   - Look for connection manager logs
   - Verify channels are being reused properly

3. **Monitor Network**:
   - Watch WebSocket frames in Network tab
   - Check for connection drops or errors

4. **Test Incrementally**:
   - Test one feature at a time
   - Isolate issues to specific subscriptions

5. **Check Supabase Logs**:
   - Review Supabase dashboard logs
   - Check for database errors or connection issues

## 🎯 Success Criteria

All of these should be true:

- ✅ All realtime status indicators show green (connected)
- ✅ Console shows `SUBSCRIBED` for all features
- ✅ Manual tests show updates appearing in real time
- ✅ No errors in browser console or Supabase logs
- ✅ All tables verified in `supabase_realtime` publication
- ✅ All tables have `REPLICA IDENTITY FULL`

---

**Note**: If you find issues, check the migration files in `supabase/migrations/` to ensure all tables are properly enabled for realtime.
