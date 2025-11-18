# Performance Optimization Guide

## Overview

This guide covers strategies for optimizing heavy components in Theglocal, including memoization, virtualization, code splitting, and other performance techniques.

## Quick Reference

| Technique             | Use Case                          | Performance Gain | Complexity |
| --------------------- | --------------------------------- | ---------------- | ---------- |
| React.memo            | Components with expensive renders | 30-50%           | Low        |
| useMemo/useCallback   | Expensive computations/functions  | 20-40%           | Low        |
| Virtual Lists         | Long lists (>100 items)           | 70-90%           | Medium     |
| Code Splitting        | Large bundles (>500KB)            | 40-60%           | Medium     |
| Image Lazy Loading    | Many images                       | 50-80%           | Low        |
| Map Clustering        | Many markers (>100)               | 60-80%           | High       |
| Debouncing/Throttling | High-frequency events             | 30-50%           | Low        |

## 1. Component Memoization

### When to Use

- Component renders frequently with same props
- Parent re-renders but child doesn't need to
- Expensive rendering logic (>16ms)

### Basic Memoization

```tsx
import { memo } from 'react'

// Before: Re-renders on every parent update
function PostCard({ post }: { post: Post }) {
  return <Card>{/* ... */}</Card>
}

// After: Only re-renders when post changes
export const PostCard = memo(function PostCard({ post }: { post: Post }) {
  return <Card>{/* ... */}</Card>
})
```

### Deep Comparison Memoization

```tsx
import { withMemo } from '@/lib/utils/performance-optimizations'

// For complex props (objects, arrays)
const ComplexComponent = withMemo(function ComplexComponent({ data, filters, config }) {
  return <div>{/* ... */}</div>
}, 'ComplexComponent')
```

### Memoize Expensive Computations

```tsx
import { useMemo } from 'react'

function PostFeed({ posts }: { posts: Post[] }) {
  // ❌ Bad: Recalculates on every render
  const sortedPosts = posts.sort((a, b) => b.votes - a.votes)

  // ✅ Good: Only recalculates when posts change
  const sortedPosts = useMemo(() => posts.sort((a, b) => b.votes - a.votes), [posts])

  return <div>{/* ... */}</div>
}
```

### Memoize Callbacks

```tsx
import { useCallback } from 'react'

function PostCard({ post }: { post: Post }) {
  // ❌ Bad: New function on every render
  const handleLike = () => {
    likePost(post.id)
  }

  // ✅ Good: Same function reference
  const handleLike = useCallback(() => {
    likePost(post.id)
  }, [post.id])

  return <button onClick={handleLike}>Like</button>
}
```

## 2. Virtual Lists (Windowing)

### When to Use

- Lists with 100+ items
- Feed components
- Message threads
- Search results

### Implementation

```tsx
import { useVirtualList } from '@/lib/utils/performance-optimizations'

function PostFeed({ posts }: { posts: Post[] }) {
  const { visibleItems, totalHeight, handleScroll } = useVirtualList(posts, {
    itemHeight: 200, // Height of each post card
    containerHeight: 800, // Height of scroll container
    overscan: 5, // Render 5 extra items for smooth scrolling
  })

  return (
    <div style={{ height: 800, overflow: 'auto' }} onScroll={handleScroll}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, offsetY }) => (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              top: offsetY,
              width: '100%',
              height: 200,
            }}
          >
            <PostCard post={item} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Using react-window (Recommended for Complex Lists)

```bash
npm install react-window
```

```tsx
import { FixedSizeList } from 'react-window'

function PostFeed({ posts }: { posts: Post[] }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <PostCard post={posts[index]} />
    </div>
  )

  return (
    <FixedSizeList height={800} itemCount={posts.length} itemSize={200} width="100%">
      {Row}
    </FixedSizeList>
  )
}
```

## 3. Code Splitting & Lazy Loading

### When to Use

- Large components not needed on initial load
- Admin panels
- Maps
- Video players
- Charts

### Dynamic Imports (Already Implemented)

```tsx
import { DynamicEventMap, DynamicVideoPlayer } from '@/lib/utils/dynamic-imports'

function EventPage() {
  return (
    <div>
      <h1>Event Details</h1>
      {/* Map loads only when component mounts */}
      <DynamicEventMap event={event} />
    </div>
  )
}
```

### Route-Based Code Splitting

```tsx
// app/admin/page.tsx
import dynamic from 'next/dynamic'

