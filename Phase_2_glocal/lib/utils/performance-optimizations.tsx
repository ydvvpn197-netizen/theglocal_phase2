'use client'

import React, { memo, useMemo, useCallback, useEffect, useRef, useState } from 'react'
import { logger } from '@/lib/utils/logger'
import { useIntersectionObserver } from '@/lib/hooks/use-intersection-observer'

/**
 * HOC for memoizing components with deep comparison
 * Use for expensive components that receive complex props
 */
export function withMemo<P extends object>(
  Component: React.ComponentType<P>,
  displayName?: string
): React.MemoExoticComponent<React.ComponentType<P>> {
  const MemoizedComponent = memo(Component, (prevProps, nextProps) => {
    // Deep comparison for objects and arrays
    return JSON.stringify(prevProps) === JSON.stringify(nextProps)
  })

  if (displayName) {
    MemoizedComponent.displayName = `Memo(${displayName})`
  }

  return MemoizedComponent
}

/**
 * Hook for virtualizing long lists
 * Only renders items in viewport + buffer
 */
interface UseVirtualListOptions {
  itemHeight: number
  containerHeight: number
  overscan?: number // Number of items to render outside viewport
}

export function useVirtualList<T>(items: T[], options: UseVirtualListOptions) {
  const { itemHeight, containerHeight, overscan = 3 } = options
  const [scrollTop, setScrollTop] = useState(0)

  const totalHeight = items.length * itemHeight
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = useMemo(
    () =>
      items.slice(startIndex, endIndex).map((item, index) => ({
        item,
        index: startIndex + index,
        offsetY: (startIndex + index) * itemHeight,
      })),
    [items, startIndex, endIndex, itemHeight]
  )

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    startIndex,
    endIndex,
  }
}

/**
 * Hook for throttling expensive operations
 * Useful for scroll, resize, and other high-frequency events
 */
