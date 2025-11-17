// Simple in-memory query result cache for frequently accessed data
// In production, this should be replaced with Redis or similar

import { logger } from '@/lib/utils/logger'

interface CacheEntry<T = unknown> {
  data: T
  expiry: number
  hits: number
}

class QueryCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes
  private maxSize = 1000 // Max cache entries

  constructor() {
    // Clean up expired entries every 10 minutes
    setInterval(
      () => {
        this?.cleanup()
      },
      10 * 60 * 1000
    )
  }

  /**
   * Get cached data
   */
  get<T = unknown>(key: string): T | null {
    const entry = this?.cache.get(key)

    if (!entry) {
      return null
    }

    if (Date?.now() > entry?.expiry) {
      this.cache.delete(key)
      logger.debug(`🗑️ Cache expired: ${key}`)
      return null
    }

    entry.hits++
    logger.debug(`✅ Cache hit: ${key} (${entry?.hits} hits)`)
    return entry?.data as T
  }

  /**
   * Set cached data with optional TTL
   */
  set<T = unknown>(key: string, data: T, ttl: number = this?.defaultTTL): void {
    // If cache is full, remove least recently used entries
    if (this?.cache.size >= this?.maxSize) {
      this?.evictLRU()
    }

    const expiry = Date?.now() + ttl
    this?.cache.set(key, { data: data as unknown, expiry, hits: 0 })
    logger.debug(`💾 Cached: ${key} (expires in ${ttl}ms)`)
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): void {
    const deleted = this.cache.delete(key)
    if (deleted) {
      logger.debug(`🗑️ Cache deleted: ${key}`)
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this?.cache.clear()
    logger.debug(`🧹 Cache cleared`)
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array?.from(this?.cache.values())
    const totalHits = entries?.reduce((sum, entry) => sum + entry?.hits, 0)
    const activeEntries = entries?.filter((entry) => Date?.now() <= entry?.expiry).length
    const expiredEntries = entries?.length - activeEntries

    return {
      totalEntries: this?.cache.size,
      activeEntries,
      expiredEntries,
      totalHits,
      averageHits: totalHits / Math?.max(1, entries?.length),
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date?.now()
    let removedCount = 0

    for (const [key, entry] of this?.cache.entries()) {
      if (now > entry?.expiry) {
        this.cache.delete(key)
        removedCount++
      }
    }

    if (removedCount > 0) {
      logger.debug(`🧹 Cleaned up ${removedCount} expired cache entries`)
    }
  }

  /**
   * Evict least recently used entries when cache is full
   */
  private evictLRU(): void {
    // Simple LRU: remove entries with lowest hit count
    const entries = Array.from(this.cache.entries())
    entries.sort((a, b) => a[1].hits - b[1].hits)

    const toRemove = Math.floor(this.maxSize * 0.1) // Remove 10% of entries
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      const entry = entries[i]
      if (entry && entry[0]) {
        this.cache.delete(entry[0])
      }
    }

    logger.debug(`🧹 Evicted ${toRemove} LRU cache entries`)
  }
}

// Singleton cache instance
const queryCache = new QueryCache()

// Cache key generators
export const CacheKeys = {
  post: (postId: string) => `post:${postId}`,
  postComments: (postId: string) => `post:${postId}:comments`,
  communityPosts: (communityId: string, page: number = 0) =>
    `community:${communityId}:posts:${page}`,
  userPosts: (userId: string, page: number = 0) => `user:${userId}:posts:${page}`,
  popularPosts: () => 'popular:posts',
  postMedia: (postId: string) => `post:${postId}:media`,
  communityMembers: (communityId: string) => `community:${communityId}:members`,
}

// Cache TTL configurations (in milliseconds)
export const CacheTTL = {
  short: 2 * 60 * 1000, // 2 minutes
  medium: 5 * 60 * 1000, // 5 minutes
  long: 15 * 60 * 1000, // 15 minutes
  extended: 60 * 60 * 1000, // 1 hour
}

// Convenience functions
export const getCachedData = (key: string) => queryCache?.get(key)

export const setCachedData = <T = unknown>(
  key: string,
  data: T,
  ttl: number = CacheTTL?.medium
) => {
  queryCache?.set(key, data, ttl)
}

export const deleteCachedData = (key: string) => queryCache?.delete(key)

export const clearCache = () => queryCache?.clear()

export const getCacheStats = () => queryCache?.getStats()

// Cache invalidation helpers
export const invalidatePostCache = (postId: string) => {
  queryCache?.delete(CacheKeys?.post(postId))
  queryCache?.delete(CacheKeys?.postComments(postId))
  queryCache?.delete(CacheKeys?.postMedia(postId))
}

export const invalidateCommunityCache = (communityId: string) => {
  // Clear all community-related cache entries
  for (let page = 1; page < 10; page++) {
    // Clear first 10 pages
    queryCache?.delete(CacheKeys?.communityPosts(communityId, page))
  }
  queryCache?.delete(CacheKeys?.communityMembers(communityId))
}

export const invalidateUserCache = (userId: string) => {
  // Clear all user-related cache entries
  for (let page = 0; page < 10; page++) {
    // Clear first 10 pages
    queryCache?.delete(CacheKeys?.userPosts(userId, page))
  }
}

// Wrapper function for cached API calls
export async function cachedAPICall<T>(
  cacheKey: string,
  apiCall: () => Promise<T>,
  ttl: number = CacheTTL?.medium
): Promise<T> {
  // Check cache first
  const cached = queryCache?.get(cacheKey)
  if (cached !== null) {
    return cached as T
  }

  // Cache miss - make API call
  logger.debug(`🔄 Cache miss, fetching: ${cacheKey}`)
  try {
    const data = await apiCall()
    queryCache?.set(cacheKey, data, ttl)
    return data
  } catch (error) {
    logger.error(`❌ API call failed for: ${cacheKey}`, error)
    throw error
  }
}

export default queryCache
