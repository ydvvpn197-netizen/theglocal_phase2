# Quick Realtime Status Check Guide

## 🚀 Quick Browser Console Test

Copy and paste this into your browser console:

```javascript
// Quick realtime status check
console.log('%c🔍 REALTIME STATUS CHECK', 'color: blue; font-weight: bold; font-size: 14px;')
console.log('\n✅ Look for these in console:')
console.log('   📡 [Feature] realtime status: SUBSCRIBED')
console.log('   ✅ Successfully subscribed to [feature] channel')
console.log('\n❌ Watch for errors:')
console.log('   ❌ Error subscribing to [feature] channel')
console.log('   CHANNEL_ERROR status')
console.log('\n📊 Check Network Tab:')
console.log('   1. Filter by "WS" (WebSocket)')
console.log('   2. Look for Supabase connections')
console.log('   3. Status 101 = Connected ✅')
```

## 📋 Frontend Checks (Browser)

### 1. **Console Logs** (F12 → Console)

Look for these messages:

- ✅ `📡 Feed realtime status: SUBSCRIBED`
- ✅ `✅ Successfully subscribed to notifications channel`
- ✅ `✅ Successfully subscribed to user profile updates`
- ✅ `📡 Events realtime status: SUBSCRIBED`
- ✅ `💬 Comments realtime status: SUBSCRIBED`

### 2. **Network Tab** (F12 → Network)

- Filter by **WS** (WebSocket)
- Look for connections to `[your-project].supabase.co`
- **Status 101** = Connected ✅
- **Status 200** = Failed ❌

### 3. **UI Indicators**

Look for green WiFi icons:

- Post feed page
- Poll feed page
- Event list page
- Comments sections
- Notifications dropdown

### 4. **Manual Test**

1. Open two browser tabs
2. Create/update content in Tab 1
3. **Should appear immediately** in Tab 2 (no refresh)

## 🗄️ Supabase Database Checks

### Quick SQL Query (Run in Supabase SQL Editor)

```sql
-- Check which tables are in realtime publication
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

**Expected tables** (should see):

- ✅ posts
- ✅ comments
- ✅ poll_comments
- ✅ polls
- ✅ poll_options
- ✅ votes
- ✅ notifications
- ✅ users
- ✅ events
- ✅ communities
- ✅ community_members
- ✅ user_presence
- ✅ conversations
- ✅ messages

### Check Replica Identity

```sql
-- Check if tables have FULL replica identity (needed for UPDATE tracking)
SELECT
  c.relname as table_name,
  CASE
    WHEN c.relreplident = 'f' THEN '✅ FULL'
    WHEN c.relreplident = 'd' THEN '⚠️ DEFAULT (needs FULL)'
    WHEN c.relreplident = 'n' THEN '❌ NOTHING (needs FULL)'
    ELSE 'INDEX'
  END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'posts', 'comments', 'poll_comments', 'polls', 'poll_options',
    'votes', 'notifications', 'users', 'events', 'communities',
    'community_members', 'user_presence', 'conversations', 'messages'
  )
ORDER BY c.relname;
```

**All tables should show ✅ FULL**

## 🔧 Current Status (from MCP Check)

Based on the current database check:

- ✅ **communities** - In realtime publication
- ⚠️ **comments** - Has DEFAULT replica identity (should be FULL)

**Action needed**: Run migrations to enable all tables properly.

## 📝 Quick Test Checklist

### Test Each Feature:

- [ ] **Posts**: Create post → appears immediately in another tab
- [ ] **Comments**: Add comment → appears immediately
- [ ] **Poll Comments**: Add poll comment → appears immediately
- [ ] **Votes**: Click vote → count updates immediately
- [ ] **Notifications**: Get notification → appears immediately
- [ ] **Events**: Create event → appears immediately
- [ ] **User Profile**: Update profile → changes reflect immediately
- [ ] **Polls**: Create poll → appears immediately

## 🐛 Common Issues

### Issue: "CHANNEL_ERROR"

**Solution**: Check if table is in `supabase_realtime` publication

### Issue: Updates not appearing

**Solution**: Check if `REPLICA IDENTITY FULL` is set

### Issue: No WebSocket connections

**Solution**: Check Supabase project settings → Realtime enabled

## 📚 Full Guide

See `REALTIME_TESTING_GUIDE.md` for comprehensive testing instructions.