export function useThrottle<T>(value: T, delay: number = 200): T {
  const [throttledValue, setThrottledValue] = useState<T>(value)
  const lastRan = useRef(Date.now())

  useEffect(() => {
    const handler = setTimeout(
      () => {
        if (Date.now() - lastRan.current >= delay) {
          setThrottledValue(value)
          lastRan.current = Date.now()
        }
      },
      delay - (Date.now() - lastRan.current)
    )

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return throttledValue
}

/**
 * Component for lazy rendering content when in viewport
 * Great for below-the-fold content and images
 */
interface LazyRenderProps {
  children: React.ReactNode
  height?: string | number
  placeholder?: React.ReactNode
  rootMargin?: string
  threshold?: number
}

export function LazyRender({
  children,
  height = 'auto',
  placeholder = <div style={{ height }} />,
  rootMargin = '100px',
  threshold = 0.01,
}: LazyRenderProps) {
  const [shouldRender, setShouldRender] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const entry = useIntersectionObserver(ref, {
    threshold,
    rootMargin,
    freezeOnceVisible: true,
  })

  useEffect(() => {
    if (entry?.isIntersecting) {
      setShouldRender(true)
    }
  }, [entry])

  return <div ref={ref}>{shouldRender ? children : placeholder}</div>
}

/**
 * Hook for debouncing search and filter inputs
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * HOC for implementing windowing/clustering for maps
 * Only renders markers in viewport
 */
interface Bounds {
  north: number
  south: number
  east: number
  west: number
}

export function useMapClustering<T extends { lat: number; lng: number }>(
  items: T[],
  bounds: Bounds | null,
  clusterDistance: number = 0.01 // ~1km
): Array<T | { items: T[]; lat: number; lng: number; count: number }> {
  return useMemo(() => {
    if (!bounds) return items

    // Filter items in viewport
    const visibleItems = items.filter(
      (item) =>
        item.lat >= bounds.south &&
        item.lat <= bounds.north &&
        item.lng >= bounds.west &&
        item.lng <= bounds.east
    )

    // Simple clustering algorithm
    const clusters: Array<T | { items: T[]; lat: number; lng: number; count: number }> = []
    const used = new Set<number>()

    visibleItems.forEach((item, index) => {
      if (used.has(index)) return

      const nearbyItems = visibleItems.filter((other, otherIndex) => {
        if (used.has(otherIndex) || index === otherIndex) return false

        const distance = Math.sqrt(
          Math.pow(item.lat - other.lat, 2) + Math.pow(item.lng - other.lng, 2)
        )
        return distance < clusterDistance
      })

      if (nearbyItems.length > 0) {
        nearbyItems.forEach((_, i) => {
          const item = nearbyItems[i]
          const idx = item !== undefined ? visibleItems.indexOf(item) : -1
          if (idx !== -1) used.add(idx)
        })
        used.add(index)

        const allItems = [item, ...nearbyItems]
        clusters.push({
          items: allItems,
          lat: allItems.reduce((sum, i) => sum + i.lat, 0) / allItems.length,
          lng: allItems.reduce((sum, i) => sum + i.lng, 0) / allItems.length,
          count: allItems.length,
        })
      } else {
        clusters.push(item)
      }
    })

    return clusters
  }, [items, bounds, clusterDistance])
}

/**
 * Hook for detecting slow renders
 * Logs warning if component takes too long to render
 */
export function useRenderPerformance(componentName: string, threshold: number = 16) {
  const startTime = useRef(Date.now())

  useEffect(() => {
    const renderTime = Date.now() - startTime.current
    if (renderTime > threshold) {
      logger.warn(
        `[Performance] ${componentName} took ${renderTime}ms to render (threshold: ${threshold}ms)`
      )
    }
    startTime.current = Date.now()
  })
}

/**
 * Hook for batching state updates
 * Reduces re-renders when updating multiple state values
 */
export function useBatchedState<T extends object>(initialState: T) {
  const [state, setState] = useState<T>(initialState)
  const pendingUpdates = useRef<Partial<T>>({})
  const updateTimeout = useRef<NodeJS.Timeout>()

  const batchUpdate = useCallback((updates: Partial<T>) => {
    pendingUpdates.current = { ...pendingUpdates.current, ...updates }

    if (updateTimeout.current) {
      clearTimeout(updateTimeout.current)
    }

    updateTimeout.current = setTimeout(() => {
      setState((prev) => ({ ...prev, ...pendingUpdates.current }))
      pendingUpdates.current = {}
    }, 0)
  }, [])

  return [state, batchUpdate] as const
}

/**
 * Component wrapper for code splitting with loading state
 */
interface CodeSplitProps {
  loader: () => Promise<{ default: React.ComponentType<unknown> }>
  fallback?: React.ReactNode
  children?: (Component: React.ComponentType<unknown>) => React.ReactNode
}

export function CodeSplit({ loader, fallback, children }: CodeSplitProps) {
  const [Component, setComponent] = useState<React.ComponentType<unknown> | null>(null)

  useEffect(() => {
    loader().then((module) => setComponent(() => module.default))
  }, [loader])

  if (!Component) {
    return <>{fallback}</>
  }

  return <>{children ? children(Component) : <Component />}</>
}

/**
 * Utility for image lazy loading with blur placeholder
 */
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  blurDataURL?: string
  alt: string
}

export function LazyImage({ src, blurDataURL, alt, ...props }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  const entry = useIntersectionObserver(imgRef, {
    threshold: 0.01,
    rootMargin: '50px',
  })

  useEffect(() => {
    if (entry?.isIntersecting && imgRef.current && !isLoaded) {
      const img = new Image()
      img.src = src
      img.onload = () => {
        setIsLoaded(true)
      }
    }
  }, [entry, src, isLoaded])

  // Use Next.js Image for better performance
  // Note: Image component handles lazy loading automatically, but we keep the blur logic
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={
        isLoaded
          ? src
          : blurDataURL ||
            'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
      }
      alt={alt}
      style={{
        filter: isLoaded ? 'none' : 'blur(10px)',
        transition: 'filter 0.3s ease-in-out',
      }}
      {...props}
    />
  )
}