const AdminDashboard = dynamic(() => import('@/components/admin/dashboard'), {
  loading: () => <Loader />,
  ssr: false,
})

export default function AdminPage() {
  return <AdminDashboard />
}
```

## 4. Image Optimization

### Next.js Image Component

```tsx
import Image from 'next/image'

function PostCard({ post }: { post: Post }) {
  return (
    <Card>
      {/* ✅ Automatic optimization, lazy loading, placeholder */}
      <Image
        src={post.imageUrl}
        alt={post.title}
        width={600}
        height={400}
        placeholder="blur"
        blurDataURL={post.blurDataURL}
        loading="lazy"
      />
    </Card>
  )
}
```

### Custom Lazy Image

```tsx
import { LazyImage } from '@/lib/utils/performance-optimizations'

function Gallery({ images }: { images: string[] }) {
  return (
    <div>
      {images.map((src) => (
        <LazyImage key={src} src={src} alt="Gallery image" blurDataURL="/placeholder.jpg" />
      ))}
    </div>
  )
}
```

## 5. Map Optimization

### Marker Clustering

```tsx
import { useMapClustering } from '@/lib/utils/performance-optimizations'
import { GoogleMap, Marker, MarkerClusterer } from '@react-google-maps/api'

function EventMap({ events }: { events: Event[] }) {
  const [bounds, setBounds] = useState<Bounds | null>(null)

  const clusteredEvents = useMapClustering(events, bounds, 0.01)

  return (
    <GoogleMap
      onBoundsChanged={(map) => {
        const newBounds = map.getBounds()
        setBounds({
          north: newBounds.getNorthEast().lat(),
          south: newBounds.getSouthWest().lat(),
          east: newBounds.getNorthEast().lng(),
          west: newBounds.getSouthWest().lng(),
        })
      }}
    >
      <MarkerClusterer>
        {(clusterer) =>
          clusteredEvents.map((item) =>
            'count' in item ? (
              <Marker
                key={`cluster-${item.lat}-${item.lng}`}
                position={{ lat: item.lat, lng: item.lng }}
                label={item.count.toString()}
                clusterer={clusterer}
              />
            ) : (
              <Marker
                key={item.id}
                position={{ lat: item.lat, lng: item.lng }}
                clusterer={clusterer}
              />
            )
          )
        }
      </MarkerClusterer>
    </GoogleMap>
  )
}
```

## 6. Debouncing & Throttling

### Search Input Debouncing

```tsx
import { useDebounce } from '@/lib/utils/performance-optimizations'

function SearchBar() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  // Only triggers after 300ms of no typing
  useEffect(() => {
    if (debouncedQuery) {
      searchPosts(debouncedQuery)
    }
  }, [debouncedQuery])

  return (
    <input
      type="search"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search..."
    />
  )
}
```

### Scroll Event Throttling

```tsx
import { useThrottle } from '@/lib/utils/performance-optimizations'

function InfiniteScroll() {
  const [scrollY, setScrollY] = useState(0)
  const throttledScrollY = useThrottle(scrollY, 200)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Only runs every 200ms max
  useEffect(() => {
    if (throttledScrollY > document.body.scrollHeight - 1000) {
      loadMorePosts()
    }
  }, [throttledScrollY])

  return <div>{/* ... */}</div>
}
```

## 7. Lazy Rendering Below the Fold

### LazyRender Component

```tsx
import { LazyRender } from '@/lib/utils/performance-optimizations'

function ArticlePage() {
  return (
    <div>
      {/* Always rendered */}
      <ArticleHeader />
      <ArticleContent />

      {/* Only renders when scrolled into view */}
      <LazyRender height={400} rootMargin="200px">
        <RelatedArticles />
      </LazyRender>

      <LazyRender height={600}>
        <CommentsSection />
      </LazyRender>
    </div>
  )
}
```

## 8. Batch State Updates

### Reduce Re-renders

```tsx
import { useBatchedState } from '@/lib/utils/performance-optimizations'

function FilterPanel() {
  // ❌ Bad: 3 re-renders
  const [category, setCategory] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [showImages, setShowImages] = useState(true)

  // ✅ Good: 1 re-render
  const [filters, updateFilters] = useBatchedState({
    category: '',
    sortBy: 'recent',
    showImages: true,
  })

  const handleCategoryChange = (category: string) => {
    updateFilters({ category })
  }

  return <div>{/* ... */}</div>
}
```

## 9. Performance Monitoring

### Detect Slow Renders

```tsx
import { useRenderPerformance } from '@/lib/utils/performance-optimizations'

