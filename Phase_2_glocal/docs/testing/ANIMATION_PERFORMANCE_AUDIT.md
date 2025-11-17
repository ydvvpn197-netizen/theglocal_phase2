# Animation Performance Audit Guide

## Overview

This guide covers auditing and optimizing animations in Theglocal for smooth 60fps performance across all devices, including low-end mobile.

## Why Animation Performance Matters

**User Experience:**

- Janky animations feel unresponsive and broken
- Smooth animations feel professional and polished
- Critical for mobile users (60-80% of traffic)

**Performance Impact:**

- Layout thrashing can drop framerate to <30fps
- Expensive animations block main thread
- Poor animations drain battery life

**Goal:** Maintain 60fps (16.67ms per frame) on all animations

## Performance Budget

| Device Class     | Target FPS | Max Frame Time |
| ---------------- | ---------- | -------------- |
| Desktop          | 60fps      | 16.67ms        |
| High-end Mobile  | 60fps      | 16.67ms        |
| Mid-range Mobile | 60fps      | 16.67ms        |
| Low-end Mobile   | 30fps min  | 33.33ms        |

## The Golden Rules

### 1. Use Transform and Opacity Only

**Why?** These properties are GPU-accelerated and don't trigger layout or paint.

```css
/* ❌ Bad: Triggers layout */
.animate {
  animation: slide 0.3s ease;
}

@keyframes slide {
  from {
    left: -100px;
  }
  to {
    left: 0;
  }
}

/* ✅ Good: GPU-accelerated */
.animate {
  animation: slide 0.3s ease;
  will-change: transform;
}

@keyframes slide {
  from {
    transform: translateX(-100px);
  }
  to {
    transform: translateX(0);
  }
}
```

### 2. Avoid Layout Thrashing

**Layout thrashing** occurs when you read and write to the DOM repeatedly in the same frame.

```typescript
// ❌ Bad: Forces layout recalculation on every iteration
elements.forEach((el) => {
  const height = el.offsetHeight // Read (triggers layout)
  el.style.height = `${height + 10}px` // Write
})

// ✅ Good: Batch reads, then batch writes
const heights = elements.map((el) => el.offsetHeight) // Batch reads
elements.forEach((el, i) => {
  el.style.height = `${heights[i] + 10}px` // Batch writes
})
```

### 3. Use `will-change` Sparingly

```css
/* ❌ Bad: Overuse can hurt performance */
* {
  will-change: transform, opacity;
}

/* ✅ Good: Only for elements that will actually animate */
.modal-enter {
  will-change: transform, opacity;
}

.modal-enter-active {
  will-change: auto; /* Remove after animation */
}
```

### 4. Debounce Scroll/Resize Events

```typescript
// ❌ Bad: Runs on every scroll event (100+ times/second)
window.addEventListener('scroll', () => {
  updateParallax()
  checkElementVisibility()
  updateProgressBar()
})

// ✅ Good: Throttled to reasonable rate
import { throttle } from 'lodash'

window.addEventListener(
  'scroll',
  throttle(() => {
    updateParallax()
    checkElementVisibility()
    updateProgressBar()
  }, 100)
) // Max 10 times/second
```

## CSS Animation Best Practices

### Composited Properties

Only these properties are GPU-accelerated:

✅ **Safe (Composite):**

- `transform` (translate, rotate, scale)
- `opacity`
- `filter` (with caveats)

❌ **Expensive (Layout/Paint):**

- `width`, `height`
- `top`, `left`, `right`, `bottom`
- `margin`, `padding`
- `border-width`
- `font-size`
- `background-position`

### Example Fixes

#### Slide Animation

```css
/* ❌ Bad */
@keyframes slideIn {
  from {
    left: -100%;
  }
  to {
    left: 0;
  }
}

/* ✅ Good */
@keyframes slideIn {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}
```

#### Fade In

```css
/* ✅ Already optimal */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```

#### Expand/Collapse

```css
/* ❌ Bad: Animates height */
.expand {
  transition: height 0.3s ease;
}

/* ✅ Good: Use transform scale */
.expand {
  transform-origin: top;
  transition: transform 0.3s ease;
}

.expand.collapsed {
  transform: scaleY(0);
}

/* ✅ Better: Use max-height for variable content */
.expand {
  max-height: 1000px;
  transition: max-height 0.3s ease;
  overflow: hidden;
}

.expand.collapsed {
  max-height: 0;
}
```

#### Scale on Hover

