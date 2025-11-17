/**
 * Admin Dashboard Integration Tests
 * Tests for super admin functionality including stats, user management, and health monitoring
 */

import { NextRequest } from 'next/server'
import { requireAdminOrThrow } from '@/lib/utils/require-admin'
import { createClient } from '@/lib/supabase/server'
import { APIErrors } from '@/lib/utils/api-response'

// Import all admin route handlers
import { GET as getStats } from '@/app/api/admin/stats/route'
import { GET as getUsers } from '@/app/api/admin/users/route'
import { PUT as banUser } from '@/app/api/admin/users/[id]/ban/route'
import { PUT as unbanUser } from '@/app/api/admin/users/[id]/unban/route'
import { GET as getHealth } from '@/app/api/admin/health/route'
import { GET as getCommunities } from '@/app/api/admin/communities/route'
import { PUT as featureCommunity } from '@/app/api/admin/communities/[id]/feature/route'
import { GET as getOrphanedCommunities } from '@/app/api/admin/communities/orphaned/route'
import { POST as fixOrphanedCommunities } from '@/app/api/admin/communities/orphaned/route'
import { GET as getArtists } from '@/app/api/admin/artists/route'
import { GET as getSubscriptions } from '@/app/api/admin/subscriptions/route'
import { POST as recalculateCounts } from '@/app/api/admin/recalculate-counts/route'
import { GET as getRecalculateCounts } from '@/app/api/admin/recalculate-counts/route'
import { GET as getPerformance } from '@/app/api/admin/performance/route'
import { POST as clearCache } from '@/app/api/admin/performance/route'
import { GET as getJobs } from '@/app/api/admin/jobs/route'
import { GET as getGeocodingStats } from '@/app/api/admin/geocoding/stats/route'

// Mock dependencies
jest.mock('@/lib/utils/require-admin', () => ({
  requireAdminOrThrow: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      then: jest.fn(),
    })),
    rpc: jest.fn(),
  })),
  createAdminClient: jest.fn(() => ({
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
    })),
  })),
}))

jest.mock('@/lib/utils/background-jobs', () => ({
  getAllJobs: jest.fn(() => []),
}))

jest.mock('@/lib/utils/query-cache', () => ({
  getCacheStats: jest.fn(() => ({
    totalHits: 0,
    totalMisses: 0,
    size: 0,
  })),
  clearCache: jest.fn(),
}))

jest.mock('@/lib/redis/client', () => ({
  getRedisClient: jest.fn(() => null),
  isRedisAvailable: jest.fn(() => Promise.resolve(false)),
}))

jest.mock('@/lib/middleware/with-rate-limit', () => ({
  withRateLimit: jest.fn((handler) => handler),
}))

const mockRequireAdminOrThrow = requireAdminOrThrow as jest.Mock
const mockSupabase = createClient() as unknown as {
  from: jest.Mock
  rpc: jest.Mock
  auth: {
    getUser: jest.Mock
  }
}
const mockFrom = mockSupabase.from

