# Optimistic Updates Guide

## Overview

Optimistic updates improve perceived performance by updating the UI immediately before waiting for server confirmation. This creates a snappy, responsive user experience even on slow connections.

## Available Hooks

### 1. `useOptimisticVote`

Handles upvote/downvote actions on posts, comments, and polls.

```typescript
import { useOptimisticVote } from '@/lib/hooks'

function VoteButtons({ contentId, contentType, upvotes, downvotes }) {
  const voteMutation = useOptimisticVote()

  const handleVote = (voteType: 'upvote' | 'downvote' | null) => {
    voteMutation.mutate({
      contentId,
      contentType, // 'post' | 'comment' | 'poll'
      voteType,
    })
  }

  return (
    <div>
      <button onClick={() => handleVote('upvote')}>
        ↑ {upvotes}
      </button>
      <button onClick={() => handleVote('downvote')}>
        ↓ {downvotes}
      </button>
    </div>
  )
}
```

### 2. `useOptimisticLike`

Handles like/unlike actions on posts, comments, and events.

```typescript
import { useOptimisticLike } from '@/lib/hooks'

function LikeButton({ contentId, contentType, likeCount, isLiked }) {
  const likeMutation = useOptimisticLike()

  const handleLike = () => {
    likeMutation.mutate({
      contentId,
      contentType, // 'post' | 'comment' | 'event'
      isLiked, // Current state
    })
  }

  return (
    <button onClick={handleLike}>
      {isLiked ? '❤️' : '🤍'} {likeCount}
    </button>
  )
}
```

### 3. `useOptimisticComment`

Handles adding new comments with instant feedback.

```typescript
import { useOptimisticComment } from '@/lib/hooks'

function CommentForm({ postId, parentId }) {
  const [text, setText] = useState('')
  const commentMutation = useOptimisticComment()

  const handleSubmit = () => {
    commentMutation.mutate({
      postId,
      text,
      parentId, // Optional, for replies
    })
    setText('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <button type="submit">Comment</button>
    </form>
  )
}
```

### 4. `useOptimisticFollow`

Handles follow/unfollow actions for users, artists, and communities.

```typescript
import { useOptimisticFollow } from '@/lib/hooks'

function FollowButton({ targetId, targetType, followerCount, isFollowing }) {
  const followMutation = useOptimisticFollow()

  const handleFollow = () => {
    followMutation.mutate({
      targetId,
      targetType, // 'user' | 'artist' | 'community'
      isFollowing, // Current state
    })
  }

  return (
    <button onClick={handleFollow}>
      {isFollowing ? 'Unfollow' : 'Follow'} ({followerCount})
    </button>
  )
}
```

## How It Works

### 1. Optimistic Update Flow

```
User Action → Optimistic UI Update → Server Request → Success/Error
                                            ↓
                                      Confirm or Rollback
```

**Steps:**

1. User clicks button (e.g., upvote)
2. UI updates immediately (upvote count +1)
3. Request sent to server
4. **On success:** Keep the optimistic update, refetch to ensure consistency
5. **On error:** Rollback to previous state, show error message

### 2. React Query Integration

All hooks use React Query's mutation features:

```typescript
useMutation({
  mutationFn: async (params) => {
    // API call
  },
  onMutate: async (params) => {
    // Cancel outgoing queries
    // Snapshot previous state
    // Apply optimistic update
    // Return context for rollback
  },
  onError: (error, variables, context) => {
    // Rollback optimistic update
    // Show error message
  },
  onSuccess: (data) => {
    // Refetch to ensure consistency
    // Show success message
  },
})
```

## Best Practices

### 1. Always Snapshot Previous State

```typescript
onMutate: async (params) => {
  const previousData = queryClient.getQueryData(queryKey)
  // ... optimistic update
  return { previousData } // For rollback
}
```

### 2. Cancel Outgoing Queries

```typescript
onMutate: async (params) => {
  await queryClient.cancelQueries({ queryKey })
  // ... rest of optimistic update
}
```

### 3. Always Rollback on Error

```typescript
onError: (error, variables, context) => {
  if (context?.previousData) {
    queryClient.setQueryData(queryKey, context.previousData)
  }
}
```

### 4. Refetch After Success

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey })
}
```

### 5. Show User Feedback

```typescript
onError: (error) => {
  toast({
    title: 'Error',
    description: error.message,
    variant: 'destructive',
  })
}