```css
/* ✅ Good */
.card {
  transition: transform 0.2s ease;
}

.card:hover {
  transform: scale(1.05);
}
```

## JavaScript Animation Optimization

### Use requestAnimationFrame

```typescript
// ❌ Bad: Not synced with browser repaint
setInterval(() => {
  element.style.transform = `translateX(${x}px)`
  x += 1
}, 16)

// ✅ Good: Synced with browser repaint cycle
function animate() {
  element.style.transform = `translateX(${x}px)`
  x += 1
  if (x < 100) {
    requestAnimationFrame(animate)
  }
}
requestAnimationFrame(animate)
```

### Batch DOM Operations

```typescript
// ❌ Bad: Multiple style changes trigger multiple reflows
element.style.width = '100px'
element.style.height = '100px'
element.style.transform = 'translateX(50px)'

// ✅ Good: Single style update
element.style.cssText = 'width: 100px; height: 100px; transform: translateX(50px);'

// ✅ Better: Use CSS class
element.classList.add('animated-state')
```

### Read then Write Pattern

```typescript
// ❌ Bad: Interleaved reads and writes
const height1 = el1.offsetHeight // Read (layout)
el1.style.height = '100px' // Write (layout)
const height2 = el2.offsetHeight // Read (forces layout again!)
el2.style.height = '100px' // Write (layout)

// ✅ Good: Batch all reads, then all writes
const height1 = el1.offsetHeight // Read
const height2 = el2.offsetHeight // Read
el1.style.height = '100px' // Write
el2.style.height = '100px' // Write
```

## React Animation Patterns

### Use Framer Motion

```tsx
import { motion } from 'framer-motion'

// ✅ Optimized by default
;<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  {content}
</motion.div>
```

### CSS Transitions in Components

```tsx
// ✅ Good: CSS handles animation
function Modal({ isOpen }: { isOpen: boolean }) {
  return (
    <div
      className={`modal ${isOpen ? 'modal-open' : 'modal-closed'}`}
      style={{
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        transform: isOpen ? 'scale(1)' : 'scale(0.9)',
        opacity: isOpen ? 1 : 0,
      }}
    >
      {/* content */}
    </div>
  )
}
```

### Avoid Inline Style Changes

```tsx
// ❌ Bad: Triggers re-render on every change
function AnimatedBox() {
  const [x, setX] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setX((prev) => prev + 1) // Re-render!
    }, 16)
    return () => clearInterval(id)
  }, [])

  return <div style={{ transform: `translateX(${x}px)` }} />
}

// ✅ Good: Use refs for animations
function AnimatedBox() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let x = 0
    const animate = () => {
      if (ref.current) {
        ref.current.style.transform = `translateX(${x}px)`
        x += 1
        if (x < 100) {
          requestAnimationFrame(animate)
        }
      }
    }
    requestAnimationFrame(animate)
  }, [])

  return <div ref={ref} />
}
```

## TailwindCSS Animation Optimization

### Use Transition Utilities

```tsx
// ✅ Good: Optimized transitions
<button className="transition-transform duration-200 hover:scale-105">
  Click me
</button>

// ✅ Good: Multiple properties
<div className="transition-all duration-300 ease-in-out hover:opacity-75 hover:scale-110">
  Hover me
</div>
```

### Custom Animations

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-up': 'slideUp 0.4s ease-out',
        'bounce-gentle': 'bounceGentle 0.6s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
}
```

## Auditing Current Animations

### 1. Chrome DevTools Performance Tab

```
1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record (⚫)
4. Interact with animated elements
5. Stop recording
6. Look for:
   - Long Tasks (>50ms)
   - Layout/Recalculate Style (purple)
   - Paint (green)
   - Frame drops (gaps in FPS chart)
```

### 2. Chrome DevTools Rendering Tab

```
1. Open DevTools
2. Press Esc to open console drawer
3. Click "..." → More tools → Rendering
4. Enable:
   ☑ Paint flashing (green = repaint)
   ☑ Layout Shift Regions (blue = layout shift)
   ☑ Frame Rendering Stats (FPS counter)
   ☑ Scrolling performance issues
```

### 3. Lighthouse Audit

```bash
# Run Lighthouse
npm run build
npm start

# Open DevTools → Lighthouse tab
# Run "Performance" audit
# Look for:
# - Cumulative Layout Shift (CLS)
# - Avoid non-composited animations
# - Minimize main thread work
```

## Common Issues & Fixes

### Issue 1: Modal Animation Jank

```tsx
// ❌ Problem: Animating width/height
<Dialog className="animate-in">
  {/* Animates from width:0 to width:100% */}
