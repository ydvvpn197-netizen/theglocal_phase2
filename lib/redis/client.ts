/**
 * Redis Client Configuration
 * Uses Upstash Redis for distributed caching and rate limiting
 */

import { logger } from '@/lib/utils/logger'
import { Redis } from 'ioredis'

let redisClient: Redis | null = null

export interface RedisConfig {
  url: string
  token?: string
  maxRetriesPerRequest: number
  retryDelayOnFailover: number
  enableReadyCheck: boolean
  lazyConnect: boolean
}

const defaultConfig: RedisConfig = {
  url: process.env.REDIS_URL || '',
  token: process.env.REDIS_TOKEN,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  lazyConnect: true,
}

/**
 * Create a mock Redis client for build time
 */
function createMockRedisClient(): Redis {
  const noop = () => {}
  const asyncNoop = async () => {}
  const asyncNull = async () => null
  const asyncZero = async () => 0
  const asyncEmptyArray = async () => []
  const asyncEmptyObject = async () => ({})

  return {
    ping: async () => 'PONG',
    quit: async () => 'OK',
    get: asyncNull,
    set: asyncNoop,
    setex: asyncNoop,
    del: asyncZero,
    exists: asyncZero,
    ttl: async () => -1,
    hset: asyncZero,
    hget: asyncNull,
    hgetall: asyncEmptyObject,
    hdel: asyncZero,
    publish: asyncZero,
    subscribe: asyncNoop,
    unsubscribe: asyncNoop,
    mget: asyncEmptyArray,
    mset: asyncNoop,
    keys: asyncEmptyArray,
    incr: asyncZero,
    expire: asyncZero,
    pipeline: () => ({
      incr: function (this: { commands: unknown[] }) {
        this.commands.push(['incr'])
        return this
      },
      expire: function (this: { commands: unknown[] }) {
        this.commands.push(['expire'])
        return this
      },
      exec: async () => [[null, 0]],
      commands: [] as unknown[],
    }),
    on: noop,
    off: noop,
    once: noop,
  } as unknown as Redis
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    // During build time, Redis is not needed - return a mock client
    if (!process.env.REDIS_URL) {
      redisClient = createMockRedisClient()
      return redisClient
    }

    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: defaultConfig.maxRetriesPerRequest,
      enableReadyCheck: defaultConfig.enableReadyCheck,
      lazyConnect: defaultConfig.lazyConnect,
      // Upstash specific configuration
      ...(process.env.REDIS_TOKEN && {
        password: process.env.REDIS_TOKEN,
      }),
    })

    // Handle connection events
    redisClient.on('connect', () => {
      logger.info('Redis client connected')
    })

    redisClient.on('error', (error) => {
      logger.error('Redis client error:', error)
    })

    redisClient.on('close', () => {
      logger.info('Redis client connection closed')
    })
  }

  return redisClient
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    // If REDIS_URL is not set, Redis is not available
    if (!process.env.REDIS_URL) {
      return false
    }
    const client = getRedisClient()
    await client.ping()
    return true
  } catch (error) {
    logger.error('Redis availability check failed:', error)
    return false
  }
}

/**
 * Redis key generators for different use cases
 */
export const RedisKeys = {
  // Rate limiting keys
  rateLimit: (identifier: string, action: string) => `rate_limit:${action}:${identifier}`,

  // Cache keys
  cache: {
    posts: (postId: string) => `cache:posts:${postId}`,
    artists: (artistId: string) => `cache:artists:${artistId}`,
    events: (eventId: string) => `cache:events:${eventId}`,
    communities: (communityId: string) => `cache:communities:${communityId}`,
    feed: (userId: string, type: string) => `cache:feed:${userId}:${type}`,
  },

  // Session keys
  session: (sessionToken: string) => `session:${sessionToken}`,

  // Circuit breaker keys
  circuitBreaker: (service: string) => `circuit_breaker:${service}`,

  // API usage tracking
  apiUsage: (service: string, date: string) => `api_usage:${service}:${date}`,

  // Exchange rates
  exchangeRate: (from: string, to: string) => `exchange_rate:${from}:${to}`,
}

/**
 * Redis utility functions
 */
export class RedisUtils {
  private client: Redis

  constructor() {
    this.client = getRedisClient()
  }

  /**
   * Set key with expiration
   */
  async setex(key: string, seconds: number, value: string): Promise<void> {
    await this.client.setex(key, seconds, value)
  }

  /**
   * Get key value
   */
  async get(key: string): Promise<string | null> {
    return await this.client.get(key)
  }

  /**
   * Delete key
   */
  async del(key: string): Promise<number> {
    return await this.client.del(key)
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key)
    return result === 1
  }

  /**
   * Increment counter with expiration
   */
  async incrWithExpiry(key: string, seconds: number): Promise<number> {
    const pipeline = this.client.pipeline()
    pipeline.incr(key)
    pipeline.expire(key, seconds)
    const results = await pipeline.exec()
    return (results?.[0]?.[1] as number) || 0
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key)
  }

  /**
   * Set hash field
   */
  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value)
  }

  /**
   * Get hash field
   */
  async hget(key: string, field: string): Promise<string | null> {
    return await this.client.hget(key, field)
  }

  /**
   * Get all hash fields
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.client.hgetall(key)
  }

  /**
   * Delete hash field
   */
  async hdel(key: string, field: string): Promise<number> {
    return await this.client.hdel(key, field)
  }

  /**
   * Publish message to channel
   */
  async publish(channel: string, message: string): Promise<number> {
    return await this.client.publish(channel, message)
  }

  /**
   * Subscribe to channel
   */
  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    await this.client.subscribe(channel)
    this.client.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        callback(message)
      }
    })
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(channel: string): Promise<void> {
    await this.client.unsubscribe(channel)
  }

  /**
   * Get multiple keys
   */
  async mget(keys: string[]): Promise<(string | null)[]> {
    return await this.client.mget(...keys)
  }

  /**
   * Set multiple keys
   */
  async mset(keyValuePairs: Record<string, string>): Promise<void> {
    const flatPairs: string[] = []
    for (const [key, value] of Object.entries(keyValuePairs)) {
      flatPairs.push(key, value)
    }
    await this.client.mset(...flatPairs)
  }

  /**
   * Get keys by pattern
   */
  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern)
  }

  /**
   * Delete keys by pattern
   */
  async delPattern(pattern: string): Promise<number> {
    const keys = await this.keys(pattern)
    if (keys.length === 0) return 0
    return await this.client.del(...keys)
  }
}

// Export singleton instance (lazy initialization)
let _redisUtils: RedisUtils | null = null
export function getRedisUtils(): RedisUtils {
  if (!_redisUtils) {
    _redisUtils = new RedisUtils()
  }
  return _redisUtils
}

// Lazy export for backward compatibility (only initializes when accessed)
export const redisUtils = new Proxy({} as RedisUtils, {
  get(_target, prop) {
    return getRedisUtils()[prop as keyof RedisUtils]
  },
})

// Export redis client getter for direct access (when not in Edge Runtime)
export function getRedis(): Redis {
  return getRedisClient()
}

// Lazy export for backward compatibility (only initializes when accessed)
export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    return getRedisClient()[prop as keyof Redis]
  },
})
