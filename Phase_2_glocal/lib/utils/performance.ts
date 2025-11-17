/**
 * Performance optimization utilities
 * Helper functions for image optimization, lazy loading, and performance monitoring
 */

import { logger } from '@/lib/utils/logger'

/**
 * Calculate responsive image sizes based on viewport
 * Returns a sizes string for Next.js Image component
 */
export function getImageSizes(
  breakpoints: {
    mobile?: string
    tablet?: string
    desktop?: string
    large?: string
  } = {}
): string {
  const { mobile = '100vw', tablet = '50vw', desktop = '33vw', large = '25vw' } = breakpoints

  return `(max-width: 640px) ${mobile}, (max-width: 1024px) ${tablet}, (max-width: 1280px) ${desktop}, ${large}`
}

/**
 * Get optimal image size for different contexts
 */
export const IMAGE_SIZES = {
  // Hero images (above fold)
  hero: getImageSizes({
    mobile: '100vw',
    tablet: '100vw',
    desktop: '1200px',
    large: '1920px',
  }),

  // Card images
  card: getImageSizes({
    mobile: '100vw',
    tablet: '50vw',
    desktop: '33vw',
    large: '400px',
  }),

  // Thumbnail images
  thumbnail: getImageSizes({
    mobile: '100px',
    tablet: '150px',
    desktop: '200px',
    large: '250px',
  }),

  // Avatar images
  avatar: getImageSizes({
    mobile: '40px',
    tablet: '48px',
    desktop: '56px',
    large: '64px',
  }),

  // Gallery images
  gallery: getImageSizes({
    mobile: '100vw',
    tablet: '50vw',
    desktop: '33vw',
    large: '25vw',
  }),

  // Full width images
  fullWidth: '100vw',
} as const

/**
 * Generate a blur placeholder data URL
 * Creates a tiny 1x1 pixel image for blur placeholder
 */
export function generateBlurPlaceholder(width = 10, height = 10): string {
  // Base64 encoded 1x1 transparent pixel
  return `data:image/svg+xml;base64,${Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/></svg>`
  ).toString('base64')}`
}

/**
 * Check if image should be loaded with priority
 * Priority should be used for above-fold images (LCP candidates)
 */
export function shouldUsePriority(isAboveFold: boolean, isLCPCandidate: boolean = false): boolean {
  return isAboveFold || isLCPCandidate
}

/**
 * Check if image should be lazy loaded
 * Lazy load all below-fold images
 */
export function shouldLazyLoad(isAboveFold: boolean): 'lazy' | 'eager' {
  return isAboveFold ? 'eager' : 'lazy'
}

/**
 * Get optimal image quality based on context
 * Lower quality for thumbnails, higher for hero images
 */
export function getImageQuality(
  context: 'hero' | 'card' | 'thumbnail' | 'gallery' = 'card'
): number {
  const qualityMap = {
    hero: 90,
    card: 85,
    gallery: 80,
    thumbnail: 75,
  }
  return qualityMap[context]
}

/**
 * Performance monitoring utilities
 */

/**
 * Measure time taken for an async operation
 */
export async function measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const start = performance.now()
    const result = await fn()
    const end = performance.now()
    logger.debug(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`)
    return result
  }
  return fn()
}

/**
 * Measure time taken for a sync operation
 */
export function measureSync<T>(label: string, fn: () => T): T {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const start = performance.now()
    const result = fn()
    const end = performance.now()
    logger.debug(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`)
    return result
  }
  return fn()
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
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

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
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

/**
 * Check if user is on a slow connection
 */
export function isSlowConnection(): boolean {
  if (typeof window === 'undefined' || !('connection' in navigator)) {
    return false
  }

  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } })
    .connection
  if (!connection || !connection.effectiveType) {
    return false
  }

  // 2g or slow-2g
  return connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g'
}

/**
 * Check if user has data saver enabled
 */
export function isDataSaverEnabled(): boolean {
  if (typeof window === 'undefined' || !('connection' in navigator)) {
    return false
  }

  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return connection?.saveData === true
}

/**
 * Get optimal image loading strategy based on connection
 */
export function getImageLoadingStrategy(): {
  quality: number
  priority: boolean
  loading: 'lazy' | 'eager'
} {
  const slowConnection = isSlowConnection()
  const dataSaver = isDataSaverEnabled()

  if (slowConnection || dataSaver) {
    return {
      quality: 70, // Lower quality for slow connections
      priority: false, // Don't prioritize on slow connections
      loading: 'lazy', // Always lazy load on slow connections
    }
  }

  return {
    quality: 85,
    priority: false,
    loading: 'lazy',
  }
}

/**
 * Bundle size tracking utilities
 */

/**
 * Log bundle size information (for development)
 */
export function logBundleSize(label: string, size: number): void {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const sizeKB = (size / 1024).toFixed(2)
    const sizeMB = (size / (1024 * 1024)).toFixed(2)
    const message = `[Bundle Size] ${label}: ${sizeKB}KB (${sizeMB}MB) ${
      size > 250 * 1024 ? '⚠️ Large bundle!' : '✓'
    }`
    if (size > 250 * 1024) {
      logger.warn(message)
    } else {
      logger.debug(message)
    }
  }
}

/**
 * Preload critical resources
 */
export function preloadResource(href: string, as: string, type?: string): void {
  if (typeof document === 'undefined') return

  const link = document.createElement('link')
  link.rel = 'preload'
  link.href = href
  link.as = as
  if (type) {
    link.type = type
  }
  document.head.appendChild(link)
}

/**
 * Prefetch resource for faster navigation
 */
export function prefetchResource(href: string): void {
  if (typeof document === 'undefined') return

  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = href
  document.head.appendChild(link)
}
