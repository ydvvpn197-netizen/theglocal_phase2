/**
 * OTP Brute Force Protection Tests
 * Tests the edge cases around OTP security and brute force prevention
 */

import { otpSecurityManager } from '@/lib/security/otp-manager'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('OTP Brute Force Protection', () => {
  const mockSupabase = {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      delete: jest.fn().mockReturnThis(),
    })),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  describe('OTP Attempt Tracking', () => {
    it('should allow first OTP request', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

      const result = await otpSecurityManager.canRequestOTP('test@example.com')

      expect(result.allowed).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('can_request_otp', {
        p_identifier: 'test@example.com',
      })
    })

    it('should block user after 3 failed attempts', async () => {
      // Mock user is locked out
      mockSupabase.rpc.mockResolvedValueOnce({ data: false, error: null })

      const result = await otpSecurityManager.canRequestOTP('test@example.com')

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Too many failed attempts. Please try again later.')
    })

    it('should enforce 60-second cooldown between requests', async () => {
      // Mock cooldown period not passed
      mockSupabase.rpc.mockResolvedValueOnce({ data: false, error: null })

      const result = await otpSecurityManager.canRequestOTP('test@example.com')

      expect(result.allowed).toBe(false)
    })
  })

  describe('OTP Attempt Recording', () => {
    it('should record successful OTP attempt and reset counter', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

      const result = await otpSecurityManager.recordAttempt('test@example.com', true)

      expect(result.allowed).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('record_otp_attempt', {
        p_identifier: 'test@example.com',
        p_success: true,
      })
    })

    it('should record failed attempt and increment counter', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

      const result = await otpSecurityManager.recordAttempt('test@example.com', false)

      expect(result.allowed).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('record_otp_attempt', {
        p_identifier: 'test@example.com',
        p_success: false,
      })
    })

    it('should lock user after 3 failed attempts', async () => {
      // Mock lockout after 3 attempts
      mockSupabase.rpc.mockResolvedValueOnce({ data: false, error: null })

      const result = await otpSecurityManager.recordAttempt('test@example.com', false)

      expect(result.allowed).toBe(false)
      expect(result.lockedUntil).toBeDefined()
    })
  })

  describe('Lockout Status', () => {
    it('should detect when user is locked out', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

      const isLocked = await otpSecurityManager.isLockedOut('test@example.com')

      expect(isLocked).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('is_user_locked_out', {
        p_identifier: 'test@example.com',
      })
    })

    it('should return remaining lockout time', async () => {
      const futureTime = new Date(Date.now() + 15 * 60 * 1000).toISOString()
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { locked_until: futureTime },
          error: null,
        }),
        delete: jest.fn().mockReturnThis(),
      })

      const remaining = await otpSecurityManager.getRemainingLockoutTime('test@example.com')

      expect(remaining).toBeGreaterThan(0)
      expect(remaining).toBeLessThanOrEqual(15 * 60) // 15 minutes
    })
  })

  describe('OTP Generation and Hashing', () => {
    it('should generate 6-digit OTP', () => {
      const otp = otpSecurityManager.generateOTP()

      expect(otp).toMatch(/^\d{6}$/)
      expect(otp.length).toBe(6)
    })

    it('should hash OTP securely', () => {
      const otp = '123456'
      const hash = otpSecurityManager.hashOTP(otp)

      expect(hash).toMatch(/^[a-f0-9]{64}$/) // SHA-256 hash
      expect(hash).not.toBe(otp)
    })

    it('should verify OTP hash correctly', () => {
      const otp = '123456'
      const hash = otpSecurityManager.hashOTP(otp)

      expect(otpSecurityManager.verifyOTPHash(otp, hash)).toBe(true)
      expect(otpSecurityManager.verifyOTPHash('654321', hash)).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.rpc.mockRejectedValueOnce(new Error('Database connection failed'))

      const result = await otpSecurityManager.canRequestOTP('test@example.com')

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('System error')
    })

    it('should handle RPC errors gracefully', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC failed' } })

      const result = await otpSecurityManager.canRequestOTP('test@example.com')

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('System error')
    })
  })

  describe('Cleanup Operations', () => {
    it('should clean up old OTP attempt records', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: 5, error: null })

      const cleaned = await otpSecurityManager.cleanupOldRecords()

      expect(cleaned).toBe(5)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('cleanup_old_otp_attempts')
    })

    it('should reset user attempts (admin function)', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        delete: jest.fn().mockReturnThis(),
      })

      const success = await otpSecurityManager.resetUserAttempts('test@example.com')

      expect(success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('otp_attempts')
    })
  })

  describe('Edge Cases', () => {
    it('should handle concurrent OTP requests', async () => {
      // Simulate concurrent requests
      const promises = Array(5)
        .fill(null)
        .map(() => otpSecurityManager.canRequestOTP('test@example.com'))

      mockSupabase.rpc.mockResolvedValue({ data: true, error: null })

      const results = await Promise.all(promises)

      // All should be allowed initially
      expect(results.every((r) => r.allowed)).toBe(true)
    })

    it('should handle malformed identifiers', async () => {
      const malformedIdentifiers = ['', null, undefined, '   ', '@invalid']

      for (const identifier of malformedIdentifiers) {
        if (identifier) {
          mockSupabase.rpc.mockResolvedValueOnce({ data: false, error: null })
          const result = await otpSecurityManager.canRequestOTP(identifier as string)
          expect(result.allowed).toBe(false)
        }
      }
    })

    it('should handle very long identifiers', async () => {
      const longIdentifier = 'a'.repeat(1000) + '@example.com'
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

      const result = await otpSecurityManager.canRequestOTP(longIdentifier)

      expect(result.allowed).toBe(true)
    })
  })
})
