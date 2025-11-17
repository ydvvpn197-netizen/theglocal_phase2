# Error Boundaries Guide

## Overview

Error boundaries are React components that catch JavaScript errors in their child component tree, log those errors, and display a fallback UI instead of crashing the entire application. Theglocal implements feature-level error boundaries to provide graceful error handling and recovery.

## Available Error Boundaries

### 1. FeatureErrorBoundary (Generic)

Base error boundary that can be used for any feature.

```typescript
import { FeatureErrorBoundary } from '@/components/error-boundaries'

<FeatureErrorBoundary featureName="MyFeature">
  <MyComponent />
</FeatureErrorBoundary>
```

### 2. PostsErrorBoundary

Specialized error boundary for posts/feed features.

```typescript
import { PostsErrorBoundary } from '@/components/error-boundaries'

<PostsErrorBoundary>
  <FeedComponent />
</PostsErrorBoundary>
```

### 3. MessagingErrorBoundary

Specialized error boundary for messaging/conversations.

```typescript
import { MessagingErrorBoundary } from '@/components/error-boundaries'

<MessagingErrorBoundary>
  <ConversationList />
</MessagingErrorBoundary>
```

### 4. MapsErrorBoundary

Specialized error boundary for map components.

```typescript
import { MapsErrorBoundary } from '@/components/error-boundaries'

<MapsErrorBoundary showFallbackList={true} fallbackContent={<ListFallback />}>
  <EventMap />
</MapsErrorBoundary>
```

### 5. MediaErrorBoundary

Specialized error boundary for media (images, videos).

```typescript
import { MediaErrorBoundary } from '@/components/error-boundaries'

<MediaErrorBoundary mediaType="image">
  <ImageGallery />
</MediaErrorBoundary>
```

## Usage Examples

### Wrapping a Page

```typescript
// app/feed/page.tsx
import { PostsErrorBoundary } from '@/components/error-boundaries'

export default function FeedPage() {
  return (
    <PostsErrorBoundary>
      <Feed />
      <Sidebar />
    </PostsErrorBoundary>
  )
}
```

### Wrapping Specific Components

```typescript
// app/messages/page.tsx
import { MessagingErrorBoundary } from '@/components/error-boundaries'

export default function MessagesPage() {
  return (
    <div>
      <Header />
      <MessagingErrorBoundary>
        <ConversationList />
        <MessageThread />
      </MessagingErrorBoundary>
    </div>
  )
}
```

### Multiple Error Boundaries

```typescript
// app/events/page.tsx
import { MapsErrorBoundary, PostsErrorBoundary } from '@/components/error-boundaries'

export default function EventsPage() {
  return (
    <div>
      {/* Separate error boundaries for different features */}
      <MapsErrorBoundary>
        <EventMap />
      </MapsErrorBoundary>

      <PostsErrorBoundary>
        <EventFeed />
      </PostsErrorBoundary>
    </div>
  )
}
```

### Custom Error Handling

```typescript
import { FeatureErrorBoundary } from '@/components/error-boundaries'

<FeatureErrorBoundary
  featureName="CustomFeature"
  onError={(error, errorInfo) => {
    // Send to analytics
    trackError('custom_feature_error', {
      error: error.message,
      stack: errorInfo.componentStack,
    })
  }}
  fallback={
    <div>
      <h2>Oops! Something went wrong</h2>
      <button onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  }
>
  <MyComponent />
</FeatureErrorBoundary>
```

## Error Boundary Props

### FeatureErrorBoundary

| Prop          | Type                         | Required | Description                       |
| ------------- | ---------------------------- | -------- | --------------------------------- |
| `children`    | `ReactNode`                  | Yes      | Components to wrap                |
| `featureName` | `string`                     | Yes      | Name of the feature (for logging) |
| `fallback`    | `ReactNode`                  | No       | Custom fallback UI                |
| `onError`     | `(error, errorInfo) => void` | No       | Custom error handler              |

### PostsErrorBoundary

| Prop       | Type              | Required | Description          |
| ---------- | ----------------- | -------- | -------------------- |
| `children` | `ReactNode`       | Yes      | Components to wrap   |
| `onError`  | `(error) => void` | No       | Custom error handler |

### MessagingErrorBoundary

| Prop       | Type              | Required | Description          |
| ---------- | ----------------- | -------- | -------------------- |
| `children` | `ReactNode`       | Yes      | Components to wrap   |
| `onError`  | `(error) => void` | No       | Custom error handler |

### MapsErrorBoundary

| Prop               | Type              | Required | Description                 |
| ------------------ | ----------------- | -------- | --------------------------- |
| `children`         | `ReactNode`       | Yes      | Components to wrap          |
| `onError`          | `(error) => void` | No       | Custom error handler        |
| `showFallbackList` | `boolean`         | No       | Show list as fallback       |
| `fallbackContent`  | `ReactNode`       | No       | Content to show in fallback |

### MediaErrorBoundary

| Prop        | Type                              | Required | Description          |
| ----------- | --------------------------------- | -------- | -------------------- |
| `children`  | `ReactNode`                       | Yes      | Components to wrap   |
| `onError`   | `(error) => void`                 | No       | Custom error handler |
| `mediaType` | `'image' \| 'video' \| 'general'` | No       | Type of media        |

