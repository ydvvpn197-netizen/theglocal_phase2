/**
 * Transaction Manager
 * Handles database transactions with retry logic and conflict resolution
 */

import { logger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface TransactionConfig {
  maxRetries: number
  retryDelay: number
  timeout: number
  isolationLevel: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE'
}

export interface TransactionResult<T = unknown> {
  success: boolean
  data?: T
  error?: Error
  retryCount: number
  duration: number
}

export interface TransactionOperation<T = unknown> {
  name: string
  operation: (client: SupabaseClient) => Promise<T>
  rollback?: (client: SupabaseClient) => Promise<void>
  retryable?: boolean
}

const DEFAULT_CONFIG: TransactionConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
  isolationLevel: 'READ_COMMITTED',
}

export class TransactionManager {
  private config: TransactionConfig

  constructor(config: Partial<TransactionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Execute operations in a transaction
   */
  async executeTransaction<T>(
    operations: TransactionOperation<T>[],
    config?: Partial<TransactionConfig>
  ): Promise<TransactionResult<T>> {
    const finalConfig = { ...this.config, ...config }
    const startTime = Date.now()
    let retryCount = 0
    let lastError: Error | undefined

    while (retryCount <= finalConfig.maxRetries) {
      try {
        const result = await this.executeWithTimeout(operations, finalConfig)
        const duration = Date.now() - startTime

        return {
          success: true,
          data: result as T,
          retryCount,
          duration,
        }
      } catch (error) {
        lastError = error as Error
        retryCount++

        if (retryCount <= finalConfig.maxRetries && this.isRetryableError(error)) {
          await this.delay(finalConfig.retryDelay * retryCount)
          continue
        }

        break
      }
    }

    const duration = Date.now() - startTime
    return {
      success: false,
      error: lastError,
      retryCount,
      duration,
    }
  }

  /**
   * Execute operations with timeout
   */
  private async executeWithTimeout<T>(
    operations: TransactionOperation<T>[],
    config: TransactionConfig
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Transaction timeout'))
      }, config.timeout)

