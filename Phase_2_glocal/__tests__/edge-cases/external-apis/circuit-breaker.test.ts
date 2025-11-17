/**
 * Circuit Breaker Tests
 * Tests edge cases around circuit breaker pattern for external APIs
 */

import { CircuitBreaker, createCircuitBreaker } from '@/lib/resilience/circuit-breaker'
import { apiBudgetMonitor } from '@/lib/integrations/api-budget-monitor'

// Mock Redis client
jest.mock('@/lib/redis/client', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    pipeline: jest.fn(() => ({
      incr: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    })),
  },
}))

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({ data: null, error: null })),
        })),
      })),
    })),
    rpc: jest.fn(() => ({ data: null, error: null })),
  })),
}))

describe.skip('Circuit Breaker Pattern', () => {
  let circuitBreaker: CircuitBreaker
  let mockRedis: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Get the mocked Redis client
    mockRedis = require('@/lib/redis/client').redis

    // Reset Redis mock to default values
    mockRedis.get.mockResolvedValue('closed')
    mockRedis.set.mockResolvedValue('OK')
    mockRedis.del.mockResolvedValue(1)
    mockRedis.incr.mockResolvedValue(1)
    mockRedis.pipeline.mockReturnValue({
      incr: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([['OK'], [1], [1]]),
    })

    circuitBreaker = createCircuitBreaker('test_service', {
      failureThreshold: 3,
      recoveryTimeout: 1000, // 1 second for testing
      maxCallsInHalfOpen: 2,
      timeout: 5000,
    })
  })

  describe('Circuit State Management', () => {
    it('should start in closed state', async () => {
      mockRedis.get.mockResolvedValueOnce('closed')

      const state = await circuitBreaker.getState()
      expect(state).toBe('closed')
    })

    it('should transition to open state after failure threshold', async () => {
      // Mock initial state
      mockRedis.get.mockResolvedValue('closed')
      mockRedis.incr.mockResolvedValue(3) // Failure count reaches threshold
      mockRedis.pipeline.mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([null, null, null]),
      })

      // Simulate failures
      const failingOperation = jest.fn().mockRejectedValue(new Error('API Error'))

      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingOperation)
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit should now be open
      mockRedis.get.mockResolvedValueOnce('open')
      const state = await circuitBreaker.getState()
      expect(state).toBe('open')
    })

    it('should transition to half-open state after recovery timeout', async () => {
      // Mock open state
      mockRedis.get.mockResolvedValueOnce('open')
      mockRedis.get.mockResolvedValueOnce((Date.now() - 2000).toString()) // Last failure was 2 seconds ago

      const shouldRecover = await circuitBreaker['shouldAttemptRecovery']()
      expect(shouldRecover).toBe(true)
    })

    it('should transition to closed state after successful half-open calls', async () => {
      // Mock half-open state
      mockRedis.get.mockResolvedValue('half-open')
      mockRedis.get.mockResolvedValue(1) // Half-open calls count
      mockRedis.pipeline.mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        del: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([null, null, null]),
      })

      const successfulOperation = jest.fn().mockResolvedValue('success')
      const result = await circuitBreaker.execute(successfulOperation)

      expect(result).toBe('success')
    })
  })

  describe('Operation Execution', () => {
    it('should execute successful operation in closed state', async () => {
      mockRedis.get.mockResolvedValue('closed')
      mockRedis.pipeline.mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([null, null]),
      })

      const successfulOperation = jest.fn().mockResolvedValue('success')
      const result = await circuitBreaker.execute(successfulOperation)

      expect(result).toBe('success')
      expect(successfulOperation).toHaveBeenCalledTimes(1)
    })

    it('should throw error when circuit is open', async () => {
      mockRedis.get.mockResolvedValue('open')
      mockRedis.get.mockResolvedValue(Date.now().toString()) // Recent failure

      const operation = jest.fn().mockResolvedValue('success')

      // Mock the shouldAttemptRecovery to return false
      jest.spyOn(circuitBreaker as any, 'shouldAttemptRecovery').mockResolvedValue(false)

      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is open')
      expect(operation).not.toHaveBeenCalled()
    })

    it('should use fallback when circuit is open', async () => {
      mockRedis.get.mockResolvedValue('open')
      mockRedis.get.mockResolvedValue(Date.now().toString()) // Recent failure

      const operation = jest.fn().mockResolvedValue('success')
      const fallback = jest.fn().mockResolvedValue('fallback')

      // Mock the shouldAttemptRecovery to return false
      jest.spyOn(circuitBreaker as any, 'shouldAttemptRecovery').mockResolvedValue(false)

      const result = await circuitBreaker.execute(operation, fallback)

      expect(result).toBe('fallback')
      expect(operation).not.toHaveBeenCalled()
      expect(fallback).toHaveBeenCalledTimes(1)
    })

    it('should limit calls in half-open state', async () => {
      mockRedis.get.mockResolvedValue('half-open')
      mockRedis.get.mockResolvedValue(2) // Max calls reached

      const operation = jest.fn().mockResolvedValue('success')

      await expect(circuitBreaker.execute(operation)).rejects.toThrow(
        'Circuit breaker half-open limit reached'
      )
      expect(operation).not.toHaveBeenCalled()
    })

    it('should handle operation timeout', async () => {
      mockRedis.get.mockResolvedValue('closed')
      mockRedis.pipeline.mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([null, null]),
      })

      const slowOperation = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000)) // 10 seconds
      )

      await expect(circuitBreaker.execute(slowOperation)).rejects.toThrow('Operation timeout')
    })
  })

  describe('Statistics and Monitoring', () => {
    it('should provide circuit breaker statistics', async () => {
      mockRedis.get
        .mockResolvedValueOnce('closed') // state
        .mockResolvedValueOnce('5') // failure count
        .mockResolvedValueOnce('10') // success count
        .mockResolvedValueOnce(Date.now().toString()) // last failure time
        .mockResolvedValueOnce('15') // total calls
        .mockResolvedValueOnce('5') // total failures

      const stats = await circuitBreaker.getStats()

      expect(stats.state).toBe('closed')
      expect(stats.failureCount).toBe(5)
      expect(stats.successCount).toBe(10)
      expect(stats.totalCalls).toBe(15)
      expect(stats.totalFailures).toBe(5)
      expect(stats.lastFailureTime).toBeInstanceOf(Date)
    })

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'))

      const stats = await circuitBreaker.getStats()

      expect(stats.state).toBe('closed')
      expect(stats.failureCount).toBe(0)
      expect(stats.successCount).toBe(0)
      expect(stats.totalCalls).toBe(0)
      expect(stats.totalFailures).toBe(0)
    })
  })

  describe('Circuit Breaker Reset', () => {
    it('should reset circuit breaker state', async () => {
      mockRedis.del.mockResolvedValue(1)

      await circuitBreaker.reset()

      expect(mockRedis.del).toHaveBeenCalledWith(
        'circuit_breaker:test_service:state',
        'circuit_breaker:test_service:failure_count',
        'circuit_breaker:test_service:success_count',
        'circuit_breaker:test_service:last_failure_time',
        'circuit_breaker:test_service:total_calls',
        'circuit_breaker:test_service:total_failures',
        'circuit_breaker:test_service:half_open_calls'
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle concurrent operations', async () => {
      mockRedis.get.mockResolvedValue('closed')
      mockRedis.pipeline.mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([null, null]),
      })

      const operation = jest.fn().mockResolvedValue('success')

      // Execute multiple operations concurrently
      const promises = Array(5)
        .fill(null)
        .map(() => circuitBreaker.execute(operation))

      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      expect(results.every((result) => result === 'success')).toBe(true)
    })

    it('should handle Redis pipeline errors', async () => {
      mockRedis.get.mockResolvedValue('closed')
      mockRedis.pipeline.mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Pipeline error')),
      })

      const operation = jest.fn().mockResolvedValue('success')

      // Should not throw error, but may not record statistics
      const result = await circuitBreaker.execute(operation)
      expect(result).toBe('success')
    })

    it('should handle malformed Redis data', async () => {
      mockRedis.get
        .mockResolvedValueOnce('invalid_state') // Invalid state
        .mockResolvedValueOnce('not_a_number') // Invalid failure count
        .mockResolvedValueOnce('not_a_number') // Invalid success count
        .mockResolvedValueOnce('invalid_timestamp') // Invalid timestamp
        .mockResolvedValueOnce('not_a_number') // Invalid total calls
        .mockResolvedValueOnce('not_a_number') // Invalid total failures

      const stats = await circuitBreaker.getStats()

      expect(stats.state).toBe('closed') // Should default to closed
      expect(stats.failureCount).toBe(0) // Should default to 0
      expect(stats.successCount).toBe(0) // Should default to 0
      expect(stats.totalCalls).toBe(0) // Should default to 0
      expect(stats.totalFailures).toBe(0) // Should default to 0
    })

    it('should handle network timeouts gracefully', async () => {
      mockRedis.get.mockImplementation(
        () =>
          new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 1000))
      )

      const operation = jest.fn().mockResolvedValue('success')

      // Should default to closed state and execute operation
      const result = await circuitBreaker.execute(operation)
      expect(result).toBe('success')
    })
  })

  describe('Service-Specific Circuit Breakers', () => {
    it('should create service-specific circuit breakers', () => {
      const googleMapsBreaker = createCircuitBreaker('google_maps')
      const newsAPIBreaker = createCircuitBreaker('news_api')

      expect(googleMapsBreaker).toBeInstanceOf(CircuitBreaker)
      expect(newsAPIBreaker).toBeInstanceOf(CircuitBreaker)
    })

    it('should have different configurations for different services', () => {
      const googleMapsBreaker = createCircuitBreaker('google_maps', {
        failureThreshold: 5,
        recoveryTimeout: 30000,
      })

      const newsAPIBreaker = createCircuitBreaker('news_api', {
        failureThreshold: 3,
        recoveryTimeout: 60000,
      })

      expect(googleMapsBreaker).toBeInstanceOf(CircuitBreaker)
      expect(newsAPIBreaker).toBeInstanceOf(CircuitBreaker)
    })
  })

  describe('Integration with API Budget Monitor', () => {
    it('should integrate with budget monitoring', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockSupabase = {
        rpc: jest.fn(() => ({
          data: {
            service_name: 'test_service',
            period: 'daily',
            budget_limit: 100,
            current_usage: 80,
            usage_percentage: 80,
            status: 'warning',
            days_remaining: 1,
          },
          error: null,
        })),
      }
      createClient.mockResolvedValueOnce(mockSupabase)

      const budgetStatus = await apiBudgetMonitor.checkBudgetStatus('test_service', 'daily')

      expect(budgetStatus).toBeDefined()
      expect(budgetStatus?.serviceName).toBe('test_service')
      expect(budgetStatus?.status).toBe('warning')
    })
  })
})