## Error Logging

All error boundaries automatically log errors to:

1. **Console** (development mode)
2. **Logger service** (`lib/utils/logger.ts`)
3. **Analytics** (Google Analytics if configured)

Example log output:

```
[Posts] Error caught by error boundary:
Error: Cannot read property 'map' of undefined
  at FeedComponent (FeedComponent.tsx:45)
  at PostsErrorBoundary (posts-error-boundary.tsx:23)
```

## Best Practices

### 1. Granular Error Boundaries

Use multiple error boundaries for different features instead of one global boundary:

```typescript
// ✅ Good - Isolated error handling
<Layout>
  <PostsErrorBoundary>
    <Feed />
  </PostsErrorBoundary>

  <MessagingErrorBoundary>
    <Messages />
  </MessagingErrorBoundary>
</Layout>

// ❌ Bad - One boundary for everything
<FeatureErrorBoundary featureName="App">
  <Feed />
  <Messages />
</FeatureErrorBoundary>
```

### 2. Strategic Placement

Place error boundaries around:

- **Feature modules** (posts, messaging, maps)
- **Data-heavy components** (lists, tables)
- **Third-party integrations** (maps, media players)
- **Complex state logic** (forms, wizards)

### 3. Provide Recovery Options

Always give users a way to recover:

```typescript
<PostsErrorBoundary>
  <Feed />
</PostsErrorBoundary>

// Provides:
// - "Reload Feed" button
// - "Go Home" button
// - Error details (in development)
```

### 4. Don't Catch Everything

Error boundaries **DO NOT** catch:

- Event handlers (use try-catch)
- Asynchronous code (setTimeout, fetch)
- Server-side rendering errors
- Errors in the error boundary itself

```typescript
// ❌ This will NOT be caught by error boundary
<button onClick={() => {
  throw new Error('Click error')
}}>
  Click me
</button>

// ✅ Handle event errors explicitly
<button onClick={() => {
  try {
    // risky operation
  } catch (error) {
    handleError(error)
  }
}}>
  Click me
</button>
```

### 5. Test Error Boundaries

Test that error boundaries work:

```typescript
// __tests__/error-boundaries/posts-error-boundary.test.tsx
import { render } from '@testing-library/react'
import { PostsErrorBoundary } from '@/components/error-boundaries'

const ThrowError = () => {
  throw new Error('Test error')
}

it('should catch errors and show fallback', () => {
  const { getByText } = render(
    <PostsErrorBoundary>
      <ThrowError />
    </PostsErrorBoundary>
  )

  expect(getByText(/unable to load posts/i)).toBeInTheDocument()
  expect(getByText(/reload feed/i)).toBeInTheDocument()
})
```

## Debugging Error Boundaries

### Development Mode

In development, error boundaries show detailed error information:

- Error message
- Component stack trace
- "Try Again" and "Reload Page" buttons

### Production Mode

In production, error boundaries show user-friendly messages:

- Simple error message
- Recovery options
- No technical details

### Logging

All errors are logged with context:

```typescript
[Posts] Error caught by error boundary:
Error: Cannot read property 'map' of undefined
  Component Stack:
    at FeedItem
    at Feed
    at PostsErrorBoundary
Feature: posts
Timestamp: 2025-11-14T10:30:00.000Z
```

## Integration with Monitoring

### Google Analytics

```typescript
onError={(error) => {
  gtag('event', 'exception', {
    description: `Posts Error: ${error.message}`,
    fatal: false,
    feature: 'posts',
  })
}}
```

### Sentry

```typescript
onError={(error, errorInfo) => {
  Sentry.captureException(error, {
    contexts: {
      react: {
        componentStack: errorInfo.componentStack,
      },
    },
    tags: {
      feature: 'posts',
    },
  })
}}
```

### Custom Analytics

```typescript
onError={(error) => {
  fetch('/api/analytics/errors', {
    method: 'POST',
    body: JSON.stringify({
      error: error.message,
      feature: 'posts',
      timestamp: Date.now(),
    }),
  })
}}
```

## Common Error Scenarios

### 1. API Errors

```typescript
// Component
const { data, error } = useQuery('posts', fetchPosts)

if (error) {
  throw new Error(`Failed to fetch posts: ${error.message}`)
}

// Caught by PostsErrorBoundary
```

### 2. Null Reference Errors

```typescript
// Component
const user = useUser()
const posts = user.posts.map(...) // Error if user.posts is undefined

// Caught by error boundary
```

### 3. Map API Errors

```typescript
// Component
useEffect(() => {
  if (!window.google) {
    throw new Error('Google Maps API not loaded')
  }
}, [])

// Caught by MapsErrorBoundary
```

## Resources

- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Error Boundary Best Practices](https://kentcdodds.com/blog/use-react-error-boundary-to-handle-errors-in-react)
- [Error Handling in React](https://blog.logrocket.com/error-handling-react-error-boundary/)

## Audit Trail

- **2025-11-14**: Created feature-level error boundaries
- **Components**: Posts, Messaging, Maps, Media, Generic
- **Features**: Automatic logging, recovery options, analytics integration
- **Documentation**: Comprehensive error boundary guide created
