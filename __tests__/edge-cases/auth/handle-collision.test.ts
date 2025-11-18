/**
 * Handle Collision Prevention Tests
 * Tests the edge cases around anonymous handle generation and collision prevention
 */

import {
  generateAnonymousHandle,
  generateUniqueAnonymousHandle,
  isValidAnonymousHandle,
} from '@/lib/utils/anonymous-id'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('Handle Collision Prevention', () => {
  const mockSupabase = {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
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

  describe('Handle Generation', () => {
    it('should generate handles with 3-digit suffix', () => {
      const handle = generateAnonymousHandle()

      expect(handle).toMatch(/^Local[A-Z][a-z]+[A-Z][a-z]+\d{3}$/)
      expect(handle.length).toBeGreaterThan(10) // Base + 3 digits
    })

    it('should generate unique handles across multiple calls', () => {
      const handles = new Set()
      for (let i = 0; i < 100; i++) {
        handles.add(generateAnonymousHandle())
      }

      // Should have high uniqueness (at least 95% unique)
      expect(handles.size).toBeGreaterThan(95)
    })

    it('should validate handle format correctly', () => {
      const validHandles = ['LocalHappyPanda123', 'LocalSwiftTiger987', 'LocalBrightEagle555']

      const invalidHandles = [
        'LocalHappyPanda12', // Too short (only 2 digits)
        'LocalHappyPanda1234', // Too long (4 digits)
        'localHappyPanda123', // Wrong case
        'HappyPanda123', // Missing Local prefix
        'LocalHappyPanda12a', // Contains letter in suffix
      ]

      validHandles.forEach((handle) => {
        expect(isValidAnonymousHandle(handle)).toBe(true)
      })

      invalidHandles.forEach((handle) => {
        expect(isValidAnonymousHandle(handle)).toBe(false)
      })
    })
  })

  describe('Database Handle Generation', () => {
    it('should generate unique handle by checking database', async () => {
      // Mock that handle doesn't exist (null response)
      const mockFromReturn = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
        insert: jest.fn(),
        delete: jest.fn(),
      }
      mockSupabase.from.mockReturnValue(
        mockFromReturn as unknown as ReturnType<typeof mockSupabase.from>
      )

      const handle = await generateUniqueAnonymousHandle('user-123')

      expect(handle).toMatch(/^Local[A-Z][a-z]+[A-Z][a-z]+\d{3}$/)
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })

    it('should retry on collision', async () => {
      // Mock that handle exists, then doesn't exist
      const mockFromReturn = {
        select: jest.fn().mockReturnValue({
          eq: jest
            .fn()
            .mockReturnValueOnce({
              single: jest.fn().mockResolvedValue({ data: { id: 'existing' }, error: null }),
            })
            .mockReturnValueOnce({
              single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            }),
        }),
        insert: jest.fn(),
        delete: jest.fn(),
      }
      mockSupabase.from.mockReturnValue(
        mockFromReturn as unknown as ReturnType<typeof mockSupabase.from>
      )

      const handle = await generateUniqueAnonymousHandle('user-123')

      expect(handle).toMatch(/^Local[A-Z][a-z]+[A-Z][a-z]+\d{3}$/)
    })

    it('should fallback to user-based handle after max attempts', async () => {
      // Mock that all handles exist (max attempts reached)
      const mockFromReturn = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 'existing' }, error: null }),
          }),
        }),
        insert: jest.fn(),
        delete: jest.fn(),
      }
      mockSupabase.from.mockReturnValue(
        mockFromReturn as unknown as ReturnType<typeof mockSupabase.from>
      )

      const handle = await generateUniqueAnonymousHandle('user-123')

      // Should fallback to userId-based handle
      expect(handle).toMatch(/^LocalUser/)
      expect(handle.length).toBeGreaterThan(10)
    })
  })

  describe('High Concurrency Scenarios', () => {
    it('should handle concurrent handle generation', async () => {
      // Mock that handles don't exist (available)
      const mockFromReturn = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
        insert: jest.fn(),
        delete: jest.fn(),
      }
      mockSupabase.from.mockReturnValue(
        mockFromReturn as unknown as ReturnType<typeof mockSupabase.from>
      )

      const promises = Array(10)
        .fill(null)
        .map((_, index) => generateUniqueAnonymousHandle(`user-${index}`))

      const handles = await Promise.all(promises)

      // All should succeed with valid handles
      expect(handles).toHaveLength(10)
      handles.forEach((handle) => {
        expect(handle).toMatch(/^Local[A-Z][a-z]+[A-Z][a-z]+\d{3}$/)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty user IDs', async () => {
      const mockFromReturn = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
        insert: jest.fn(),
        delete: jest.fn(),
      }
      mockSupabase.from.mockReturnValue(
        mockFromReturn as unknown as ReturnType<typeof mockSupabase.from>
      )

      const handle = await generateUniqueAnonymousHandle('')
      expect(handle).toMatch(/^LocalUser/)
    })

    it('should handle database timeout scenarios', async () => {
      const mockFromReturn = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Connection timeout')),
          }),
        }),
        insert: jest.fn(),
        delete: jest.fn(),
      }
      mockSupabase.from.mockReturnValue(
        mockFromReturn as unknown as ReturnType<typeof mockSupabase.from>
      )

      const handle = await generateUniqueAnonymousHandle('user-123')

      // Should fallback to user-based handle on error
      expect(handle).toMatch(/^LocalUser/)
    })
  })

  describe('Profanity Filter', () => {
    it('should generate handles that pass profanity filter', () => {
      const handles = []
      for (let i = 0; i < 100; i++) {
        handles.push(generateAnonymousHandle())
      }

      // All handles should be valid and not contain inappropriate content
      handles.forEach((handle) => {
        expect(isValidAnonymousHandle(handle)).toBe(true)
        expect(handle).not.toMatch(/badword1|badword2/i)
      })
    })
  })

  describe('Performance', () => {
    it('should generate handles quickly', () => {
      const start = Date.now()

      for (let i = 0; i < 1000; i++) {
        generateAnonymousHandle()
      }

      const duration = Date.now() - start
      expect(duration).toBeLessThan(1000) // Should complete in under 1 second
    })

    it('should handle database operations efficiently', async () => {
      const start = Date.now()

      const mockFromReturn = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
        insert: jest.fn(),
        delete: jest.fn(),
      }
      mockSupabase.from.mockReturnValue(
        mockFromReturn as unknown as ReturnType<typeof mockSupabase.from>
      )

      const promises = Array(100)
        .fill(null)
        .map(() => generateUniqueAnonymousHandle('user-123'))

      await Promise.all(promises)

      const duration = Date.now() - start
      expect(duration).toBeLessThan(5000) // Should complete in under 5 seconds
    })
  })
})
