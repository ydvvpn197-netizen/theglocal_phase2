/**
 * Centralized Error Handling Utilities
 *
 * Provides consistent error handling, user-friendly messages, and retry logic
 * for messaging and notification systems.
 */

import { logger } from '@/lib/utils/logger'

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier?: number
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
}

/**
 * Extracts user-friendly error message from various error types.
 *
 * Handles different error formats including Error instances, strings,
 * and objects with message properties.
 *
 * @param error - Error of unknown type to extract message from
 * @returns Human-readable error message
 * @example
 * ```ts
 * try {
 *   await fetchData()
 * } catch (error) {
 *   const message = getErrorMessage(error)
 *   toast.error(message)
 * }
 * ```
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }

  return 'An unexpected error occurred'
}

/**
 * Checks if error is network-related (connection, fetch, DNS, etc.).
 *
 * Useful for determining if a request should be retried or if
 * a network error message should be shown to the user.
 *
 * @param error - Error to check
 * @returns True if error is network-related
 * @example
 * ```ts
 * try {
 *   await api.fetchPosts()
 * } catch (error) {
 *   if (isNetworkError(error)) {
 *     toast.error('Network error. Please check your connection.')
 *   }
 * }
 * ```
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.message.includes('Failed to fetch') ||
      error.name === 'NetworkError' ||
      error.name === 'TypeError'
    )
  }
  return false
}

/**
 * Checks if error is due to request timeout.
 *
 * @param error - Error to check
 * @returns True if error is timeout-related
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('timeout') ||
      error.message.includes('TIMED_OUT') ||
      error.name === 'TimeoutError'
    )
  }
  return false
}

/**
 * Checks if error should trigger an automatic retry.
 *
 * Returns true for network and timeout errors that are typically
 * transient and may succeed on retry.
 *
 * @param error - Error to check
 * @returns True if error should be retried
 */
export function isRetryableError(error: unknown): boolean {
  return isNetworkError(error) || isTimeoutError(error)
}

/**
 * Converts technical error into user-friendly message.
 *
 * Maps common HTTP status codes and error types to helpful
 * messages suitable for displaying to end users.
 *
 * **Mapped Errors:**
 * - Network errors → "Please check your connection"
 * - Timeout errors → "Request timed out"
 * - 401/unauthorized → "Authentication required"
 * - 403/forbidden → "No permission"
 * - 404/not found → "Resource not found"
 * - 500/server error → "Server error"
 *
 * @param error - Error to convert
 * @returns User-friendly error message
 * @example
 * ```ts
 * try {
 *   await deletePost(postId)
 * } catch (error) {
 *   toast.error(getUserFriendlyMessage(error))
 * }
 * ```
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Network error. Please check your connection and try again.'
  }

  if (isTimeoutError(error)) {
    return 'Request timed out. Please try again.'
  }

  const message = getErrorMessage(error)

  // Common error patterns
  if (message.includes('401') || message.includes('unauthorized')) {
    return 'Authentication required. Please sign in and try again.'
  }

  if (message.includes('403') || message.includes('forbidden')) {
    return 'You do not have permission to perform this action.'
  }

  if (message.includes('404') || message.includes('not found')) {
    return 'The requested resource was not found.'
  }

  if (message.includes('500') || message.includes('server error')) {
    return 'Server error. Please try again later.'
  }

  return message || 'An unexpected error occurred'
}

/**
 * Retries failed async function with exponential backoff strategy.
 *
 * Only retries network and timeout errors. Other errors throw immediately.
 * Delay between retries increases exponentially up to maxDelay.
 *
 * **Default Config:**
 * - maxRetries: 3
 * - baseDelay: 1000ms
 * - maxDelay: 30000ms
 * - backoffMultiplier: 2
 *
 * **Delay Formula:** `min(baseDelay * (multiplier ^ attempt), maxDelay)`
 *
 * @template T - Return type of the function
 * @param fn - Async function to retry
 * @param config - Retry configuration (optional)
 * @param onRetry - Callback on each retry attempt (optional)
 * @returns Promise resolving to function result
 * @throws {Error} If all retry attempts fail or error is not retryable
 * @example
 * ```ts
 * const data = await retryWithBackoff(
 *   () => fetchUserProfile(userId),
 *   { maxRetries: 5, baseDelay: 500 },
 *   (attempt, error) => logger.info(`Retry ${attempt}: ${error.message}`)
 * )
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error

  const backoffMultiplier = config.backoffMultiplier ?? 2

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry on last attempt
      if (attempt >= config.maxRetries) {
        break
      }

      // Only retry retryable errors
      if (!isRetryableError(error)) {
        throw lastError
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(backoffMultiplier, attempt),
        config.maxDelay
      )

      if (onRetry) {
        onRetry(attempt + 1, lastError)
      }

      logger.info('[ErrorHandler] Retry attempt', {
        attempt: attempt + 1,
        maxRetries: config.maxRetries,
        delay,
      })

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

/**
 * Creates type-safe async wrapper with automatic error handling.
 *
 * Wraps async functions to catch errors and call optional error handler.
 * Useful for preventing unhandled promise rejections in event handlers.
 *
 * **Type Safety:** Preserves original function signature
 * **Error Logging:** Logs to console if no handler provided
 *
 * @template T - Function type to wrap
 * @param fn - Async function to wrap
 * @param errorHandler - Optional custom error handler
 * @returns Wrapped function with same signature as input
 * @example
 * ```ts
 * const safeDeletePost = createSafeAsync(
 *   deletePost,
 *   (error) => toast.error(`Failed: ${error.message}`)
 * )
 *
 * // Use in event handler - errors handled automatically
 * <button onClick={() => safeDeletePost(postId)}>Delete</button>
 * ```
 */
export function createSafeAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  errorHandler?: (error: Error) => void
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))

      if (errorHandler) {
        errorHandler(err)
      } else {
        logger.error('[ErrorHandler] Unhandled error', err)
      }

      throw err
    }
  }) as T
}

/**
 * Checks current network connectivity status.
 *
 * Uses navigator.onLine API. Returns true on server-side.
 *
 * @returns True if browser has network connection
 * @example
 * ```ts
 * if (!isOnline()) {
 *   toast.warning('You are offline. Changes will sync when online.')
 * }
 * ```
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') {
    return true // Assume online on server
  }
  return navigator.onLine
}

/**
 * Waits for network connection to be restored.
 *
 * Resolves immediately if already online. Otherwise, listens for
 * 'online' event or rejects after timeout.
 *
 * @param timeout - Max time to wait in milliseconds (default: 30000)
 * @returns Promise that resolves when online
 * @throws {Error} If timeout is reached before connection restored
 * @example
 * ```ts
 * try {
 *   await waitForOnline(10000) // Wait up to 10 seconds
 *   await syncOfflineChanges()
 * } catch (error) {
 *   toast.error('Still offline. Will sync later.')
 * }
 * ```
 */
export function waitForOnline(timeout: number = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isOnline()) {
      resolve()
      return
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener('online', onOnline)
      reject(new Error('Network timeout: waiting for online status'))
    }, timeout)

    const onOnline = () => {
      clearTimeout(timeoutId)
      window.removeEventListener('online', onOnline)
      resolve()
    }

    window.addEventListener('online', onOnline)
  })
}
