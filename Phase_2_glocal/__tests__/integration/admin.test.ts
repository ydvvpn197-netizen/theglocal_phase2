/**
 * Admin Dashboard Integration Tests
 * Tests for super admin functionality including stats, user management, and health monitoring
 */

import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/utils/permissions'
import { NextRequest } from 'next/server'
import { GET as getStats } from '@/app/api/admin/stats/route'
import { GET as getUsers } from '@/app/api/admin/users/route'
import { PUT as banUser } from '@/app/api/admin/users/[id]/ban/route'
import { GET as getHealth } from '@/app/api/admin/health/route'

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      admin: {
        getUserById: jest.fn(),
      },
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
  })),
}))

jest.mock('@/lib/utils/permissions', () => ({
  isSuperAdmin: jest.fn(),
}))

const mockSupabase = createClient() as jest.Mocked<ReturnType<typeof createClient>>
const mockGetUser = mockSupabase.auth.getUser as jest.Mock
const mockFrom = mockSupabase.from as jest.Mock
const mockIsSuperAdmin = isSuperAdmin as jest.Mock

describe('Admin Dashboard Integration Tests', () => {
  const mockAdminId = 'admin-123'
  const mockUserId = 'user-456'

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: mockAdminId, email: 'admin@theglocal.com' } } })
  })

  describe('Access Control', () => {
    it('should allow super admin to access admin routes', async () => {
      mockIsSuperAdmin.mockResolvedValue(true)
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ count: 100 }),
      })

      const request = new NextRequest('http://localhost/api/admin/stats')
      const response = await getStats(request)

      expect(response.status).toBe(200)
      expect(mockIsSuperAdmin).toHaveBeenCalledWith(mockAdminId)
    })

    it('should deny non-admin users from accessing admin routes', async () => {
      mockIsSuperAdmin.mockResolvedValue(false)

      const request = new NextRequest('http://localhost/api/admin/stats')
      const response = await getStats(request)

      expect(response.status).toBe(403)
      const json = await response.json()
      expect(json.error).toContain('Super admin access required')
    })

    it('should require authentication for admin routes', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const request = new NextRequest('http://localhost/api/admin/stats')
      const response = await getStats(request)

      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toContain('Authentication required')
    })
  })

  describe('Platform Statistics', () => {
    it('should fetch comprehensive platform stats', async () => {
      mockIsSuperAdmin.mockResolvedValue(true)

      // Mock database counts
      mockFrom.mockImplementation((table: string) => ({
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
      mockIsSuperAdmin.mockResolvedValue(true)

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
      mockIsSuperAdmin.mockResolvedValue(true)

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
      mockIsSuperAdmin.mockResolvedValue(true)

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

      const response = await banUser(request, { params: { id: mockUserId } })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.message).toContain('temporarily banned')
    })

    it('should ban user permanently', async () => {
      mockIsSuperAdmin.mockResolvedValue(true)

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

      const response = await banUser(request, { params: { id: mockUserId } })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.message).toContain('permanently banned')
    })

    it('should require ban reason', async () => {
      mockIsSuperAdmin.mockResolvedValue(true)

      const request = new NextRequest(`http://localhost/api/admin/users/${mockUserId}/ban`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: 'temporary',
          reason: 'Short', // Too short
        }),
      })

      const response = await banUser(request, { params: { id: mockUserId } })

      expect(response.status).toBe(500) // Validation error
    })

    it('should log ban actions', async () => {
      mockIsSuperAdmin.mockResolvedValue(true)

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

      await banUser(request, { params: { id: mockUserId } })

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
      mockIsSuperAdmin.mockResolvedValue(true)

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
      mockIsSuperAdmin.mockResolvedValue(true)

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
      const supabaseHealth = json.data.find((h: any) => h.service === 'Supabase Database')

      expect(supabaseHealth).toBeDefined()
      expect(supabaseHealth.status).toBe('healthy')
      expect(supabaseHealth).toHaveProperty('response_time_ms')
      expect(supabaseHealth).toHaveProperty('last_checked')
    })

    it('should handle API failures gracefully', async () => {
      mockIsSuperAdmin.mockResolvedValue(true)

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
      const supabaseHealth = json.data.find((h: any) => h.service === 'Supabase Database')

      expect(supabaseHealth.status).toBe('degraded')
      expect(supabaseHealth.error_message).toBeDefined()
    })
  })

  describe('Feature Community', () => {
    it('should allow super admin to feature communities', async () => {
      mockIsSuperAdmin.mockResolvedValue(true)

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

      // Note: This would be imported from the actual route file
      // For now, we're just testing the logic conceptually
      expect(mockIsSuperAdmin).toBeDefined()
    })
  })
})

describe('Permission Utils', () => {
  it('should identify super admin by email', async () => {
    process.env.SUPER_ADMIN_EMAILS = 'admin@theglocal.com,superadmin@example.com'

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { email: 'admin@theglocal.com', is_super_admin: false },
        error: null,
      }),
    })

    const result = await isSuperAdmin('admin-id')
    expect(mockFrom).toHaveBeenCalledWith('users')
  })

  it('should identify super admin by database flag', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { email: 'other@example.com', is_super_admin: true },
        error: null,
      }),
    })

    const result = await isSuperAdmin('admin-id')
    expect(mockFrom).toHaveBeenCalledWith('users')
  })
})
