# Empty State Component Usage

## Overview

The `EmptyState` component provides a consistent UI for displaying empty states, no results, errors, and other scenarios where content is unavailable.

## Basic Usage

```typescript
import { EmptyState } from '@/components/ui/empty-state'
import { SearchX } from 'lucide-react'

<EmptyState
  icon={SearchX}
  title="No posts found"
  description="Try creating your first post or adjusting your filters"
  action={{
    label: "Create Post",
    onClick: () => router.push('/create'),
    variant: "default"
  }}
/>
```

## Props

| Prop          | Type                   | Required | Description                      |
| ------------- | ---------------------- | -------- | -------------------------------- |
| `icon`        | `LucideIcon`           | No       | Icon component from lucide-react |
| `title`       | `string`               | Yes      | Main heading text                |
| `description` | `string`               | No       | Supporting description text      |
| `action`      | `object`               | No       | Button configuration             |
| `className`   | `string`               | No       | Additional CSS classes           |
| `size`        | `'sm' \| 'md' \| 'lg'` | No       | Component size (default: 'md')   |

### Action Object

```typescript
{
  label: string        // Button text
  onClick: () => void  // Click handler
  variant?: 'default' | 'outline' | 'ghost'  // Button style
}
```

## Pre-configured Variants

For common scenarios, use pre-configured variants:

### No Results

```typescript
import { EmptyStateVariants } from '@/components/ui/empty-state'

<EmptyStateVariants.NoResults
  action={{
    label: "Clear Filters",
    onClick: () => clearFilters()
  }}
/>
```

### No Data

```typescript
<EmptyStateVariants.NoData
  action={{
    label: "Get Started",
    onClick: () => openCreateDialog()
  }}
/>
```

### Access Denied

```typescript
<EmptyStateVariants.AccessDenied
  action={{
    label: "Go Back",
    onClick: () => router.back()
  }}
/>
```

### Error

```typescript
<EmptyStateVariants.Error
  action={{
    label: "Try Again",
    onClick: () => refetch()
  }}
/>
```

### Offline

```typescript
<EmptyStateVariants.Offline
  action={{
    label: "Retry",
    onClick: () => window.location.reload()
  }}
/>
```

## Size Variants

### Small

```typescript
<EmptyState
  size="sm"
  title="No items"
  description="Short description"
/>
```

### Medium (Default)

```typescript
<EmptyState
  size="md"
  title="No items found"
  description="Medium sized empty state with more details"
/>
```

### Large

```typescript
<EmptyState
  size="lg"
  title="Nothing here yet"
  description="Large empty state for full-page scenarios with detailed explanation"
/>
```

## Common Use Cases

### Feed with No Posts

```typescript
import { FileText } from 'lucide-react'

<EmptyState
  icon={FileText}
  title="No posts yet"
  description="Be the first to share something with your community"
  action={{
    label: "Create Post",
    onClick: () => setShowCreateDialog(true)
  }}
/>
```

### Search Results

```typescript
import { SearchX } from 'lucide-react'

<EmptyState
  icon={SearchX}
  title={`No results for "${searchQuery}"`}
  description="Try different keywords or check your spelling"
  action={{
    label: "Clear Search",
    onClick: () => setSearchQuery(''),
    variant: "outline"
  }}
/>
```

### Empty Community

```typescript
import { Users } from 'lucide-react'

<EmptyState
  icon={Users}
  title="No members yet"
  description="Invite people to join your community"
  action={{
    label: "Invite Members",
    onClick: () => openInviteDialog()
  }}
/>
```

### Loading Failed

```typescript
import { AlertCircle } from 'lucide-react'

<EmptyState
  icon={AlertCircle}
  title="Failed to load content"
  description={error.message}
  action={{
    label: "Retry",
    onClick: () => refetch()
  }}
/>
```

### No Notifications

```typescript
import { Bell } from 'lucide-react'

<EmptyState
  size="sm"
  icon={Bell}
  title="All caught up!"
  description="You have no new notifications"
/>
```

## Integration with React Query

```typescript
import { useQuery } from '@tanstack/react-query'
import { EmptyState } from '@/components/ui/empty-state'
import { Loader2, AlertCircle, FileText } from 'lucide-react'

function PostsFeed() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Failed to load posts"
        description={error.message}
        action={{
          label: "Try Again",
          onClick: () => refetch()
        }}
      />
    )
  }

  if (!data?.length) {
    return (
      <EmptyState
        icon={FileText}
        title="No posts yet"
        description="Be the first to create a post"
        action={{
          label: "Create Post",
          onClick: () => router.push('/create')
        }}
      />
    )
  }

  return <PostList posts={data} />
}
```

## Customization

### Custom Styling

```typescript
<EmptyState
  title="Custom styled empty state"
  className="bg-muted/50 rounded-lg border-2 border-dashed"
/>
```

### Without Icon

```typescript
<EmptyState
  title="Simple empty state"
  description="No icon, just text"
/>
```

### Without Action

```typescript
<EmptyState
  icon={Check}
  title="All done!"
  description="You've completed all tasks"
/>
```

## Accessibility

The component includes:

- Semantic HTML structure
- Proper heading hierarchy
- Keyboard navigation for buttons
- Screen reader friendly text

## Best Practices

1. **Use descriptive titles** - Make it clear what's missing
2. **Provide context** - Explain why the state is empty
3. **Offer actions** - Give users a way forward when possible
4. **Choose appropriate icons** - Use icons that match the context
5. **Match tone** - Use encouraging language for user actions, neutral for system states
6. **Consider placement** - Center empty states within their container
7. **Test edge cases** - Handle very long titles/descriptions gracefully

## Migration Guide

Replace existing empty state implementations:

**Before:**

```typescript
{posts.length === 0 && (
  <div className="text-center py-12">
    <p className="text-muted-foreground">No posts found</p>
    <Button onClick={onCreate}>Create Post</Button>
  </div>
)}
```

**After:**

```typescript
{posts.length === 0 && (
  <EmptyState
    title="No posts found"
    action={{
      label: "Create Post",
      onClick: onCreate
    }}
  />
)}
```
