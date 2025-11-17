/**
 * Circuit Breaker Pattern
 * Implements circuit breaker for external API calls
 */

import { logger } from '@/lib/utils/logger'
import { redis } from '@/lib/redis/client'

export interface CircuitBreakerConfig {
  failureThreshold: number // Number of failures before opening circuit
  recoveryTimeout: number // Time in ms to wait before trying again
  maxCallsInHalfOpen: number // Max calls allowed in half-open state
  timeout: number // Request timeout in ms
}

export type CircuitState = 'closed' | 'open' | 'half-open'

export interface CircuitBreakerStats {
  state: CircuitState
  failureCount: number
  successCount: number
  lastFailureTime?: Date
  nextAttemptTime?: Date
  totalCalls: number
  totalFailures: number
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 30000, // 30 seconds
  maxCallsInHalfOpen: 3,
  timeout: 10000, // 10 seconds
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig
  private serviceName: string

  constructor(serviceName: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.serviceName = serviceName
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    const state = await this.getState()

    if (state === 'open') {
      if (await this.shouldAttemptRecovery()) {
        await this.setState('half-open')
      } else {
        if (fallback) {
          return await fallback()
        }
        throw new Error(`Circuit breaker is open for ${this.serviceName}`)
      }
    }

    if (state === 'half-open') {
      const halfOpenCalls = await this.getHalfOpenCalls()
      if (halfOpenCalls >= this.config.maxCallsInHalfOpen) {
        if (fallback) {
          return await fallback()
        }
        throw new Error(`Circuit breaker half-open limit reached for ${this.serviceName}`)
      }
    }

    try {
      const result = await this.executeWithTimeout(operation)
      await this.recordSuccess()
      return result
    } catch (error) {
      await this.recordFailure()
      throw error
    }
  }

  /**
   * Get current circuit breaker state
   */
  async getState(): Promise<CircuitState> {
    try {
      const state = await redis.get(`circuit_breaker:${this.serviceName}:state`)
      return (state as CircuitState) || 'closed'
    } catch (error) {
      logger.error('Failed to get circuit breaker state:', error)
      return 'closed'
    }
  }

  /**
   * Get circuit breaker statistics
   */
  async getStats(): Promise<CircuitBreakerStats> {
    try {
      const [state, failureCount, successCount, lastFailureTime, totalCalls, totalFailures] =
        await Promise.all([
          this.getState(),
          this.getFailureCount(),
          this.getSuccessCount(),
          this.getLastFailureTime(),
          this.getTotalCalls(),
          this.getTotalFailures(),
        ])

      const nextAttemptTime =
        state === 'open' && lastFailureTime
          ? new Date(lastFailureTime.getTime() + this.config.recoveryTimeout)
          : undefined

      return {
        state,
        failureCount,
        successCount,
        lastFailureTime,
        nextAttemptTime,
        totalCalls,
        totalFailures,
      }
    } catch (error) {
      logger.error('Failed to get circuit breaker stats:', error)
      return {
        state: 'closed',
        failureCount: 0,
        successCount: 0,
        totalCalls: 0,
        totalFailures: 0,
      }
    }
  }

  /**
   * Reset circuit breaker
   */
  async reset(): Promise<void> {
    try {
      const keys = [
        `circuit_breaker:${this.serviceName}:state`,
        `circuit_breaker:${this.serviceName}:failure_count`,
        `circuit_breaker:${this.serviceName}:success_count`,
        `circuit_breaker:${this.serviceName}:last_failure_time`,
        `circuit_breaker:${this.serviceName}:total_calls`,
        `circuit_breaker:${this.serviceName}:total_failures`,
        `circuit_breaker:${this.serviceName}:half_open_calls`,
      ]

      await redis.del(...keys)
    } catch (error) {
      logger.error('Failed to reset circuit breaker:', error)
    }
  }

  /**
   * Set circuit breaker state
   */
  private async setState(state: CircuitState): Promise<void> {
    try {
      await redis.set(`circuit_breaker:${this.serviceName}:state`, state)
    } catch (error) {
      logger.error('Failed to set circuit breaker state:', error)
    }
  }

  /**
   * Record successful operation
   */
  private async recordSuccess(): Promise<void> {
    try {
      const pipeline = redis.pipeline()

      // Increment success count
      pipeline.incr(`circuit_breaker:${this.serviceName}:success_count`)

      // Increment total calls
      pipeline.incr(`circuit_breaker:${this.serviceName}:total_calls`)

      // Reset failure count
      pipeline.del(`circuit_breaker:${this.serviceName}:failure_count`)

      // If in half-open state, check if we should close the circuit
      const state = await this.getState()
      if (state === 'half-open') {
        const halfOpenCalls = await this.getHalfOpenCalls()
        if (halfOpenCalls >= this.config.maxCallsInHalfOpen) {
          pipeline.set(`circuit_breaker:${this.serviceName}:state`, 'closed')
          pipeline.del(`circuit_breaker:${this.serviceName}:half_open_calls`)
        } else {
          pipeline.incr(`circuit_breaker:${this.serviceName}:half_open_calls`)
        }
      }

      await pipeline.exec()
    } catch (error) {
      logger.error('Failed to record success:', error)
    }
  }