      this.executeOperations(operations, config)
        .then((result) => {
          clearTimeout(timeout)
          resolve(result as T)
        })
        .catch((error) => {
          clearTimeout(timeout)
          reject(error)
        })
    })
  }

  /**
   * Execute operations in sequence
   */
  private async executeOperations<T>(
    operations: TransactionOperation<T>[],
    _config: TransactionConfig
  ): Promise<T> {
    const supabase = await createClient()
    const results: unknown[] = []

    try {
      // Start transaction
      await supabase.rpc('begin_transaction')

      for (const operation of operations) {
        try {
          const result = await operation.operation(supabase)
          results.push(result)
        } catch (error) {
          // Rollback completed operations
          await this.rollbackOperations(operations.slice(0, results.length), supabase)
          throw error
        }
      }

      // Commit transaction
      await supabase.rpc('commit_transaction')

      return results[results.length - 1] as T
    } catch (error) {
      // Rollback transaction
      await supabase.rpc('rollback_transaction')
      throw error
    }
  }

  /**
   * Rollback completed operations
   */
  private async rollbackOperations(
    operations: TransactionOperation<unknown>[],
    supabase: SupabaseClient
  ): Promise<void> {
    for (const operation of operations.reverse()) {
      if (operation.rollback) {
        try {
          await operation.rollback(supabase)
        } catch (error) {
          logger.error(`Rollback failed for operation ${operation.name}:`, error)
        }
      }
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!error) return false

    const retryableErrors = [
      'connection',
      'timeout',
      'deadlock',
      'lock',
      'serialization',
      'conflict',
    ]

    const errorMessage =
      error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message.toLowerCase()
        : ''
    return retryableErrors.some((keyword) => errorMessage.includes(keyword))
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Execute read-only transaction
   */
  async executeReadOnlyTransaction<T>(
    operation: (client: SupabaseClient) => Promise<T>,
    config?: Partial<TransactionConfig>
  ): Promise<TransactionResult<T>> {
    const finalConfig = { ...this.config, ...config }
    const startTime = Date.now()
    let retryCount = 0
    let lastError: Error | undefined

    while (retryCount <= finalConfig.maxRetries) {
      try {
        const supabase = await createClient()
        const result = await operation(supabase)
        const duration = Date.now() - startTime

        return {
          success: true,
          data: result,
          retryCount,
          duration,
        }
      } catch (error) {
        lastError = error as Error
        retryCount++

        if (retryCount <= finalConfig.maxRetries && this.isRetryableError(error)) {
          await this.delay(finalConfig.retryDelay * retryCount)
          continue
        }

        break
      }
    }

    const duration = Date.now() - startTime
    return {
      success: false,
      error: lastError,
      retryCount,
      duration,
    }
  }

  /**
   * Execute batch operations
   */
  async executeBatch<T>(
    operations: Array<() => Promise<T>>,
    config?: Partial<TransactionConfig>
  ): Promise<TransactionResult<T[]>> {
    const finalConfig = { ...this.config, ...config }
    const startTime = Date.now()
    let retryCount = 0
    let lastError: Error | undefined

    while (retryCount <= finalConfig.maxRetries) {
      try {
        const results = await Promise.all(operations.map((op) => op()))
        const duration = Date.now() - startTime

        return {
          success: true,
          data: results,
          retryCount,
          duration,
        }
      } catch (error) {
        lastError = error as Error
        retryCount++

        if (retryCount <= finalConfig.maxRetries && this.isRetryableError(error)) {
          await this.delay(finalConfig.retryDelay * retryCount)
          continue
        }

        break
      }
    }

    const duration = Date.now() - startTime
    return {
      success: false,
      error: lastError,
      retryCount,
      duration,
    }
  }

  /**
   * Execute with exponential backoff
   */
  async executeWithBackoff<T>(
    operation: () => Promise<T>,
    config?: Partial<TransactionConfig>
  ): Promise<TransactionResult<T>> {
    const finalConfig = { ...this.config, ...config }
    const startTime = Date.now()
    let retryCount = 0
    let lastError: Error | undefined

    while (retryCount <= finalConfig.maxRetries) {
      try {
        const result = await operation()
        const duration = Date.now() - startTime

        return {
          success: true,
          data: result,
          retryCount,
          duration,
        }
      } catch (error) {
        lastError = error as Error
        retryCount++

        if (retryCount <= finalConfig.maxRetries && this.isRetryableError(error)) {
          const backoffDelay = finalConfig.retryDelay * Math.pow(2, retryCount - 1)
          await this.delay(backoffDelay)
          continue
        }

        break
      }
    }

    const duration = Date.now() - startTime
    return {
      success: false,
      error: lastError,
      retryCount,
      duration,
    }
  }

  /**
   * Get transaction statistics
   */
  getStats(): {
    config: TransactionConfig
    isHealthy: boolean
  } {
    return {
      config: this.config,
      isHealthy: true,
    }
  }
}

// Export singleton instance
export const transactionManager = new TransactionManager()

/**
 * Utility function to execute transaction
 */
export async function executeTransaction<T>(
  operations: TransactionOperation<T>[],
  config?: Partial<TransactionConfig>
): Promise<TransactionResult<T>> {
  return transactionManager.executeTransaction(operations, config)
}

/**
 * Utility function to execute read-only transaction
 */
export async function executeReadOnlyTransaction<T>(
  operation: (client: SupabaseClient) => Promise<T>,
  config?: Partial<TransactionConfig>
): Promise<TransactionResult<T>> {
  return transactionManager.executeReadOnlyTransaction(operation, config)
}

/**
 * Utility function to execute batch operations
 */
export async function executeBatch<T>(
  operations: Array<() => Promise<T>>,
  config?: Partial<TransactionConfig>
): Promise<TransactionResult<T[]>> {
  return transactionManager.executeBatch(operations, config)
}
