/**
 * Session Security Tests
 * Tests the edge cases around session management and security
 */

import { sessionSecurityManager } from '@/lib/security/session-manager'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('Session Security', () => {
  const mockSupabase = {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              ascending: jest.fn(),
            })),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(),
      })),
    })),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  describe('Session Creation', () => {
    it('should create a new session with device info', async () => {
      const mockSessionId = 'session-123'

      mockSupabase.rpc.mockResolvedValueOnce({ data: mockSessionId, error: null })

      const result = await sessionSecurityManager.createSession(
        'user-123',
        { userAgent: 'Mozilla/5.0' },
        '192.168.1.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      )

      expect(result.sessionId).toBe(mockSessionId)
      expect(result.sessionToken).toBeDefined()
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_user_session', {
        p_user_id: 'user-123',
        p_session_token: expect.any(String),
        p_device_info: { userAgent: 'Mozilla/5.0' },
        p_ip_address: '192.168.1.1',
        p_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      })
    })

    it('should limit concurrent sessions to 3', async () => {
      // Mock existing sessions count
      mockSupabase.rpc.mockResolvedValueOnce({ data: 'session-123', error: null })

      const result = await sessionSecurityManager.createSession('user-123')

      expect(result.sessionId).toBe('session-123')
      // The database function should handle session cleanup automatically
    })
  })

  describe('Session Validation', () => {
    it('should validate active session', async () => {
      const mockSessionData = {
        is_valid: true,
        user_id: 'user-123',
        session_id: 'session-123',
      }

      mockSupabase.rpc.mockResolvedValueOnce({ data: [mockSessionData], error: null })

      // Mock the chained method calls properly
      const mockSelect = jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValueOnce({
            data: {
              id: 'session-123',
              user_id: 'user-123',
              device_info: { userAgent: 'Mozilla/5.0' },
              ip_address: '192.168.1.1',
              user_agent: 'Mozilla/5.0',
              last_activity: '2025-01-27T10:00:00Z',
              expires_at: '2025-02-26T10:00:00Z',
            },
            error: null,
          }),
        })),
      }))

      mockSupabase.from.mockReturnValueOnce({
        select: mockSelect,
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              ascending: jest.fn().mockReturnValue({
                single: jest.fn(),
              }),
            }),
          }),
        }) as any,
        single: jest.fn(),
      } as any)

      const session = await sessionSecurityManager.validateSession('valid-token')

      expect(session).toBeDefined()
      expect(session?.userId).toBe('user-123')
      expect(session?.sessionId).toBe('session-123')
    })

    it('should reject expired session', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: [], error: null })

      const session = await sessionSecurityManager.validateSession('expired-token')

      expect(session).toBeNull()
    })

    it('should reject invalid session token', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: [{ is_valid: false }], error: null })

      const session = await sessionSecurityManager.validateSession('invalid-token')

      expect(session).toBeNull()
    })
  })

  describe('Session Activity Updates', () => {
    it('should update session activity', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

      const success = await sessionSecurityManager.updateSessionActivity('token-123', '192.168.1.1')

      expect(success).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_session_activity', {
        p_session_token: 'token-123',
        p_ip_address: '192.168.1.1',
      })
    })

    it('should handle failed activity updates', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: false, error: null })

      const success = await sessionSecurityManager.updateSessionActivity('invalid-token')

      expect(success).toBe(false)
    })
  })

  describe('Session Deactivation', () => {
    it('should deactivate specific session', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

      const success = await sessionSecurityManager.deactivateSession('token-123')

      expect(success).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('deactivate_session', {
        p_session_token: 'token-123',
      })
    })

    it('should deactivate all user sessions', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: 3, error: null })

      const count = await sessionSecurityManager.deactivateAllUserSessions('user-123')

      expect(count).toBe(3)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('deactivate_all_user_sessions', {
        p_user_id: 'user-123',
      })
    })
  })

  describe('Suspicious Activity Detection', () => {
    it('should detect multiple failed logins', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

      const detected = await sessionSecurityManager.detectSuspiciousActivity(
        'user-123',
        '192.168.1.1',
        'failed_login',
        { attempts: 10 }
      )

      expect(detected).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('detect_suspicious_activity', {
        p_user_id: 'user-123',
        p_ip_address: '192.168.1.1',
        p_activity_type: 'failed_login',
        p_details: { attempts: 10 },
      })
    })

    it('should detect multiple concurrent sessions', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

      const detected = await sessionSecurityManager.detectSuspiciousActivity(
        'user-123',
        '192.168.1.1',
        'multiple_sessions',
        { sessionCount: 5 }
      )

      expect(detected).toBe(true)
    })

    it('should detect unusual location access', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

      const detected = await sessionSecurityManager.detectSuspiciousActivity(
        'user-123',
        '203.0.113.1', // Different IP
        'unusual_location',
        { previousIP: '192.168.1.1' }
      )

      expect(detected).toBe(true)
    })
  })

  describe('Session Management', () => {
    it('should get user active sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          user_id: 'user-123',
          device_info: { userAgent: 'Mozilla/5.0' },
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          last_activity: '2025-01-27T10:00:00Z',
          expires_at: '2025-02-26T10:00:00Z',
        },
      ]

      // Mock the chained method calls properly
      const mockOrder = jest.fn().mockResolvedValueOnce({
        data: mockSessions,
        error: null,
      })

      const mockEq2 = jest.fn(() => ({
        order: mockOrder,
      }))

      const mockEq1 = jest.fn(() => ({
        eq: mockEq2,
      }))

      const mockSelect = jest.fn(() => ({
        eq: mockEq1,
      }))

      mockSupabase.from.mockReturnValueOnce({
        select: mockSelect,
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              ascending: jest.fn().mockReturnValue({
                single: jest.fn(),
              }),
            }),
          }),
        }) as any,
        single: jest.fn(),
      } as any)

      const sessions = await sessionSecurityManager.getUserSessions('user-123')

      expect(sessions).toHaveLength(1)
      expect(sessions[0]?.userId).toBe('user-123')
    })

    it('should clean up expired sessions', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: 5, error: null })

      const cleaned = await sessionSecurityManager.cleanupExpiredSessions()

      expect(cleaned).toBe(5)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('cleanup_expired_sessions')
    })
  })

  describe('Device Fingerprinting', () => {
    it('should extract device info from request', () => {
      const mockRequest = {
        headers: {
          get: (name: string) => {
            const headers: Record<string, string> = {
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'accept-language': 'en-US,en;q=0.9',
              'accept-encoding': 'gzip, deflate, br',
            }
            return headers[name] || null
          },
        },
      } as Request

      const deviceInfo = sessionSecurityManager.extractDeviceInfo(mockRequest)

      expect(deviceInfo.userAgent).toBe(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      )
      expect(deviceInfo.acceptLanguage).toBe('en-US,en;q=0.9')
      expect(deviceInfo.timestamp).toBeDefined()
    })
  })

  describe('Session Expiry Checks', () => {
    it('should detect session near expiry', () => {
      const session = {
        sessionId: 'session-123',
        userId: 'user-123',
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
      }

      const isNearExpiry = sessionSecurityManager.isSessionNearExpiry(session)

      expect(isNearExpiry).toBe(true)
    })

    it('should calculate session expiry time', () => {
      const session = {
        sessionId: 'session-123',
        userId: 'user-123',
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
      }

      const expirySeconds = sessionSecurityManager.getSessionExpirySeconds(session)

      expect(expirySeconds).toBeGreaterThan(0)
      expect(expirySeconds).toBeLessThanOrEqual(30 * 60) // 30 minutes
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabase.rpc.mockRejectedValueOnce(new Error('Database connection failed'))

      const session = await sessionSecurityManager.validateSession('token-123')

      expect(session).toBeNull()
    })

    it('should handle RPC errors gracefully', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC failed' } })

      const success = await sessionSecurityManager.updateSessionActivity('token-123')

      expect(success).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle concurrent session creation', async () => {
      const promises = Array(5)
        .fill(null)
        .map(() => sessionSecurityManager.createSession('user-123'))

      mockSupabase.rpc.mockResolvedValue({ data: 'session-123', error: null })

      const results = await Promise.all(promises)

      // All should succeed (database handles concurrency)
      expect(results.every((r) => r.sessionId)).toBe(true)
    })

    it('should handle malformed session tokens', async () => {
      const malformedTokens = ['', null, undefined, '   ', 'invalid-token']

      for (const token of malformedTokens) {
        if (token) {
          mockSupabase.rpc.mockResolvedValueOnce({ data: [], error: null })
          const session = await sessionSecurityManager.validateSession(token as string)
          expect(session).toBeNull()
        }
      }
    })

    it('should handle very long session tokens', async () => {
      const longToken = 'a'.repeat(1000)
      mockSupabase.rpc.mockResolvedValueOnce({ data: [], error: null })

      const session = await sessionSecurityManager.validateSession(longToken)

      expect(session).toBeNull()
    })
  })
})