</Dialog>

// ✅ Fix: Use scale transform
<Dialog className="animate-in data-[state=open]:animate-scale-in">
  {/* Animates scale from 0.95 to 1 */}
</Dialog>
```

### Issue 2: Infinite Scroll Loading

```tsx
// ❌ Problem: Layout shift when loading
{
  isLoading && <Spinner />
}

// ✅ Fix: Reserve space for spinner
;<div className="min-h-[100px] flex items-center justify-center">{isLoading && <Spinner />}</div>
```

### Issue 3: Hover Effects on Many Items

```css
/* ❌ Bad: Expensive box-shadow transition */
.card {
  transition: box-shadow 0.3s ease;
}

.card:hover {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

/* ✅ Good: Use pseudo-element for shadow */
.card {
  position: relative;
}

.card::before {
  content: '';
  position: absolute;
  inset: 0;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: -1;
}

.card:hover::before {
  opacity: 1;
}
```

### Issue 4: Parallax Scroll

```typescript
// ❌ Bad: Updates on every scroll event
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY
  parallaxElements.forEach((el) => {
    el.style.transform = `translateY(${scrollY * 0.5}px)`
  })
})

// ✅ Good: Throttled with RAF
let ticking = false

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      const scrollY = window.scrollY
      parallaxElements.forEach((el) => {
        el.style.transform = `translateY(${scrollY * 0.5}px)`
      })
      ticking = false
    })
    ticking = true
  }
})
```

## Mobile-Specific Optimizations

### Reduce Animation Complexity

```css
/* Desktop: complex animation */
@media (min-width: 1024px) {
  .fancy-animation {
    animation: complexAnimation 1s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }
}

/* Mobile: simpler animation */
@media (max-width: 1023px) {
  .fancy-animation {
    animation: simpleAnimation 0.3s ease;
  }
}

/* Or respect user preferences */
@media (prefers-reduced-motion: reduce) {
  .fancy-animation {
    animation: none;
    transition: none;
  }
}
```

### Disable on Low-End Devices

```typescript
// Detect low-end devices
const isLowEndDevice = navigator.hardwareConcurrency <= 2 || navigator.deviceMemory <= 2

if (isLowEndDevice) {
  document.body.classList.add('reduced-animations')
}
```

```css
/* Simplified animations for low-end devices */
.reduced-animations .animate {
  animation-duration: 0.1s !important;
}

.reduced-animations .transition {
  transition-duration: 0.1s !important;
}
```

## Testing on Low-End Devices

### Chrome DevTools CPU Throttling

```
1. Open DevTools
2. Performance tab
3. Click settings (⚙️)
4. CPU: Select "4x slowdown" or "6x slowdown"
5. Test animations
```

### Real Device Testing

**Recommended Test Devices:**

- Android: Samsung Galaxy A series (mid-range)
- iOS: iPhone SE (low-end)
- Desktop: 4GB RAM, integrated graphics

## Performance Checklist

### Before Deployment

- [ ] All animations use `transform` and `opacity` only
- [ ] No layout thrashing (batched DOM reads/writes)
- [ ] `will-change` only on animating elements
- [ ] Scroll/resize events are throttled
- [ ] No animations block main thread >50ms
- [ ] FPS stays above 55fps on mid-range mobile
- [ ] Lighthouse "Avoid non-composited animations" passes

### Testing

- [ ] Chrome DevTools performance recording shows no long tasks during animations
- [ ] Paint flashing shows minimal repaints
- [ ] Frame rendering stats show 60fps
- [ ] Tested with CPU throttling (4x slowdown)
- [ ] Tested on real low-end device
- [ ] `prefers-reduced-motion` respected

## Resources

- [CSS Triggers](https://csstriggers.com/) - What CSS properties trigger layout/paint
- [Web.dev: Rendering Performance](https://web.dev/rendering-performance/)
- [Google: Avoid Large, Complex Layouts](https://developers.google.com/web/fundamentals/performance/rendering/avoid-large-complex-layouts-and-layout-thrashing)
- [MDN: CSS Performance](https://developer.mozilla.org/en-US/docs/Web/Performance/CSS_performance)

---

**Status:** Ready for audit
**Priority:** High (affects all users)
**Estimated Time:** 4-6 hours for full codebase audit
