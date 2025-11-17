# Query Prefetching Guide

## Overview

Query prefetching loads data before it's needed, eliminating loading spinners and creating instant navigation. Users perceive the application as significantly faster even on slow connections.

## When to Prefetch

✅ **Good candidates for prefetching:**

- Link hover (user likely to click)
- Pagination next page (predictable navigation)
- Search results (user is typing)
- Related content (high probability of interest)
- Critical navigation paths (dashboard, profile)

❌ **Avoid prefetching:**

- Large files (videos, large images)
- Rarely accessed pages
- Authenticated content (if user not logged in)
- Personalized data (if user preferences unknown)

## Available Utilities

### Prefetch Functions

```typescript
import {
  prefetchUserProfile,
  prefetchUserPosts,
  prefetchPost,
  prefetchCommunity,
  prefetchEvent,
  prefetchArtist,
  prefetchFeed,
  prefetchNotifications,
} from '@/lib/utils/prefetch'
```

### Prefetch Hooks

```typescript
import {
  usePrefetchOnHover,
  usePrefetchOnFocus,
  usePrefetchOnVisible,
  usePrefetchUser,
  usePrefetchPost,
  usePrefetchCommunity,
  usePrefetchNextPage,
} from '@/lib/hooks/use-prefetch'
```

## Usage Examples

### 1. Prefetch on Link Hover

```typescript
import Link from 'next/link'
import { usePrefetchPost } from '@/lib/hooks/use-prefetch'

function PostLink({ postId, children }) {
  const prefetchProps = usePrefetchPost(postId)

  return (
    <Link href={`/posts/${postId}`} {...prefetchProps}>
      {children}
    </Link>
  )
}
```

**Result:** Post data loads instantly when link is clicked.

### 2. Prefetch on User Profile Hover

```typescript
import { usePrefetchUser } from '@/lib/hooks/use-prefetch'

function UserAvatar({ userId, username }) {
  const prefetchProps = usePrefetchUser(userId)

  return (
    <Link href={`/users/${userId}`} {...prefetchProps}>
      <img src={`/avatars/${userId}.jpg`} alt={username} />
    </Link>
  )
}
```

### 3. Prefetch When Element Becomes Visible

```typescript
import { usePrefetchOnVisible } from '@/lib/hooks/use-prefetch'
import { prefetchPost } from '@/lib/utils/prefetch'

function PostCard({ postId }) {
  const queryClient = useQueryClient()
  const cardRef = usePrefetchOnVisible(
    () => prefetchPost(queryClient, postId)
  )

  return (
    <div ref={cardRef}>
      {/* Post content */}
    </div>
  )
}
```

**Result:** Data loads when post card scrolls into view.

### 4. Prefetch Next Page on Scroll

```typescript
import { usePrefetchNextPage } from '@/lib/hooks/use-prefetch'

function InfiniteFeed({ currentPage, onLoadMore }) {
  const queryClient = useQueryClient()

  usePrefetchNextPage(
    async () => {
      await prefetchFeed(queryClient, currentPage + 1)
      onLoadMore()
    },
    0.8 // Trigger at 80% scroll
  )

  return (
    <div>
      {/* Feed items */}
    </div>
  )
}
```

### 5. Prefetch on Focus (Keyboard Navigation)

```typescript
import { usePrefetchOnFocus } from '@/lib/hooks/use-prefetch'

function NavigationLink({ href, prefetchFn, children }) {
  const prefetchProps = usePrefetchOnFocus(prefetchFn)

  return (
    <Link href={href} {...prefetchProps}>
      {children}
    </Link>
  )
}
```

**Result:** Data loads when user tabs to the link.

### 6. Prefetch Search Results

```typescript
import { prefetchSearchResults } from '@/lib/utils/prefetch'
import { useDebounce } from '@/lib/hooks/use-debounce'

function SearchBar() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      prefetchSearchResults(queryClient, debouncedQuery)
    }
  }, [debouncedQuery, queryClient])

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />
}
```

**Result:** Search results appear instantly when user submits.

### 7. Smart Prefetching Based on Route

```typescript
import { smartPrefetch } from '@/lib/utils/prefetch'
import { usePathname } from 'next/navigation'

function SmartPrefetchProvider() {
  const pathname = usePathname()
  const queryClient = useQueryClient()

  useEffect(() => {
    smartPrefetch(queryClient, {
      currentRoute: pathname,
    })
  }, [pathname, queryClient])

  return null
}
```

## Advanced Patterns

### Conditional Prefetching

```typescript
const prefetchProps = usePrefetchOnHover(
  useCallback(async () => {
    // Only prefetch if user is logged in
    if (user) {
      await prefetchUserPosts(queryClient, user.id)
    }
  }, [user, queryClient])
)
```

### Batched Prefetching

```typescript
async function prefetchMultiple(queryClient: QueryClient, ids: string[]) {
  await Promise.all(ids.map((id) => prefetchPost(queryClient, id)))
}
```

### Prefetch with Priority

```typescript
// High priority - prefetch immediately
await prefetchUserProfile(queryClient, userId)

// Low priority - prefetch after delay
setTimeout(() => {
  prefetchUserPosts(queryClient, userId)
}, 1000)
```

### Cancel Prefetching

