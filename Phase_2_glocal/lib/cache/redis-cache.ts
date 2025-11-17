/**
 * Redis Caching Layer
 * Advanced caching system with invalidation and warming
 */

import { logger } from '@/lib/utils/logger'
import { getRedisClient } from '@/lib/redis/client'

export interface CacheConfig {
  defaultTTL: number // seconds
  maxTTL: number // seconds
  compressionEnabled: boolean
  serializationEnabled: boolean
}

export interface CacheEntry<T = unknown> {
  key: string
  value: T
  ttl: number
  createdAt: Date
  expiresAt: Date
  hits: number
  tags: string[]
}

export interface CacheStats {
  totalKeys: number
  hitRate: number
  missRate: number
  totalHits: number
  totalMisses: number
  memoryUsage: number
  topKeys: Array<{ key: string; hits: number }>
}

const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 3600, // 1 hour
  maxTTL: 86400, // 24 hours
  compressionEnabled: true,
  serializationEnabled: true,
}

export class RedisCache {
  private config: CacheConfig
  private stats: {
    hits: number
    misses: number
    totalKeys: number
  }

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.stats = {
      hits: 0,
      misses: 0,
      totalKeys: 0,
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await getRedisClient().get(key)

      if (cached === null) {
        this.stats.misses++
        return null
      }

      this.stats.hits++

      if (this.config.serializationEnabled) {
        return JSON.parse(cached)
      }

      return cached as T
    } catch (error) {
      logger.error('Cache get error:', error)
      this.stats.misses++
      return null
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number, tags: string[] = []): Promise<boolean> {
    try {
      const finalTTL = Math.min(ttl || this.config.defaultTTL, this.config.maxTTL)

      let serializedValue: string
      if (this.config.serializationEnabled) {
        serializedValue = JSON.stringify(value)
      } else {
        serializedValue = String(value)
      }

      // Store main value
      await getRedisClient().setex(key, finalTTL, serializedValue)

      // Store metadata
      const metadata = {
        ttl: finalTTL,
        createdAt: Date.now(),
        expiresAt: Date.now() + finalTTL * 1000,
        hits: 0,
        tags,
      }

      await getRedisClient().setex(`${key}:meta`, finalTTL, JSON.stringify(metadata))

      // Update tag index
      if (tags.length > 0) {
        await this.updateTagIndex(key, tags)
      }

      this.stats.totalKeys++
      return true
    } catch (error) {
      logger.error('Cache set error:', error)
      return false
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const pipeline = getRedisClient().pipeline()
      pipeline.del(key)
      pipeline.del(`${key}:meta`)
      pipeline.del(`${key}:tags`)

      await pipeline.exec()

      this.stats.totalKeys = Math.max(0, this.stats.totalKeys - 1)
      return true
    } catch (error) {
      logger.error('Cache delete error:', error)
      return false
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await getRedisClient().exists(key)
      return result === 1
    } catch (error) {
      logger.error('Cache exists error:', error)
      return false
    }
  }

  /**
   * Get multiple values
   */
  async mget<T>(keys: string[]): Promise<Array<T | null>> {
    try {
      const values = await getRedisClient().mget(...keys)

      return values.map((value) => {
        if (value === null) {
          this.stats.misses++
          return null
        }

        this.stats.hits++

        if (this.config.serializationEnabled) {
          return JSON.parse(value)
        }

        return value as T
      })
    } catch (error) {
      logger.error('Cache mget error:', error)
      return keys.map(() => null)
    }
  }

  /**
   * Set multiple values
   */
  async mset<T>(
    entries: Array<{ key: string; value: T; ttl?: number; tags?: string[] }>
  ): Promise<boolean> {
    try {
      const pipeline = getRedisClient().pipeline()

      for (const entry of entries) {
        const finalTTL = Math.min(entry.ttl || this.config.defaultTTL, this.config.maxTTL)

        let serializedValue: string
        if (this.config.serializationEnabled) {
          serializedValue = JSON.stringify(entry.value)
        } else {
          serializedValue = String(entry.value)
        }

        pipeline.setex(entry.key, finalTTL, serializedValue)

        // Store metadata
        const metadata = {
          ttl: finalTTL,
          createdAt: Date.now(),
          expiresAt: Date.now() + finalTTL * 1000,
          hits: 0,
          tags: entry.tags || [],
        }

        pipeline.setex(`${entry.key}:meta`, finalTTL, JSON.stringify(metadata))

        // Update tag index
        if (entry.tags && entry.tags.length > 0) {
          this.updateTagIndex(entry.key, entry.tags)
        }
      }

      await pipeline.exec()
      this.stats.totalKeys += entries.length
      return true
    } catch (error) {
      logger.error('Cache mset error:', error)
      return false
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      let totalDeleted = 0

      for (const tag of tags) {
        const keys = await getRedisClient().smembers(`tag:${tag}`)

        if (keys.length > 0) {
          const pipeline = getRedisClient().pipeline()

          for (const key of keys) {
            pipeline.del(key)
            pipeline.del(`${key}:meta`)
            pipeline.del(`${key}:tags`)
          }

          pipeline.del(`tag:${tag}`)
          await pipeline.exec()

          totalDeleted += keys.length
        }
      }

      this.stats.totalKeys = Math.max(0, this.stats.totalKeys - totalDeleted)
      return totalDeleted
    } catch (error) {
      logger.error('Cache invalidate by tags error:', error)
      return 0
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      const keys = await getRedisClient().keys(pattern)

      if (keys.length === 0) {
        return 0
      }

      const pipeline = getRedisClient().pipeline()

      for (const key of keys) {
        pipeline.del(key)
        pipeline.del(`${key}:meta`)
        pipeline.del(`${key}:tags`)
      }

      await pipeline.exec()

      this.stats.totalKeys = Math.max(0, this.stats.totalKeys - keys.length)
      return keys.length
    } catch (error) {
      logger.error('Cache invalidate by pattern error:', error)
      return 0
    }
  }