onSuccess: () => {
  toast({
    title: 'Success',
    description: 'Action completed',
  })
}
```

## Advanced Patterns

### Optimistic Updates with Related Data

When an action affects multiple queries:

```typescript
onMutate: async ({ postId, commentText }) => {
  // Update post comment count
  queryClient.setQueryData(['post', postId], (old) => ({
    ...old,
    commentCount: old.commentCount + 1,
  }))

  // Add optimistic comment to comments list
  queryClient.setQueryData(['post', postId, 'comments'], (old) => [optimisticComment, ...old])
}
```

### Debouncing Optimistic Updates

For rapid actions (e.g., typing, dragging):

```typescript
const debouncedMutation = useMemo(
  () => debounce((params) => mutation.mutate(params), 500),
  [mutation]
)
```

### Optimistic Updates with Pagination

Handle paginated data correctly:

```typescript
queryClient.setQueryData(['posts', { page: 1 }], (old) => {
  return {
    ...old,
    items: [newPost, ...old.items],
    totalCount: old.totalCount + 1,
  }
})

// Invalidate other pages
queryClient.invalidateQueries({
  queryKey: ['posts'],
  exact: false,
})
```

## Error Handling

### Network Errors

```typescript
onError: (error) => {
  if (error.message.includes('network')) {
    toast({
      title: 'Network Error',
      description: 'Please check your connection and try again',
    })
  }
}
```

### Validation Errors

```typescript
onError: (error) => {
  if (error.message.includes('validation')) {
    // Show field-specific errors
    setFieldError('comment', error.message)
  }
}
```

### Race Conditions

React Query handles race conditions automatically by canceling outgoing queries in `onMutate`.

## Performance Considerations

### 1. Reduce Payload Size

Only send necessary data:

```typescript
// ❌ Bad - Sending entire object
mutate({ post: entirePostObject })

// ✅ Good - Sending only ID
mutate({ postId: post.id })
```

### 2. Batch Updates

Combine multiple actions:

```typescript
// ❌ Bad - Multiple mutations
voteMutation.mutate({ postId: 1 })
voteMutation.mutate({ postId: 2 })
voteMutation.mutate({ postId: 3 })

// ✅ Good - Single batch mutation
batchVoteMutation.mutate([{ postId: 1 }, { postId: 2 }, { postId: 3 }])
```

### 3. Optimize Refetch

Don't refetch unnecessarily:

```typescript
onSuccess: (data) => {
  // ❌ Bad - Refetch everything
  queryClient.invalidateQueries()

  // ✅ Good - Refetch only affected queries
  queryClient.invalidateQueries({ queryKey: ['post', postId] })
}
```

## Testing

### Unit Tests

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useOptimisticVote } from '@/lib/hooks'

it('should optimistically update vote count', async () => {
  const { result } = renderHook(() => useOptimisticVote())

  // Mock query client data
  queryClient.setQueryData(['post', '1', 'votes'], {
    upvotes: 10,
    downvotes: 2,
    userVote: null,
  })

  // Trigger mutation
  result.current.mutate({
    contentId: '1',
    contentType: 'post',
    voteType: 'upvote',
  })

  // Check optimistic update
  await waitFor(() => {
    const data = queryClient.getQueryData(['post', '1', 'votes'])
    expect(data.upvotes).toBe(11)
    expect(data.userVote).toBe('upvote')
  })
})
```

### Integration Tests

```typescript
it('should rollback on error', async () => {
  // Mock API to fail
  server.use(
    http.post('/api/posts/:id/vote', () => {
      return HttpResponse.error()
    })
  )

  const { user } = render(<VoteButton />)

  // Click upvote
  await user.click(screen.getByText('↑'))

  // Check rollback happened
  await waitFor(() => {
    expect(screen.getByText('↑ 10')).toBeInTheDocument()
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })
})
```

## Debugging

### Enable Debug Mode

```typescript
import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Log all queries
      onError: (error) => console.error('Query error:', error),
      onSuccess: (data) => console.log('Query success:', data),
    },
    mutations: {
      // Log all mutations
      onMutate: (variables) => console.log('Mutation start:', variables),
      onError: (error) => console.error('Mutation error:', error),
      onSuccess: (data) => console.log('Mutation success:', data),
    },
  },
})
```

### React Query DevTools

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

## Migration Guide

### From Regular Mutations

**Before:**

```typescript
const handleVote = async () => {
  const response = await fetch('/api/vote', { method: 'POST' })
  if (response.ok) {
    // Refetch all data
    refetchPost()
    refetchVotes()
  }
}
```

**After:**

```typescript
const voteMutation = useOptimisticVote()

const handleVote = () => {
  voteMutation.mutate({ contentId, contentType, voteType })
}
```

## Resources

- [React Query Optimistic Updates](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
- [Optimistic UI Patterns](https://www.smashingmagazine.com/2016/11/true-lies-of-optimistic-user-interfaces/)
- [TanStack Query Best Practices](https://tkdodo.eu/blog/practical-react-query)

## Audit Trail

- **2025-11-14**: Implemented optimistic update hooks
- **Hooks Created**: Vote, Like, Comment, Follow
- **Features**: Automatic rollback, error handling, success callbacks
- **Integration**: React Query, custom toast notifications
- **Documentation**: Comprehensive optimistic updates guide created
