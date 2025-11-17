# Comment Visibility Fix - Critical Steps

## Problem

Comments are not visible on posts even though the count shows "2 comments". The comments section displays "No comments yet."

## Root Causes

1. **RLS Policy Issue (CRITICAL)**: The RLS policy checks `can_view_post_safe` first, which may fail temporarily, blocking realtime payloads and regular queries.

2. **Migration Not Applied**: Migration `0119_fix_comment_realtime_visibility.sql` needs to be applied to fix the RLS policy.

3. **CSP Errors**: Inline styles are being blocked (fixed in code, but needs server restart).

## Fixes Applied

### 1. RLS Policy Fix (Migration 0119)

- **File**: `supabase/migrations/0119_fix_comment_realtime_visibility.sql`
- **Change**: Reordered RLS policy to check `author_id` first, then `can_view_post_safe`
- **Status**: ⚠️ **NEEDS TO BE APPLIED TO DATABASE**

### 2. CSP Fixes

- **Files**: `middleware.ts`, `next.config.js`
- **Changes**:
  - Removed nonce from `style-src` (nonce ignored when `unsafe-inline` is present)
  - Added Google ad domains to `frame-src` and `connect-src`
- **Status**: ✅ Applied (needs server restart)

### 3. Optimistic Comment Preservation

- **File**: `components/posts/post-comments-section.tsx`
- **Changes**: Added safeguards to prevent optimistic comments from being removed
- **Status**: ✅ Applied

## Steps to Fix

### Step 1: Apply Migration 0119 (CRITICAL)

**Option A: Using Supabase CLI**

```bash
supabase migration up
```

**Option B: Using Supabase Dashboard**

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/0119_fix_comment_realtime_visibility.sql`
4. Paste and run the SQL

**Option C: Using MCP Server**

```javascript
// Use the Supabase MCP server to execute the migration
```

### Step 2: Restart Development Server

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

### Step 3: Clear Browser Cache

- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Or clear browser cache completely

### Step 4: Verify Fix

1. Open browser console (F12)
2. Navigate to a post with comments
3. Check console logs for:
   - `📞 Fetching enhanced comments for post: ...`
   - `📞 Received X comments from API`
   - `✅ Realtime confirmed optimistic comment` (if creating new comment)

4. Comments should now be visible

## Debugging

If comments still don't appear after applying the migration:

1. **Check Console Logs**:
   - Look for `⚠️ WARNING: Received 0 comments from API!`
   - Check for RLS policy errors
   - Verify realtime subscription status

2. **Check Database**:

   ```sql
   -- Verify RLS policy exists and is correct
   SELECT * FROM pg_policies
   WHERE tablename = 'comments'
   AND policyname = 'Users can view comments on accessible posts';

   -- Check if comments exist
   SELECT id, post_id, author_id, body, is_deleted
   FROM comments
   WHERE post_id = 'YOUR_POST_ID'
   AND is_deleted = false;
   ```

3. **Check API Response**:
   - Open Network tab in DevTools
   - Find request to `/api/posts/[id]/comments/enhanced`
   - Check response body for comments data

## Expected Behavior After Fix

1. ✅ Comments appear immediately after creation
2. ✅ Comments remain visible (don't disappear)
3. ✅ Realtime updates work correctly
4. ✅ CSP errors are resolved
5. ✅ Comment count matches displayed comments

## Files Modified

- `supabase/migrations/0119_fix_comment_realtime_visibility.sql` (NEW - needs to be applied)
- `middleware.ts` (CSP fixes)
- `next.config.js` (CSP fixes)
- `components/posts/post-comments-section.tsx` (Optimistic comment preservation)
- `hooks/use-comments-realtime.ts` (Realtime event processing improvements)

## Next Steps

1. **Apply migration 0119** (most critical)
2. **Restart server** to apply CSP changes
3. **Test comment visibility**
4. **Monitor console logs** for any remaining issues
