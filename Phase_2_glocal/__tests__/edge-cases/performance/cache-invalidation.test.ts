/**
 * Cache Invalidation Tests
 * Tests edge cases around cache invalidation and performance
 */

import { redisCache, CacheTags } from '@/lib/cache/redis-cache'
import { responseCompression } from '@/lib/middleware/response-compression'

// Mock Redis client
jest.mock('@/lib/redis/client', () => {
  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    mget: jest.fn(),
    mset: jest.fn(),
    exists: jest.fn(),
    keys: jest.fn(),
    smembers: jest.fn(),
    sadd: jest.fn(),
    hgetall: jest.fn(),
    hset: jest.fn(),
    hget: jest.fn(),
    expire: jest.fn(),
    flushdb: jest.fn(),
    pipeline: jest.fn(() => ({
      del: jest.fn().mockReturnThis(),
      setex: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      sadd: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    })),
  }

  return {
    getRedisClient: jest.fn(() => mockRedis),
    redis: mockRedis,
  }
})

describe.skip('Cache Invalidation and Performance', () => {
  let mockRedis: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Get the mocked Redis client
    mockRedis = require('@/lib/redis/client').redis

    // Reset Redis mock to default values
    mockRedis.get.mockResolvedValue(null)
    mockRedis.setex.mockResolvedValue('OK')
    mockRedis.del.mockResolvedValue(1)
    mockRedis.exists.mockResolvedValue(0)
    mockRedis.keys.mockResolvedValue([])
    mockRedis.smembers.mockResolvedValue([])
    mockRedis.sadd.mockResolvedValue(1)
    mockRedis.expire.mockResolvedValue(1)
    mockRedis.flushdb.mockResolvedValue('OK')
    mockRedis.pipeline.mockReturnValue({
      del: jest.fn().mockReturnThis(),
      setex: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([['OK'], [1]]),
    })
  })

  describe('Cache Operations', () => {
    it('should set and get cache values', async () => {
      const testData = { id: '123', name: 'Test User' }
      mockRedis.setex.mockResolvedValueOnce('OK')
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(testData))

      await redisCache.set('user:123', testData, 3600, [CacheTags.USER])
      const result = await redisCache.get('user:123')

      expect(result).toEqual(testData)
      expect(mockRedis.setex).toHaveBeenCalledWith('user:123', 3600, JSON.stringify(testData))
    })

    it('should handle cache misses gracefully', async () => {
      mockRedis.get.mockResolvedValueOnce(null)

      const result = await redisCache.get('nonexistent:key')
      expect(result).toBeNull()
    })

    it('should handle serialization errors', async () => {
      const circularObject: any = { name: 'test' }
      circularObject.self = circularObject // Create circular reference

      mockRedis.setex.mockRejectedValueOnce(new Error('Serialization error'))

      const result = await redisCache.set('circular:key', circularObject)
      expect(result).toBe(false)
    })

    it('should handle Redis connection errors', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis connection failed'))

      const result = await redisCache.get('user:123')
      expect(result).toBeNull()
    })
  })

  describe('Cache Invalidation', () => {
    it('should invalidate cache by tags', async () => {
      mockRedis.smembers.mockResolvedValueOnce(['user:123', 'user:456'])
      mockRedis.pipeline.mockReturnValue({
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([null, null, null, null, null, null]),
      })

      const deletedCount = await redisCache.invalidateByTags([CacheTags.USER])
      expect(deletedCount).toBe(2)
      expect(mockRedis.smembers).toHaveBeenCalledWith(`tag:${CacheTags.USER}`)
    })

    it('should invalidate cache by pattern', async () => {
      mockRedis.keys.mockResolvedValueOnce(['user:123', 'user:456', 'post:789'])
      mockRedis.pipeline.mockReturnValue({
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([null, null, null, null, null, null, null, null, null]),
      })

      const deletedCount = await redisCache.invalidateByPattern('user:*')
      expect(deletedCount).toBe(3)
    })

    it('should handle invalidation errors gracefully', async () => {
      mockRedis.smembers.mockRejectedValueOnce(new Error('Redis error'))

      const deletedCount = await redisCache.invalidateByTags([CacheTags.USER])
      expect(deletedCount).toBe(0)
    })

    it('should handle empty tag invalidation', async () => {
      mockRedis.smembers.mockResolvedValueOnce([])

      const deletedCount = await redisCache.invalidateByTags([CacheTags.USER])
      expect(deletedCount).toBe(0)
    })
  })

  describe('Cache Warming', () => {
    it('should warm cache with new data', async () => {
      const entries = [
        {
          key: 'user:123',
          value: { id: '123', name: 'User 1' },
          ttl: 3600,
          tags: [CacheTags.USER],
        },
        {
          key: 'user:456',
          value: { id: '456', name: 'User 2' },
          ttl: 3600,
          tags: [CacheTags.USER],
        },
      ]

      mockRedis.exists
        .mockResolvedValueOnce(false) // user:123 doesn't exist
        .mockResolvedValueOnce(false) // user:456 doesn't exist
      mockRedis.setex.mockResolvedValue('OK')
      mockRedis.pipeline.mockReturnValue({
        setex: jest.fn().mockReturnThis(),
        sadd: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([null, null, null, null]),
      })

      const warmedCount = await redisCache.warmCache(entries)
      expect(warmedCount).toBe(2)
    })

    it('should skip existing cache entries during warming', async () => {
      const entries = [
        {
          key: 'user:123',
          value: { id: '123', name: 'User 1' },
          ttl: 3600,
          tags: [CacheTags.USER],
        },
        {
          key: 'user:456',
          value: { id: '456', name: 'User 2' },
          ttl: 3600,
          tags: [CacheTags.USER],
        },
      ]

      // Mock exists to return true for user:123, false for user:456
      mockRedis.exists
        .mockResolvedValueOnce(true) // user:123 exists
        .mockResolvedValueOnce(false) // user:456 doesn't exist

      // Mock set method for the non-existing entry
      mockRedis.setex.mockResolvedValue('OK')
      mockRedis.pipeline.mockReturnValue({
        setex: jest.fn().mockReturnThis(),
        sadd: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([null, null, null, null]),
      })

      const warmedCount = await redisCache.warmCache(entries)
      expect(warmedCount).toBe(1) // Only user:456 should be warmed
    })
  })

  describe('Cache Statistics', () => {
    it('should provide cache statistics', async () => {
      mockRedis.keys.mockResolvedValueOnce([]) // Empty keys array
      mockRedis.get.mockResolvedValueOnce(null) // No data
      mockRedis.hgetall.mockResolvedValueOnce({}) // Empty hash

      const stats = await redisCache.getStats()

      expect(stats.totalKeys).toBe(0) // Will be 0 due to mock
      expect(stats.hitRate).toBeDefined()
      expect(stats.missRate).toBeDefined()
      expect(stats.topKeys).toBeDefined()
    })

    it('should handle statistics errors gracefully', async () => {
      mockRedis.keys.mockRejectedValueOnce(new Error('Redis error'))

      const stats = await redisCache.getStats()

      expect(stats.totalKeys).toBe(0)
      expect(stats.hitRate).toBe(0)
      expect(stats.missRate).toBe(0)
      expect(stats.topKeys).toEqual([])
    })
  })

  describe('Cache Metadata', () => {
    it('should get cache entry metadata', async () => {
      const metadata = {
        ttl: 3600,
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        hits: 5,
        tags: [CacheTags.USER],
      }

      mockRedis.hgetall.mockResolvedValueOnce(metadata)

      const result = await redisCache.getMetadata('user:123')

      expect(result).toBeDefined()
      expect(result?.ttl).toBe(3600)
      expect(result?.hits).toBe(5)
      expect(result?.tags).toEqual([CacheTags.USER])
    })

    it('should handle missing metadata gracefully', async () => {
      mockRedis.hgetall.mockResolvedValueOnce({})

      const result = await redisCache.getMetadata('nonexistent:key')
      expect(result).toBeNull()
    })
  })

  describe('Cache Tags', () => {
    it('should get keys by tag', async () => {
      mockRedis.smembers.mockResolvedValueOnce(['user:123', 'user:456'])

      const keys = await redisCache.getKeysByTag(CacheTags.USER)
      expect(keys).toEqual(['user:123', 'user:456'])
    })

    it('should get all tags', async () => {
      mockRedis.keys.mockResolvedValueOnce(['tag:user', 'tag:post', 'tag:artist'])

      const tags = await redisCache.getAllTags()
      expect(tags).toEqual(['user', 'post', 'artist'])
    })

    it('should handle tag errors gracefully', async () => {
      mockRedis.smembers.mockRejectedValueOnce(new Error('Redis error'))

      const keys = await redisCache.getKeysByTag(CacheTags.USER)
      expect(keys).toEqual([])
    })
  })

  describe('Response Compression', () => {
    it('should compress large JSON responses', async () => {
      const largeData = { data: 'x'.repeat(2000) } // 2KB of data
      const response = new Response(JSON.stringify(largeData), {
        headers: { 'content-type': 'application/json' },
      })

      const request = new Request('http://localhost/api/test', {
        headers: { 'accept-encoding': 'gzip, br' },
      })

      // Mock the headers.get method properly
      Object.defineProperty(request, 'headers', {
        value: {
          get: jest.fn((key) => {
            if (key === 'accept-encoding') return 'gzip, br'
            return null
          }),
        },
        writable: true,
      })

      // Mock the response headers and text method properly
      Object.defineProperty(response, 'headers', {
        value: new Headers({ 'content-type': 'application/json' }),
        writable: true,
      })

      // Mock the text method
      response.text = jest.fn().mockResolvedValue(JSON.stringify(largeData))

      const compressedResponse = await responseCompression.compressResponse(
        request as any,
        response as any
      )

      expect(compressedResponse.headers.get('content-encoding')).toBe('br')
      expect(compressedResponse.headers.get('vary')).toBe('accept-encoding')
    })

    it('should not compress small responses', async () => {
      const smallData = { data: 'small' }
      const response = new Response(JSON.stringify(smallData), {
        headers: { 'content-type': 'application/json' },
      })

      const request = new Request('http://localhost/api/test', {
        headers: { 'accept-encoding': 'gzip, br' },
      })

      // Mock the headers.get method properly
      Object.defineProperty(request, 'headers', {
        value: {
          get: jest.fn((key) => {
            if (key === 'accept-encoding') return 'gzip, br'
            return null
          }),
        },
        writable: true,
      })

      // Mock the response headers and text method properly
      Object.defineProperty(response, 'headers', {
        value: new Headers({ 'content-type': 'application/json' }),
        writable: true,
      })

      // Mock the text method
      response.text = jest.fn().mockResolvedValue(JSON.stringify(smallData))

      const compressedResponse = await responseCompression.compressResponse(
        request as any,
        response as any
      )

      expect(compressedResponse.headers.get('content-encoding')).toBeNull()
    })

    it('should not compress unsupported content types', async () => {
      const imageData = 'binary-image-data'
      const response = new Response(imageData, {
        headers: { 'content-type': 'image/jpeg' },
      })

      const request = new Request('http://localhost/api/test', {
        headers: { 'accept-encoding': 'gzip, br' },
      })

      // Mock the headers.get method properly
      Object.defineProperty(request, 'headers', {
        value: {
          get: jest.fn((key) => {
            if (key === 'accept-encoding') return 'gzip, br'
            return null
          }),
        },
        writable: true,
      })

      // Mock the response headers properly
      Object.defineProperty(response, 'headers', {
        value: new Headers({ 'content-type': 'image/jpeg' }),
        writable: true,
      })

      const compressedResponse = await responseCompression.compressResponse(
        request as any,
        response as any
      )

      expect(compressedResponse.headers.get('content-encoding')).toBeNull()
    })

    it('should handle compression errors gracefully', async () => {
      const largeData = { data: 'x'.repeat(2000) }
      const response = new Response(JSON.stringify(largeData), {
        headers: { 'content-type': 'application/json' },
      })

      const request = new Request('http://localhost/api/test', {
        headers: { 'accept-encoding': 'gzip, br' },
      })

      // Mock the headers.get method properly
      Object.defineProperty(request, 'headers', {
        value: {
          get: jest.fn((key) => {
            if (key === 'accept-encoding') return 'gzip, br'
            return null
          }),
        },
        writable: true,
      })

      // Mock the response headers and text method properly
      Object.defineProperty(response, 'headers', {
        value: new Headers({ 'content-type': 'application/json' }),
        writable: true,
      })

      // Mock the text method
      response.text = jest.fn().mockResolvedValue(JSON.stringify(largeData))

      // Mock compression failure
      jest
        .spyOn(responseCompression as any, 'compressBrotli')
        .mockRejectedValueOnce(new Error('Compression failed'))

      const compressedResponse = await responseCompression.compressResponse(
        request as any,
        response as any
      )

      // Should return original response on compression failure
      expect(compressedResponse).toBe(response)
    })
  })

  describe('Cache Performance', () => {
    it('should handle concurrent cache operations', async () => {
      mockRedis.setex.mockResolvedValue('OK')
      mockRedis.get.mockResolvedValue(JSON.stringify({ id: '123', name: 'Test' }))

      const operations = Array(10)
        .fill(null)
        .map((_, i) => redisCache.set(`user:${i}`, { id: i, name: `User ${i}` }))

      const results = await Promise.all(operations)
      expect(results.every((result) => result === true)).toBe(true)
    })

    it('should handle cache timeout scenarios', async () => {
      mockRedis.get.mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
      )

      const result = await redisCache.get('user:123')
      expect(result).toBeNull()
    })

    it('should handle malformed cache data', async () => {
      mockRedis.get.mockResolvedValueOnce('invalid-json')

      const result = await redisCache.get('user:123')
      expect(result).toBeNull()
    })
  })

  describe('Cache Edge Cases', () => {
    it('should handle empty cache keys', async () => {
      const result = await redisCache.get('')
      expect(result).toBeNull()
    })

    it('should handle very large cache values', async () => {
      const largeValue = { data: 'x'.repeat(1000000) } // 1MB
      mockRedis.setex.mockResolvedValue('OK')

      const result = await redisCache.set('large:key', largeValue)
      expect(result).toBe(true)
    })

    it('should handle special characters in cache keys', async () => {
      const specialKey = 'user:123:special@#$%^&*()'
      mockRedis.setex.mockResolvedValue('OK')
      mockRedis.get.mockResolvedValue(JSON.stringify({ id: '123' }))

      await redisCache.set(specialKey, { id: '123' })
      const result = await redisCache.get(specialKey)

      expect(result).toEqual({ id: '123' })
    })

    it('should handle cache key collisions', async () => {
      const key1 = 'user:123'
      const key2 = 'user:123:meta'

      mockRedis.setex.mockResolvedValue('OK')
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify({ id: '123' }))
        .mockResolvedValueOnce(JSON.stringify({ ttl: 3600 }))

      await redisCache.set(key1, { id: '123' })
      await redisCache.set(key2, { ttl: 3600 })

      const result1 = await redisCache.get(key1)
      const result2 = await redisCache.get(key2)

      expect(result1).toEqual({ id: '123' })
      expect(result2).toEqual({ ttl: 3600 })
    })
  })
})
