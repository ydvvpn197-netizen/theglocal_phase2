# Dynamic Imports Implementation Guide

## Status

**Date:** November 14, 2025  
**Implemented:** Map and Video component exports added to `lib/utils/dynamic-imports.tsx`  
**Next Steps:** Replace direct imports with dynamic imports across the codebase

## Available Dynamic Components

### Map Components (Google Maps)

```typescript
import { DynamicEventMap, DynamicCommunityMap, DynamicArtistMap } from '@/lib/utils/dynamic-imports'
```

**Estimated Bundle Savings:** ~200KB

### Video Components

```typescript
import { DynamicVideoPlayer, DynamicVideoUpload } from '@/lib/utils/dynamic-imports'
```

**Estimated Bundle Savings:** ~80KB

### Other Heavy Components (Already Available)

- `DynamicBookingDialog`
- `DynamicBookingMessages`
- `DynamicReportDialog`
- `DynamicModerationLogTable`
- `DynamicSubscriptionForm`
- `DynamicCreateEventForm`
- `DynamicCreatePollForm`

## Implementation Steps

### 1. Find Direct Imports

Search for direct imports of heavy components:

```bash
# Find map imports
grep -r "from '@/components/maps" app/ components/

# Find video imports
grep -r "from '@/components/ui/video" app/ components/
grep -r "from '@/components/media/video" app/ components/
```

### 2. Replace Imports

**Before:**

```typescript
import EventMap from '@/components/maps/event-map'

export default function EventPage() {
  return <EventMap events={events} />
}
```

**After:**

```typescript
import { DynamicEventMap } from '@/lib/utils/dynamic-imports'

export default function EventPage() {
  return <DynamicEventMap events={events} />
}
```

### 3. Files to Update

Based on HEAVY_COMPONENTS_ANALYSIS.md, update these pages/components:

**Event Pages:**

- `app/events/[id]/page.tsx`
- `app/events/page.tsx`
- Any component rendering event maps

**Community Pages:**

- `app/communities/[slug]/page.tsx`
- `app/communities/page.tsx`
- Community discovery pages

**Artist Pages:**

- `app/artists/[id]/page.tsx`
- `app/artists/page.tsx`
- Artist discovery pages

**Video Usage:**

- Post detail pages with video
- Artist portfolio pages
- Post creation forms
- Media galleries

## Expected Performance Impact

### Bundle Size Reduction

| Component Type   | Size   | Frequency | Total Savings |
| ---------------- | ------ | --------- | ------------- |
| Map Components   | ~200KB | 3 types   | ~200KB        |
| Video Components | ~80KB  | 2 types   | ~80KB         |
| **Total**        |        |           | **~280KB**    |

### Performance Metrics

- **Initial Load Time:** -0.5-1.0 seconds (3G network)
- **Time to Interactive:** -0.3-0.5 seconds
- **First Contentful Paint:** Improved
- **Lighthouse Score:** +5-10 points

## Testing Checklist

After implementing:

- [ ] Maps load correctly on event pages
- [ ] Maps load correctly on community pages
- [ ] Maps load correctly on artist pages
- [ ] Video players work in posts
- [ ] Video upload works in forms
- [ ] Loading states show properly
- [ ] No console errors
- [ ] Bundle size reduced (check `.next/static/chunks/`)

## Verification

```bash
# Before changes
npm run build
ls -lh .next/static/chunks/

# After changes
npm run build
ls -lh .next/static/chunks/

# Compare sizes - should see reduction in main chunk
```

## Notes

- All map components use `ssr: false` because they require browser APIs
- Loading states provide smooth UX during chunk loading
- Fallback components prevent app crashes if imports fail
- No visual regression - components work identically

## Future Optimizations

- [ ] Add prefetch on hover for maps
- [ ] Implement intersection observer for below-fold components
- [ ] Add dynamic imports for admin dashboard
- [ ] Consider dynamic imports for rich text editors
- [ ] Add dynamic imports for chart libraries (if any)