  /**
   * Warm cache with data
   */
  async warmCache<T>(
    entries: Array<{ key: string; value: T; ttl?: number; tags?: string[] }>
  ): Promise<number> {
    try {
      let warmed = 0

      for (const entry of entries) {
        const exists = await this.exists(entry.key)

        if (!exists) {
          await this.set(entry.key, entry.value, entry.ttl, entry.tags)
          warmed++
        }
      }

      return warmed
    } catch (error) {
      logger.error('Cache warm error:', error)
      return 0
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const totalHits = this.stats.hits
      const totalMisses = this.stats.misses
      const totalRequests = totalHits + totalMisses

      const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0
      const missRate = totalRequests > 0 ? (totalMisses / totalRequests) * 100 : 0

      // Get top keys by hits
      const allKeys = await getRedisClient().keys('*')
      const topKeys: Array<{ key: string; hits: number }> = []

      for (const key of allKeys.slice(0, 10)) {
        // Limit to top 10
        if (!key.includes(':meta') && !key.includes(':tags') && !key.startsWith('tag:')) {
          const meta = await getRedisClient().get(`${key}:meta`)
          if (meta) {
            const metadata = JSON.parse(meta)
            topKeys.push({ key, hits: metadata.hits || 0 })
          }
        }
      }

      topKeys.sort((a, b) => b.hits - a.hits)

      return {
        totalKeys: this.stats.totalKeys,
        hitRate,
        missRate,
        totalHits,
        totalMisses,
        memoryUsage: 0, // Would need Redis INFO command
        topKeys: topKeys.slice(0, 5),
      }
    } catch (error) {
      logger.error('Cache stats error:', error)
      return {
        totalKeys: 0,
        hitRate: 0,
        missRate: 0,
        totalHits: 0,
        totalMisses: 0,
        memoryUsage: 0,
        topKeys: [],
      }
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<boolean> {
    try {
      await getRedisClient().flushdb()
      this.stats = { hits: 0, misses: 0, totalKeys: 0 }
      return true
    } catch (error) {
      logger.error('Cache clear error:', error)
      return false
    }
  }

  /**
   * Get cache entry metadata
   */
  async getMetadata(key: string): Promise<CacheEntry | null> {
    try {
      const meta = await getRedisClient().get(`${key}:meta`)

      if (!meta) {
        return null
      }

      const metadata = JSON.parse(meta)
      return {
        key,
        value: null, // Not loaded
        ttl: metadata.ttl,
        createdAt: new Date(metadata.createdAt),
        expiresAt: new Date(metadata.expiresAt),
        hits: metadata.hits,
        tags: metadata.tags,
      }
    } catch (error) {
      logger.error('Cache metadata error:', error)
      return null
    }
  }

  /**
   * Update tag index
   */
  private async updateTagIndex(key: string, tags: string[]): Promise<void> {
    try {
      const pipeline = getRedisClient().pipeline()

      for (const tag of tags) {
        pipeline.sadd(`tag:${tag}`, key)
        pipeline.expire(`tag:${tag}`, this.config.maxTTL)
      }

      pipeline.setex(`${key}:tags`, this.config.maxTTL, JSON.stringify(tags))

      await pipeline.exec()
    } catch (error) {
      logger.error('Cache tag index error:', error)
    }
  }

  /**
   * Increment hit counter
   */
  async incrementHits(key: string): Promise<void> {
    try {
      const meta = await getRedisClient().get(`${key}:meta`)

      if (meta) {
        const metadata = JSON.parse(meta)
        metadata.hits = (metadata.hits || 0) + 1

        await getRedisClient().setex(`${key}:meta`, metadata.ttl, JSON.stringify(metadata))
      }
    } catch (error) {
      logger.error('Cache increment hits error:', error)
    }
  }

  /**
   * Get keys by tag
   */
  async getKeysByTag(tag: string): Promise<string[]> {
    try {
      return await getRedisClient().smembers(`tag:${tag}`)
    } catch (error) {
      logger.error('Cache get keys by tag error:', error)
      return []
    }
  }

  /**
   * Get all tags
   */
  async getAllTags(): Promise<string[]> {
    try {
      const tagKeys = await getRedisClient().keys('tag:*')
      return tagKeys.map((key) => key.replace('tag:', ''))
    } catch (error) {
      logger.error('Cache get all tags error:', error)
      return []
    }
  }
}

// Export singleton instance
export const redisCache = new RedisCache()

// Cache key generators
export const CacheKeys = {
  user: (userId: string) => `user:${userId}`,
  post: (postId: string) => `post:${postId}`,
  posts: (communityId: string, page: number) => `posts:${communityId}:${page}`,
  artist: (artistId: string) => `artist:${artistId}`,
  artists: (page: number) => `artists:${page}`,
  events: (location: string, date: string) => `events:${location}:${date}`,
  search: (query: string, filters: string) => `search:${query}:${filters}`,
  exchangeRate: (from: string, to: string) => `exchange_rate:${from}:${to}`,
  apiUsage: (service: string, date: string) => `api_usage:${service}:${date}`,
  massReporting: (contentId: string) => `mass_reporting:${contentId}`,
  appeal: (appealId: string) => `appeal:${appealId}`,
  recovery: (requestId: string) => `recovery:${requestId}`,
}

// Cache tags
export const CacheTags = {
  USER: 'user',
  POST: 'post',
  ARTIST: 'artist',
  EVENT: 'event',
  SEARCH: 'search',
  API_USAGE: 'api_usage',
  MODERATION: 'moderation',
  PAYMENT: 'payment',
}