  /**
   * Record failed operation
   */
  private async recordFailure(): Promise<void> {
    try {
      const pipeline = redis.pipeline()

      // Increment failure count
      pipeline.incr(`circuit_breaker:${this.serviceName}:failure_count`)

      // Increment total calls and failures
      pipeline.incr(`circuit_breaker:${this.serviceName}:total_calls`)
      pipeline.incr(`circuit_breaker:${this.serviceName}:total_failures`)

      // Set last failure time
      pipeline.set(`circuit_breaker:${this.serviceName}:last_failure_time`, Date.now())

      // Check if we should open the circuit
      const failureCount = await this.getFailureCount()
      if (failureCount >= this.config.failureThreshold) {
        pipeline.set(`circuit_breaker:${this.serviceName}:state`, 'open')
      }

      await pipeline.exec()
    } catch (error) {
      logger.error('Failed to record failure:', error)
    }
  }

  /**
   * Check if we should attempt recovery
   */
  private async shouldAttemptRecovery(): Promise<boolean> {
    try {
      const lastFailureTime = await this.getLastFailureTime()
      if (!lastFailureTime) {
        return true
      }

      const timeSinceFailure = Date.now() - lastFailureTime.getTime()
      return timeSinceFailure >= this.config.recoveryTimeout
    } catch (error) {
      logger.error('Failed to check recovery eligibility:', error)
      return false
    }
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timeout for ${this.serviceName}`))
      }, this.config.timeout)

      operation()
        .then((result) => {
          clearTimeout(timeout)
          resolve(result)
        })
        .catch((error) => {
          clearTimeout(timeout)
          reject(error)
        })
    })
  }

  /**
   * Get failure count
   */
  private async getFailureCount(): Promise<number> {
    try {
      const count = await redis.get(`circuit_breaker:${this.serviceName}:failure_count`)
      return parseInt(count || '0')
    } catch (error) {
      logger.error('Failed to get failure count:', error)
      return 0
    }
  }

  /**
   * Get success count
   */
  private async getSuccessCount(): Promise<number> {
    try {
      const count = await redis.get(`circuit_breaker:${this.serviceName}:success_count`)
      return parseInt(count || '0')
    } catch (error) {
      logger.error('Failed to get success count:', error)
      return 0
    }
  }

  /**
   * Get last failure time
   */
  private async getLastFailureTime(): Promise<Date | undefined> {
    try {
      const timestamp = await redis.get(`circuit_breaker:${this.serviceName}:last_failure_time`)
      return timestamp ? new Date(parseInt(timestamp)) : undefined
    } catch (error) {
      logger.error('Failed to get last failure time:', error)
      return undefined
    }
  }

  /**
   * Get total calls
   */
  private async getTotalCalls(): Promise<number> {
    try {
      const count = await redis.get(`circuit_breaker:${this.serviceName}:total_calls`)
      return parseInt(count || '0')
    } catch (error) {
      logger.error('Failed to get total calls:', error)
      return 0
    }
  }

  /**
   * Get total failures
   */
  private async getTotalFailures(): Promise<number> {
    try {
      const count = await redis.get(`circuit_breaker:${this.serviceName}:total_failures`)
      return parseInt(count || '0')
    } catch (error) {
      logger.error('Failed to get total failures:', error)
      return 0
    }
  }

  /**
   * Get half-open calls count
   */
  private async getHalfOpenCalls(): Promise<number> {
    try {
      const count = await redis.get(`circuit_breaker:${this.serviceName}:half_open_calls`)
      return parseInt(count || '0')
    } catch (error) {
      logger.error('Failed to get half-open calls:', error)
      return 0
    }
  }
}

// Circuit breaker instances for different services
export const googleMapsCircuitBreaker = new CircuitBreaker('google_maps', {
  failureThreshold: 5,
  recoveryTimeout: 30000,
  maxCallsInHalfOpen: 3,
  timeout: 10000,
})

export const newsAPICircuitBreaker = new CircuitBreaker('news_api', {
  failureThreshold: 3,
  recoveryTimeout: 60000,
  maxCallsInHalfOpen: 2,
  timeout: 15000,
})

export const redditAPICircuitBreaker = new CircuitBreaker('reddit_api', {
  failureThreshold: 5,
  recoveryTimeout: 45000,
  maxCallsInHalfOpen: 3,
  timeout: 12000,
})

export const openAICircuitBreaker = new CircuitBreaker('openai', {
  failureThreshold: 3,
  recoveryTimeout: 60000,
  maxCallsInHalfOpen: 2,
  timeout: 30000,
})

// Circuit breaker factory
export function createCircuitBreaker(
  serviceName: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  return new CircuitBreaker(serviceName, config)
}