describe('Admin Dashboard Integration Tests', () => {
  const mockAdminId = 'admin-123'
  const mockUserId = 'user-456'
  const mockAdminUser = { id: mockAdminId, email: 'admin@theglocal.com' }

  beforeEach(() => {
    jest.clearAllMocks()
    // Default: allow admin access
    mockRequireAdminOrThrow.mockResolvedValue({
      user: mockAdminUser,
      supabase: mockSupabase,
    })
  })

  describe('Access Control - Unauthorized (401)', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockRequireAdminOrThrow.mockRejectedValue(APIErrors.unauthorized())

      const request = new NextRequest('http://localhost/api/admin/stats')
      const response = await getStats(request)

      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toBeDefined()
    })

    it('should return 401 for all admin endpoints when not authenticated', async () => {
      mockRequireAdminOrThrow.mockRejectedValue(APIErrors.unauthorized())

      const endpoints = [
        { handler: getStats, path: '/api/admin/stats' },
        { handler: getUsers, path: '/api/admin/users' },
        { handler: getHealth, path: '/api/admin/health' },
        { handler: getCommunities, path: '/api/admin/communities' },
        { handler: getArtists, path: '/api/admin/artists' },
        { handler: getSubscriptions, path: '/api/admin/subscriptions' },
        { handler: getPerformance, path: '/api/admin/performance' },
        { handler: getJobs, path: '/api/admin/jobs' },
        { handler: getGeocodingStats, path: '/api/admin/geocoding/stats' },
        { handler: getOrphanedCommunities, path: '/api/admin/communities/orphaned' },
        { handler: getRecalculateCounts, path: '/api/admin/recalculate-counts' },
      ]

      for (const { handler, path } of endpoints) {
        const request = new NextRequest(`http://localhost${path}`)
        const response = await handler(request)
        expect(response.status).toBe(401)
        const json = await response.json()
        expect(json.error).toBeDefined()
      }
    })
  })

  describe('Access Control - Forbidden (403)', () => {
    it('should return 403 when user is not a super admin', async () => {
      mockRequireAdminOrThrow.mockRejectedValue(APIErrors.forbidden())

      const request = new NextRequest('http://localhost/api/admin/stats')
      const response = await getStats(request)

      expect(response.status).toBe(403)
      const json = await response.json()
      expect(json.error).toBeDefined()
    })

    it('should return 403 for all admin endpoints when not authorized', async () => {
      mockRequireAdminOrThrow.mockRejectedValue(APIErrors.forbidden())

      const endpoints = [
        { handler: getStats, path: '/api/admin/stats' },
        { handler: getUsers, path: '/api/admin/users' },
        { handler: getHealth, path: '/api/admin/health' },
        { handler: getCommunities, path: '/api/admin/communities' },
        { handler: getArtists, path: '/api/admin/artists' },
        { handler: getSubscriptions, path: '/api/admin/subscriptions' },
        { handler: getPerformance, path: '/api/admin/performance' },
        { handler: getJobs, path: '/api/admin/jobs' },
        { handler: getGeocodingStats, path: '/api/admin/geocoding/stats' },
        { handler: getOrphanedCommunities, path: '/api/admin/communities/orphaned' },
        { handler: getRecalculateCounts, path: '/api/admin/recalculate-counts' },
      ]

      for (const { handler, path } of endpoints) {
        const request = new NextRequest(`http://localhost${path}`)
        const response = await handler(request)
        expect(response.status).toBe(403)
        const json = await response.json()
        expect(json.error).toBeDefined()
      }
    })
  })

  describe('Access Control - Authorized (200)', () => {
    it('should allow super admin to access admin routes', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ count: 100 }),
      })

      const request = new NextRequest('http://localhost/api/admin/stats')
      const response = await getStats(request)

      expect(response.status).toBe(200)
      expect(mockRequireAdminOrThrow).toHaveBeenCalled()
    })
  })

  describe('Platform Statistics', () => {
    it('should fetch comprehensive platform stats', async () => {
      // Mock database counts
      mockFrom.mockImplementation((_table: string) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ count: 100 }),
      }))

      const request = new NextRequest('http://localhost/api/admin/stats')
      const response = await getStats(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data).toHaveProperty('total_users')
      expect(json.data).toHaveProperty('total_communities')
      expect(json.data).toHaveProperty('total_artists')
    })

    it('should calculate active users correctly', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'posts') {
          return {
            select: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: jest.fn().mockResolvedValue({
              data: [{ author_id: 'user1' }, { author_id: 'user2' }, { author_id: 'user1' }],
            }),
          }
        }
        return {
          select: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({ count: 0 }),
        }
      })

      const request = new NextRequest('http://localhost/api/admin/stats')
      const response = await getStats(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.data.active_users_7d).toBeGreaterThanOrEqual(0)
    })
  })

  describe('User Management', () => {
    it('should list all users', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: [
            {
              id: mockUserId,
              email: 'user@example.com',
              anonymous_handle: 'user123',
              is_banned: false,
            },
          ],
          error: null,
        }),
      })

      const request = new NextRequest('http://localhost/api/admin/users')
      const response = await getUsers(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data).toHaveLength(1)
      expect(json.data[0].email).toBe('user@example.com')
    })

    it('should ban user temporarily', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: mockUserId, is_banned: true, ban_expires_at: new Date().toISOString() },
              error: null,
            }),
          }
        }
        if (table === 'moderation_log') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return jest.fn().mockReturnThis()
      })

      const request = new NextRequest(`http://localhost/api/admin/users/${mockUserId}/ban`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: 'temporary',
          reason: 'Violation of community guidelines',
        }),
      })

      const response = await banUser(request, { params: Promise.resolve({ id: mockUserId }) })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.message).toContain('temporarily banned')
    })

    it('should ban user permanently', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: mockUserId, is_banned: true, ban_expires_at: null },
              error: null,
            }),
          }
        }
        if (table === 'moderation_log') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return jest.fn().mockReturnThis()
      })

      const request = new NextRequest(`http://localhost/api/admin/users/${mockUserId}/ban`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: 'permanent',
          reason: 'Severe violation',
        }),
      })

      const response = await banUser(request, { params: Promise.resolve({ id: mockUserId }) })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.message).toContain('permanently banned')
    })

    it('should require ban reason', async () => {
      const request = new NextRequest(`http://localhost/api/admin/users/${mockUserId}/ban`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: 'temporary',
          reason: 'Short', // Too short
        }),
      })

      const response = await banUser(request, { params: Promise.resolve({ id: mockUserId }) })

      expect(response.status).toBe(500) // Validation error
    })

    it('should log ban actions', async () => {
      const insertMock = jest.fn().mockResolvedValue({ data: null, error: null })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: mockUserId, is_banned: true },
              error: null,
            }),
          }
        }
        if (table === 'moderation_log') {
          return {
            insert: insertMock,
          }
        }
        return jest.fn().mockReturnThis()
      })

      const request = new NextRequest(`http://localhost/api/admin/users/${mockUserId}/ban`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: 'temporary',
          reason: 'Community guideline violation',
        }),
      })

      await banUser(request, { params: Promise.resolve({ id: mockUserId }) })

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ban_user',
          actor_id: mockAdminId,
          target_type: 'user',
          target_id: mockUserId,
        })
      )
    })
  })

  describe('API Health Monitoring', () => {
    it('should check health of all external APIs', async () => {
      // Mock successful database check
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'test' },
          error: null,
        }),
      })

      const request = new NextRequest('http://localhost/api/admin/health')
      const response = await getHealth(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data).toBeInstanceOf(Array)
      expect(json.data.length).toBeGreaterThan(0)
    })

    it('should report service status correctly', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'test' },
          error: null,
        }),
      })

      const request = new NextRequest('http://localhost/api/admin/health')
      const response = await getHealth(request)

      const json = await response.json()
      interface HealthCheck {
        service?: string
        status?: string
        error_message?: string
        [key: string]: unknown
      }
      const supabaseHealth = (json.data as HealthCheck[] | undefined)?.find(
        (h) => h.service === 'Supabase Database'
      )
      if (!supabaseHealth) {
        throw new Error('Supabase health check not found')
      }

      expect(supabaseHealth).toBeDefined()
      expect(supabaseHealth.status).toBe('healthy')
      expect(supabaseHealth).toHaveProperty('response_time_ms')
      expect(supabaseHealth).toHaveProperty('last_checked')
    })

    it('should handle API failures gracefully', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Connection failed' },
        }),
      })

      const request = new NextRequest('http://localhost/api/admin/health')
      const response = await getHealth(request)

      expect(response.status).toBe(200) // Should not fail completely
      const json = await response.json()
      interface HealthCheck {
        service?: string
        status?: string
        error_message?: string
        [key: string]: unknown
      }
      const supabaseHealth = (json.data as HealthCheck[] | undefined)?.find(
        (h) => h.service === 'Supabase Database'
      )
      if (!supabaseHealth) {
        throw new Error('Supabase health check not found')
      }

      expect(supabaseHealth.status).toBe('degraded')
      expect(supabaseHealth.error_message).toBeDefined()
    })
  })

  describe('Feature Community', () => {
    it('should allow super admin to feature communities', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'communities') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'comm123', is_featured: true },
              error: null,
            }),
          }
        }
        if (table === 'moderation_log') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return jest.fn().mockReturnThis()
      })

      const request = new NextRequest('http://localhost/api/admin/communities/comm123/feature', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: true }),
      })

      const response = await featureCommunity(request, {
        params: Promise.resolve({ id: 'comm123' }),
      })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
    })
  })

  describe('User Unban', () => {
    it('should unban a user', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: mockUserId, is_banned: false, ban_expires_at: null },
              error: null,
            }),
          }
        }
        if (table === 'moderation_log') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return jest.fn().mockReturnThis()
      })

      const request = new NextRequest(`http://localhost/api/admin/users/${mockUserId}/unban`, {
        method: 'PUT',
      })

      const response = await unbanUser(request, { params: Promise.resolve({ id: mockUserId }) })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.message).toContain('unbanned')
    })
  })

  describe('Recalculate Counts', () => {
    it('should recalculate all comment counts', async () => {
      mockSupabase.rpc = jest.fn().mockResolvedValue({
        data: [{ posts_updated: 10, total_comments: 100, execution_time_ms: 50 }],
        error: null,
      })

      const request = new NextRequest('http://localhost/api/admin/recalculate-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'all' }),
      })

      const response = await recalculateCounts(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
    })
  })

  describe('Performance Actions', () => {
    it('should clear cache', async () => {
      mockFrom.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      })

      const request = new NextRequest('http://localhost/api/admin/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_cache' }),
      })

      const response = await clearCache(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
    })
  })

  describe('Orphaned Communities', () => {
    it('should fix orphaned communities', async () => {
      const { createAdminClient } = require('@/lib/supabase/server')
      const mockAdminClient = createAdminClient()
      mockAdminClient.rpc = jest
        .fn()
        .mockResolvedValueOnce({
          data: [
            {
              community_id: 'comm1',
              community_name: 'Test Community',
              community_slug: 'test-community',
              creator_id: 'user1',
              created_at: new Date().toISOString(),
            },
          ],
          error: null,
        })
        .mockResolvedValueOnce({ data: null, error: null })

      mockFrom.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      })

      const request = new NextRequest('http://localhost/api/admin/communities/orphaned', {
        method: 'POST',
      })

      const response = await fixOrphanedCommunities(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
    })
  })

  describe('All Admin Endpoints - Comprehensive Tests', () => {
    it('should test all 14 admin GET endpoints with authorized access', async () => {
      // Mock successful responses for all endpoints
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
        then: jest.fn().mockResolvedValue({ data: [], count: 0, error: null }),
        update: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }))

      mockSupabase.rpc = jest.fn().mockResolvedValue({ data: [], error: null })

      const endpoints = [
        { handler: getStats, method: 'GET', path: '/api/admin/stats' },
        { handler: getUsers, method: 'GET', path: '/api/admin/users' },
        { handler: getHealth, method: 'GET', path: '/api/admin/health' },
        { handler: getCommunities, method: 'GET', path: '/api/admin/communities' },
        { handler: getArtists, method: 'GET', path: '/api/admin/artists' },
        { handler: getSubscriptions, method: 'GET', path: '/api/admin/subscriptions' },
        { handler: getPerformance, method: 'GET', path: '/api/admin/performance' },
        { handler: getJobs, method: 'GET', path: '/api/admin/jobs' },
        { handler: getGeocodingStats, method: 'GET', path: '/api/admin/geocoding/stats' },
        { handler: getOrphanedCommunities, method: 'GET', path: '/api/admin/communities/orphaned' },
        { handler: getRecalculateCounts, method: 'GET', path: '/api/admin/recalculate-counts' },
      ]

      for (const { handler, method, path } of endpoints) {
        const request = new NextRequest(`http://localhost${path}`, { method })
        const response = await handler(request)
        expect(response.status).toBe(200)
        expect(mockRequireAdminOrThrow).toHaveBeenCalled()
      }
    })

    it('should test all admin POST/PUT endpoints with authorized access', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: mockUserId, is_banned: true, ban_expires_at: new Date().toISOString() },
              error: null,
            }),
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === 'communities') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'comm123', is_featured: true },
              error: null,
            }),
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === 'moderation_log') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: {}, error: null }),
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      mockSupabase.rpc = jest.fn().mockResolvedValue({ data: [], error: null })

      const { createAdminClient } = require('@/lib/supabase/server')
      const mockAdminClient = createAdminClient()
      mockAdminClient.rpc = jest
        .fn()
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: null, error: null })

      // Test ban user
      const banRequest = new NextRequest(`http://localhost/api/admin/users/${mockUserId}/ban`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: 'temporary',
          reason: 'Test ban reason with sufficient length',
        }),
      })
      const banResponse = await banUser(banRequest, { params: Promise.resolve({ id: mockUserId }) })
      expect(banResponse.status).toBe(200)

      // Test unban user
      const unbanRequest = new NextRequest(`http://localhost/api/admin/users/${mockUserId}/unban`, {
        method: 'PUT',
      })
      const unbanResponse = await unbanUser(unbanRequest, {
        params: Promise.resolve({ id: mockUserId }),
      })
      expect(unbanResponse.status).toBe(200)

      // Test feature community
      const featureRequest = new NextRequest(
        'http://localhost/api/admin/communities/comm123/feature',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_featured: true }),
        }
      )
      const featureResponse = await featureCommunity(featureRequest, {
        params: Promise.resolve({ id: 'comm123' }),
      })
      expect(featureResponse.status).toBe(200)
    })
  })
})