```typescript
function useCancellablePrefetch(prefetchFn: () => Promise<void>) {
  const abortControllerRef = useRef<AbortController>()

  const handleHover = () => {
    abortControllerRef.current = new AbortController()
    prefetchFn()
  }

  const handleLeave = () => {
    abortControllerRef.current?.abort()
  }

  return { onMouseEnter: handleHover, onMouseLeave: handleLeave }
}
```

## Performance Considerations

### 1. Prefetch Timing

```typescript
// ❌ Bad - Prefetch too early
useEffect(() => {
  prefetchEverything() // Wasted bandwidth
}, [])

// ✅ Good - Prefetch on demand
<Link {...usePrefetchOnHover(() => prefetchPost(...))} />
```

### 2. Stale Time

```typescript
// Set appropriate stale time based on data volatility
await queryClient.prefetchQuery({
  queryKey: ['user', userId],
  queryFn: fetchUser,
  staleTime: 5 * 60 * 1000, // 5 minutes for user data
})

await queryClient.prefetchQuery({
  queryKey: ['notifications'],
  queryFn: fetchNotifications,
  staleTime: 30 * 1000, // 30 seconds for notifications
})
```

### 3. Network Conditions

```typescript
function shouldPrefetch() {
  // Check connection quality
  const connection = (navigator as any).connection

  if (!connection) return true

  // Don't prefetch on slow connections
  if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
    return false
  }

  // Don't prefetch if user has data saver on
  if (connection.saveData) {
    return false
  }

  return true
}

const prefetchProps = usePrefetchOnHover(
  useCallback(async () => {
    if (shouldPrefetch()) {
      await prefetchPost(queryClient, postId)
    }
  }, [postId, queryClient])
)
```

### 4. Prefetch Budget

```typescript
// Limit number of concurrent prefetches
const prefetchQueue = new PQueue({ concurrency: 3 })

async function queuedPrefetch(fn: () => Promise<void>) {
  await prefetchQueue.add(fn)
}
```

## Best Practices

### 1. Prefetch on Hover, Not on Render

```typescript
// ❌ Bad
useEffect(() => {
  prefetchAllPosts() // Prefetches on render
}, [])

// ✅ Good
<Link {...usePrefetchOnHover(() => prefetchPost(postId))} />
```

### 2. Use Stale-While-Revalidate

```typescript
await queryClient.prefetchQuery({
  queryKey: ['post', postId],
  queryFn: fetchPost,
  staleTime: 5 * 60 * 1000, // Use cached data for 5 minutes
})
```

### 3. Prefetch Critical Path First

```typescript
// Prefetch in order of importance
await prefetchUserProfile(queryClient, userId) // Critical
await prefetchNotifications(queryClient) // Important
await prefetchUserPosts(queryClient, userId) // Nice to have
```

### 4. Avoid Prefetching Authenticated Data Unnecessarily

```typescript
if (user) {
  await prefetchUserPosts(queryClient, user.id)
}
```

### 5. Monitor Prefetch Performance

```typescript
performance.mark('prefetch-start')
await prefetchPost(queryClient, postId)
performance.mark('prefetch-end')

performance.measure('prefetch', 'prefetch-start', 'prefetch-end')
```

## Testing

### Unit Tests

```typescript
import { renderHook } from '@testing-library/react'
import { usePrefetchPost } from '@/lib/hooks/use-prefetch'

it('should prefetch on hover', async () => {
  const { result } = renderHook(() => usePrefetchPost('1'))

  // Simulate hover
  result.current.onMouseEnter()

  // Wait for prefetch
  await waitFor(() => {
    expect(queryClient.getQueryData(['post', '1'])).toBeDefined()
  })
})
```

### Integration Tests

```typescript
it('should show post instantly after hover', async () => {
  const { user } = render(<PostList />)

  // Hover over link
  await user.hover(screen.getByText('View Post'))

  // Wait for prefetch
  await waitFor(() => {
    expect(queryClient.getQueryData(['post', '1'])).toBeDefined()
  })

  // Click link
  await user.click(screen.getByText('View Post'))

  // Post should appear instantly (no loading spinner)
  expect(screen.getByText('Post Title')).toBeInTheDocument()
  expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
})
```

## Debugging

### Enable Prefetch Logging

```typescript
// lib/utils/prefetch.ts
export async function prefetchPost(queryClient: QueryClient, postId: string) {
  console.log('[Prefetch] Starting:', 'post', postId)

  try {
    await queryClient.prefetchQuery({...})
    console.log('[Prefetch] Success:', 'post', postId)
  } catch (error) {
    console.error('[Prefetch] Error:', 'post', postId, error)
  }
}
```

### React Query DevTools

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

## Metrics

Track prefetch performance:

```typescript
import { reportCustomMetric } from '@/lib/monitoring/web-vitals'

async function prefetchPost(queryClient: QueryClient, postId: string) {
  const startTime = performance.now()

  await queryClient.prefetchQuery({...})

  const duration = performance.now() - startTime
  reportCustomMetric('prefetch_post', duration, { postId })
}
```

## Resources

- [React Query Prefetching](https://tanstack.com/query/latest/docs/react/guides/prefetching)
- [Prefetching Strategies](https://web.dev/link-prefetch/)
- [Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API)

## Audit Trail

- **2025-11-14**: Implemented query prefetching system
- **Utilities Created**: User, post, community, event, artist, feed prefetch
- **Hooks Created**: Hover, focus, visible, next page prefetch hooks
- **Features**: Network-aware, priority-based, cancellable
- **Documentation**: Comprehensive prefetching guide created
