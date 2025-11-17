# React Hook Exhaustive-Deps Analysis

## Summary

Found 7 `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions across 6 files.

## Analysis Results

### Valid Suppressions (Mount-Only Effects)

Most of these are **intentionally suppressed** for legitimate reasons:

#### 1. `lib/context/auth-context.tsx` (2 suppressions)

**Line 217-218:** Auth initialization effect

```typescript
useEffect(() => {
  initializeAuth()
  return () => {
    isMounted = false
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []) // Intentionally empty - should only run on mount
```

**Status:** ✅ **VALID** - Auth should initialize once on mount

**Line 290-291:** Auth state subscription

```typescript
}, [supabase, profile?.id])
// eslint-disable-next-line react-hooks/exhaustive-deps
```

**Status:** ⚠️ **REVIEW NEEDED** - May have stale closure issues

#### 2. `components/posts/post-comments-section.tsx` (Line 641-642)

```typescript
useEffect(() => {
  hasFetchedRef.current = false
  fetchEnhancedComments()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [postId]) // Only depend on postId to avoid infinite loops
```

**Status:** ✅ **VALID** - Intentionally prevents infinite loop

#### 3. `components/posts/post-feed.tsx` (Line 255-256)

```typescript
useEffect(() => {
  if (postFeedRef.current) {
    fetchPosts(0)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []) // Initial fetch only
```

**Status:** ✅ **VALID** - Initial fetch should run once

#### 4. `components/events/event-list.tsx` (Line 205-206)

```typescript
useEffect(() => {
  fetchEvents(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [city, category, dateFilter, source])
```

**Status:** ⚠️ **REVIEW NEEDED** - May miss `fetchEvents` changes

#### 5. `components/profile/profile-activity.tsx` (Line 89-90)

```typescript
useEffect(() => {
  if (activeTab === 'communities') {
    loadCommunities()
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeTab, userId])
```

**Status:** ⚠️ **REVIEW NEEDED** - May miss `loadCommunities` changes

#### 6. `components/communities/community-header.tsx` (Line 57-58)

```typescript
useEffect(() => {
  if (slug) {
    fetchCommunity()
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [slug])
```

**Status:** ⚠️ **REVIEW NEEDED** - May miss `fetchCommunity` changes

## Recommended Fixes

### Pattern 1: Wrap callbacks in `useCallback`

For functions used in effects, wrap them with `useCallback`:

```typescript
const fetchData = useCallback(async () => {
  // fetch logic
}, [dependencies])

useEffect(() => {
  fetchData()
}, [fetchData]) // Now safe to include
```

### Pattern 2: Move function inside effect

If the function is only used in one effect:

```typescript
useEffect(() => {
  async function fetchData() {
    // fetch logic
  }
  fetchData()
}, [dependencies]) // Include all external dependencies
```

### Pattern 3: Use refs for latest values

For callbacks that need latest values but shouldn't trigger re-runs:

```typescript
const latestCallback = useRef(callback)
latestCallback.current = callback

useEffect(() => {
  latestCallback.current()
}, [specificDependency]) // Don't include latestCallback
```

## Real Issue: Stale Closures in Realtime Cleanups

The **actual bug** from the audit is in realtime subscription cleanup functions that capture stale state. Example:

```typescript
// ❌ BAD: Cleanup captures current userId at effect creation time
useEffect(() => {
  const subscription = subscribe(userId)
  return () => unsubscribe(userId) // Stale userId!
}, [userId])

// ✅ GOOD: Use ref for cleanup
useEffect(() => {
  const userIdRef = { current: userId }
  const subscription = subscribe(userId)
  return () => unsubscribe(userIdRef.current) // Always latest
}, [userId])
```

## Action Items

- [ ] Review 4 files marked "REVIEW NEEDED" for stale closure bugs
- [ ] Add `useCallback` wrappers where appropriate
- [ ] Test realtime subscriptions after fixes
- [ ] Document patterns in coding guidelines

## Priority

🔴 **HIGH** - Stale closures can cause memory leaks and incorrect behavior  
🟡 **MEDIUM** - Missing dependencies might be intentional but should be verified  
🟢 **LOW** - Mount-only effects are likely correct as-is

---

**Last Updated:** 2025-01-14  
**Status:** Analysis complete, fixes pending
