# Heavy Components Analysis for Dynamic Imports

## 🎯 Objective

Identify components that significantly increase bundle size and should be dynamically imported to improve initial page load performance.

## 📊 Identified Heavy Components (8 components)

### 🗺️ **Map Components** (HIGH PRIORITY)

**Library:** Google Maps API (large external dependency)  
**Impact:** ~150-200KB

1. **`components/maps/event-map.tsx`**
   - Renders Google Maps with event markers
   - Used in: Event details pages
   - **Action:** Dynamic import with loading placeholder

2. **`components/maps/community-map.tsx`**
   - Renders Google Maps with community locations
   - Used in: Community discovery
   - **Action:** Dynamic import with loading placeholder

3. **`components/maps/artist-map.tsx`**
   - Renders Google Maps with artist locations
   - Used in: Artist discovery
   - **Action:** Dynamic import with loading placeholder

4. **`components/maps/map-marker.tsx`**
   - Map marker component
   - Used by: All map components
   - **Action:** Imported by parent maps (no separate dynamic import)

### 🎥 **Video Components** (MEDIUM PRIORITY)

**Library:** Video.js or native HTML5 video  
**Impact:** ~50-80KB

5. **`components/ui/video-player.tsx`**
   - Video playback component
   - Used in: Posts with video, artist portfolios
   - **Action:** Dynamic import with poster image placeholder

6. **`components/media/video-player.tsx`**
   - Alternative video player (may be duplicate)
   - Used in: Media galleries
   - **Action:** Review if duplicate, then dynamic import

7. **`components/ui/video-upload.tsx`**
   - Video upload interface
   - Used in: Post creation, artist profile editing
   - **Action:** Dynamic import (only shown in modal/form)

### 🖼️ **Media Components** (LOW PRIORITY)

8. **`components/media/media-error-boundary.tsx`**
   - Error boundary for media
   - Impact: Low (small component)
   - **Action:** No dynamic import needed (lightweight)

## 🚀 Implementation Plan

### Phase 1: Map Components (Highest Impact)

#### Before:

```typescript
import EventMap from '@/components/maps/event-map'

export default function EventPage() {
  return (
    <div>
      <EventMap events={events} />
    </div>
  )
}
```

#### After:

```typescript
import dynamic from 'next/dynamic'

const EventMap = dynamic(() => import('@/components/maps/event-map'), {
  loading: () => (
    <div className="h-96 w-full bg-muted animate-pulse rounded-lg flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
  ssr: false // Maps often require browser APIs
})

export default function EventPage() {
  return (
    <div>
      <EventMap events={events} />
    </div>
  )
}
```

**Files to Update:**

- [ ] Any page/component importing `components/maps/event-map.tsx`
- [ ] Any page/component importing `components/maps/community-map.tsx`
- [ ] Any page/component importing `components/maps/artist-map.tsx`

### Phase 2: Video Components

#### Pattern for Video Player:

```typescript
import dynamic from 'next/dynamic'

const VideoPlayer = dynamic(() => import('@/components/ui/video-player'), {
  loading: () => (
    <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
      <Play className="h-16 w-16 text-white opacity-50" />
    </div>
  ),
  ssr: false
})
```

**Files to Update:**

- [ ] Posts with video attachments
- [ ] Artist portfolio pages
- [ ] Any component using video player

### Phase 3: Video Upload (Modal/Form Only)

```typescript
const VideoUploadDialog = dynamic(() => import('@/components/ui/video-upload'), {
  loading: () => <Skeleton className="h-64 w-full" />
})
```

**Files to Update:**

- [ ] Create post form
- [ ] Artist profile edit form

## 📈 Expected Impact

### Bundle Size Reduction

| Component Category      | Current Size | After Dynamic Import | Savings                               |
| ----------------------- | ------------ | -------------------- | ------------------------------------- |
| **Maps (3 components)** | ~200KB       | Lazy loaded          | ~200KB                                |
| **Video Players (2)**   | ~80KB        | Lazy loaded          | ~80KB                                 |
| **Video Upload**        | ~30KB        | Lazy loaded          | ~30KB                                 |
| **Total**               | ~310KB       | -                    | **~310KB (12-15% of typical bundle)** |

### Performance Improvements

- **Initial Load Time:** -0.5-1.0 seconds (3G network)
- **Time to Interactive:** -0.3-0.5 seconds
- **First Contentful Paint:** Improved (smaller initial bundle)
- **Lighthouse Score:** +5-10 points

## 🔍 Additional Candidates (Manual Review Needed)

Run bundle analyzer to identify other large dependencies:

```bash
npm run build
# Look for chunks > 100KB in .next/static/chunks/

# If using bundle analyzer:
ANALYZE=true npm run build
```

**Potential Additional Candidates:**

- Rich text editors (if using any WYSIWYG editor)
- Chart libraries (if using Chart.js, Recharts, etc.)
- PDF viewers
- Image editors/croppers
- Date pickers with large locales

## ✅ Implementation Checklist

### Pre-Implementation

- [ ] Run `npm run build` to get baseline bundle size
- [ ] Note `.next/static/chunks/` sizes
- [ ] Create branch: `feat/dynamic-imports`

### Map Components

- [ ] Update imports in event pages
- [ ] Update imports in community pages
- [ ] Update imports in artist pages
- [ ] Add loading placeholders
- [ ] Test: Maps still render correctly
- [ ] Test: Loading states show properly

### Video Components

- [ ] Update video player imports
- [ ] Add poster image fallbacks
- [ ] Test: Videos play correctly
- [ ] Test: Upload still works

### Testing

- [ ] Visual regression testing
- [ ] Performance testing (Lighthouse)
- [ ] Mobile device testing
- [ ] Slow network simulation (3G)

### Validation

- [ ] Run `npm run build` again
- [ ] Compare bundle sizes
- [ ] Verify 10-15% reduction
- [ ] Test all affected pages
- [ ] Deploy to staging
- [ ] Monitor real user metrics

## 📝 Implementation Notes

### Best Practices

1. **Always provide meaningful loading states**
   - Use skeleton screens
   - Show relevant icons (map pin for maps, play button for video)
   - Match the dimensions of the final component

2. **Consider SSR implications**
   - Maps almost always need `ssr: false`
   - Video players may work with SSR if using native HTML5
   - Test both scenarios

3. **Handle errors gracefully**
   - Wrap dynamic imports in error boundaries
   - Provide fallback UI if import fails

4. **Prefetch on hover**
   ```typescript
   <div onMouseEnter={() => import('@/components/maps/event-map')}>
     {/* Content that triggers map */}
   </div>
   ```

### Common Pitfalls to Avoid

- ❌ Don't dynamic import tiny components (< 10KB)
- ❌ Don't forget loading states (causes layout shift)
- ❌ Don't use dynamic import for above-the-fold content
- ❌ Don't break TypeScript types (use proper typing)

## 🎯 Success Metrics

**Target Metrics:**

- Bundle size reduction: 10-15% (300KB+)
- Lighthouse performance score: +5-10 points
- Time to Interactive: -0.5 seconds
- First Contentful Paint: -0.3 seconds
- No visual regressions
- No functional regressions

**Monitoring:**

- Vercel Analytics: Watch bundle size trends
- Real User Monitoring: Check Core Web Vitals
- Sentry: Monitor for dynamic import errors

---

**Status:** ✅ Analysis Complete  
**Priority:** HIGH (maps), MEDIUM (video)  
**Estimated Time:** 2-3 hours implementation + 1 hour testing  
**Expected ROI:** Significant performance improvement for mobile users

**Next Step:** Implement Phase 1 (Map Components) first for maximum impact