function HeavyComponent() {
  useRenderPerformance('HeavyComponent', 16) // Warn if >16ms

  return <div>{/* ... */}</div>
}
```

### React DevTools Profiler

1. Open React DevTools
2. Go to Profiler tab
3. Click Record
4. Interact with app
5. Stop recording
6. Review flame graph for slow components

## 10. Bundle Size Optimization

### Analyze Bundle

```bash
npm run build
# Review .next/analyze output
```

### Tree Shaking

```tsx
// ❌ Bad: Imports entire library
import _ from 'lodash'

// ✅ Good: Only imports what you need
import debounce from 'lodash/debounce'
import throttle from 'lodash/throttle'
```

### Dynamic Imports for Large Libraries

```tsx
// Instead of importing at top
import Chart from 'chart.js'

// Use dynamic import
const Chart = dynamic(() => import('chart.js'), {
  ssr: false,
  loading: () => <Loader />,
})
```

## Component-Specific Optimizations

### PostFeed

```tsx
import { memo, useMemo } from 'react'
import { useVirtualList } from '@/lib/utils/performance-optimizations'

const PostCard = memo(function PostCard({ post }: { post: Post }) {
  return <Card>{/* ... */}</Card>
})

export function PostFeed({ posts }: { posts: Post[] }) {
  const sortedPosts = useMemo(() => [...posts].sort((a, b) => b.createdAt - a.createdAt), [posts])

  const { visibleItems, totalHeight, handleScroll } = useVirtualList(sortedPosts, {
    itemHeight: 250,
    containerHeight: 800,
    overscan: 3,
  })

  return (
    <div style={{ height: 800, overflow: 'auto' }} onScroll={handleScroll}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, offsetY }) => (
          <div key={item.id} style={{ position: 'absolute', top: offsetY, width: '100%' }}>
            <PostCard post={item} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### MessageThread

```tsx
import { FixedSizeList } from 'react-window'

export function MessageThread({ messages }: { messages: Message[] }) {
  const MessageRow = memo(({ index, style }) => {
    const message = messages[index]
    return (
      <div style={style}>
        <MessageBubble message={message} />
      </div>
    )
  })

  return (
    <FixedSizeList
      height={600}
      itemCount={messages.length}
      itemSize={80}
      width="100%"
      initialScrollOffset={messages.length * 80} // Scroll to bottom
    >
      {MessageRow}
    </FixedSizeList>
  )
}
```

### EventMap

```tsx
import { useMapClustering } from '@/lib/utils/performance-optimizations'

export function EventMap({ events }: { events: Event[] }) {
  const [bounds, setBounds] = useState<Bounds | null>(null)
  const [zoom, setZoom] = useState(10)

  // Only cluster when zoomed out
  const shouldCluster = zoom < 12
  const clusteredEvents = useMapClustering(events, bounds, shouldCluster ? 0.01 : 0)

  return (
    <GoogleMap onBoundsChanged={setBounds} onZoomChanged={setZoom}>
      {clusteredEvents.map((item) =>
        'count' in item ? (
          <ClusterMarker key={`cluster-${item.lat}`} {...item} />
        ) : (
          <EventMarker key={item.id} event={item} />
        )
      )}
    </GoogleMap>
  )
}
```

## Performance Checklist

### Before Deployment

- [ ] All lists >50 items use virtualization
- [ ] Heavy components use React.memo
- [ ] Expensive computations use useMemo
- [ ] Event handlers use useCallback
- [ ] Images use Next.js Image or lazy loading
- [ ] Maps use marker clustering
- [ ] Search inputs use debouncing
- [ ] Scroll events use throttling
- [ ] Large components use code splitting
- [ ] Bundle size analyzed and optimized

### Monitoring

- [ ] Web Vitals tracked (LCP < 2.5s, INP < 200ms)
- [ ] React DevTools profiler used
- [ ] Lighthouse audit score > 90
- [ ] No components taking >50ms to render
- [ ] No unnecessary re-renders

## Resources

- [React Performance Docs](https://react.dev/learn/render-and-commit)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [react-window](https://react-window.vercel.app/)
- [Web Vitals](https://web.dev/vitals/)

---

**Next Steps:**

1. Identify slow components in React DevTools
2. Apply appropriate optimization technique
3. Measure performance improvement
4. Document changes
5. Monitor in production
