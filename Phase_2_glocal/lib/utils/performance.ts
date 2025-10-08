/**
 * Performance Monitoring Utilities
 * Track and optimize Core Web Vitals
 */

// Report Web Vitals to analytics
export function reportWebVitals(metric: any) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(metric)
  }

  // Send to analytics in production
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    // Could send to Vercel Analytics, Google Analytics, or custom endpoint
    const body = JSON.stringify(metric)

    // Use sendBeacon if available, fallback to fetch
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/vitals', body)
    } else {
      fetch('/api/analytics/vitals', {
        body,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      })
    }
  }
}

// Measure component render time
export function measureComponentRender(componentName: string, callback: () => void) {
  if (typeof window === 'undefined') return callback()

  const startTime = performance.now()
  callback()
  const endTime = performance.now()
  const renderTime = endTime - startTime

  if (renderTime > 16) {
    // More than 1 frame (60fps)
    console.warn(`Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`)
  }
}

// Lazy load images with Intersection Observer
export function lazyLoadImage(imageElement: HTMLImageElement) {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const image = entry.target as HTMLImageElement
          const src = image.dataset.src

          if (src) {
            image.src = src
            image.removeAttribute('data-src')
            imageObserver.unobserve(image)
          }
        }
      })
    })

    imageObserver.observe(imageElement)
  } else {
    // Fallback for browsers without IntersectionObserver
    const src = imageElement.dataset.src
    if (src) {
      imageElement.src = src
    }
  }
}

// Debounce function for performance
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

// Throttle function for performance
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Check if user is on slow connection
export function isSlowConnection(): boolean {
  if (typeof navigator === 'undefined') return false

  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

  if (!connection) return false

  return (
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g' ||
    connection.saveData === true
  )
}

// Prefetch link on hover (for better perceived performance)
export function prefetchOnHover(href: string) {
  if (typeof window === 'undefined') return

  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = href
  document.head.appendChild(link)
}

