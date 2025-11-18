/**
 * Context-Aware Logger Utilities
 *
 * Provides logger instances with pre-configured context for consistent
 * metadata across related log entries.
 */

import { log, LogMetadata } from './logger'

/**
 * Creates a logger with additional context.
 *
 * All log calls from the returned logger will automatically include
 * the provided context metadata.
 *
 * @param context - Metadata to include with all logs
 * @returns Logger instance with context
 * @example
 * ```ts
 * const logger = createContextLogger({ module: 'auth', feature: 'login' })
 * logger.info('User login attempt', { email: user.email })
 * // Logs with context: { module: 'auth', feature: 'login', email: user.email }
 * ```
 */
export function createContextLogger(context: LogMetadata) {
  return {
    debug: (message: string, meta?: LogMetadata) => log.debug(message, { ...context, ...meta }),
    info: (message: string, meta?: LogMetadata) => log.info(message, { ...context, ...meta }),
    warn: (message: string, meta?: LogMetadata) => log.warn(message, { ...context, ...meta }),
    error: (message: string, error?: Error | unknown, meta?: LogMetadata) =>
      log.error(message, error, { ...context, ...meta }),
    critical: (message: string, error?: Error | unknown, meta?: LogMetadata) =>
      log.critical(message, error, { ...context, ...meta }),
  }
}

/**
 * Creates a logger for API routes with automatic request context.
 *
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - API route path
 * @param userId - Optional user ID for tracking
 * @returns Logger with API context
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const logger = createAPILogger('GET', '/api/posts', user?.id)
 *   logger.info('Fetching posts')
 *   // Logs: [INFO] Fetching posts { context: 'api', method: 'GET', path: '/api/posts', userId: '...' }
 * }
 * ```
 */
export function createAPILogger(method: string, path: string, userId?: string) {
  return createContextLogger({
    context: 'api',
    method,
    path,
    userId: userId || 'anonymous',
  })
}

/**
 * Creates a logger for database operations.
 *
 * @param operation - Database operation (insert, update, delete, select)
 * @param table - Table name
 * @returns Logger with database context
 * @example
 * ```ts
 * const logger = createDBLogger('insert', 'posts')
 * logger.info('Creating post', { title: post.title })
 * ```
 */
export function createDBLogger(operation: string, table: string) {
  return createContextLogger({
    context: 'database',
    operation,
    table,
  })
}

/**
 * Creates a logger for authentication operations.
 *
 * @returns Logger with auth context
 * @example
 * ```ts
 * const logger = createAuthLogger()
 * logger.info('User sign in attempt', { email: email })
 * ```
 */
export function createAuthLogger() {
  return createContextLogger({
    context: 'auth',
  })
}

/**
 * Creates a logger for background jobs.
 *
 * @param jobName - Name of the background job
 * @returns Logger with job context
 * @example
 * ```ts
 * const logger = createJobLogger('email-queue-processor')
 * logger.info('Job started')
 * ```
 */
export function createJobLogger(jobName: string) {
  return createContextLogger({
    context: 'job',
    jobName,
  })
}
