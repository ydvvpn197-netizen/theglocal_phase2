/**
 * Structured Logger Utility
 *
 * Provides centralized logging with support for multiple severity levels
 * and automatic integration with Better Stack / LogTail in production.
 *
 * @example
 * ```ts
 * import { log } from '@/lib/utils/logger'
 *
 * log.info('User signed in', { userId: user.id })
 * log.error('Failed to fetch posts', error, { userId: user.id })
 * ```
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical'

export interface LogMetadata {
  [key: string]: unknown
}

// Helper type for logger methods that accept flexible metadata
export type LogMetadataInput = LogMetadata | string | number | boolean | null | undefined | unknown

/**
 * Environment-aware logger that uses console in development
 * and can be extended with external services in production.
 */
class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'

  /**
   * Formats log message with metadata
   */
  private formatMessage(level: LogLevel, message: string, meta?: LogMetadataInput): string {
    const timestamp = new Date().toISOString()
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`
  }

  /**
   * Sends log to external service (Better Stack / LogTail)
   */
  private async sendToExternalService(
    _level: LogLevel,
    _message: string,
    _meta?: LogMetadataInput,
    _error?: Error
  ): Promise<void> {
    // In production, send to Better Stack / LogTail
    // This would be replaced with actual Logtail integration
    if (this.isProduction && typeof window === 'undefined') {
      // Server-side only
      // TODO: Integrate with @logtail/node when LOGTAIL_SOURCE_TOKEN is available
      // For now, just use console
    }
  }

  /**
   * Debug-level logging (verbose, development only).
   *
   * @param message - Log message
   * @param meta - Additional metadata
   * @example
   * ```ts
   * log.debug('Query executed', { query: 'SELECT * FROM posts', duration: 45 })
   * ```
   */
  debug(message: string, meta?: LogMetadataInput): void {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.debug(this.formatMessage('debug', message, meta))
    }
  }

  /**
   * Info-level logging (general information).
   *
   * @param message - Log message
   * @param meta - Additional metadata
   * @example
   * ```ts
   * log.info('User signed in', { userId: user.id, email: user.email })
   * ```
   */
  info(message: string, meta?: LogMetadataInput): void {
    // eslint-disable-next-line no-console
    console.info(this.formatMessage('info', message, meta))
    this.sendToExternalService('info', message, meta).catch(() => {
      // Ignore logging errors
    })
  }

  /**
   * Warning-level logging (potential issues).
   *
   * @param message - Log message
   * @param meta - Additional metadata
   * @example
   * ```ts
   * log.warn('Rate limit approaching', { requests: 95, limit: 100 })
   * ```
   */
  warn(message: string, meta?: LogMetadataInput): void {
    console.warn(this.formatMessage('warn', message, meta))
    this.sendToExternalService('warn', message, meta).catch(() => {
      // Ignore logging errors
    })
  }

  /**
   * Error-level logging (errors that need attention).
   *
   * @param message - Log message
   * @param error - Error object (optional)
   * @param meta - Additional metadata
   * @example
   * ```ts
   * try {
   *   await fetchPosts()
   * } catch (error) {
   *   log.error('Failed to fetch posts', error, { userId: user.id })
   * }
   * ```
   */
  error(message: string, error?: Error | unknown, meta?: LogMetadataInput): void {
    const errorMeta =
      error instanceof Error
        ? {
            ...(typeof meta === 'object' && meta !== null && !Array.isArray(meta) ? meta : {}),
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name,
            },
          }
        : meta

    console.error(this.formatMessage('error', message, errorMeta), error)
    this.sendToExternalService('error', message, errorMeta, error as Error).catch(() => {
      // Ignore logging errors
    })
  }

  /**
   * Critical-level logging (system failures, requires immediate action).
   *
   * @param message - Log message
   * @param error - Error object (optional)
   * @param meta - Additional metadata
   * @example
   * ```ts
   * log.critical('Database connection failed', error, { attempts: 3 })
   * ```
   */
  critical(message: string, error?: Error | unknown, meta?: LogMetadataInput): void {
    const errorMeta =
      error instanceof Error
        ? {
            ...(typeof meta === 'object' && meta !== null && !Array.isArray(meta) ? meta : {}),
            severity: 'critical',
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name,
            },
          }
        : {
            ...(typeof meta === 'object' && meta !== null && !Array.isArray(meta) ? meta : {}),
            severity: 'critical',
          }

    console.error(this.formatMessage('critical', message, errorMeta), error)
    this.sendToExternalService('critical', message, errorMeta, error as Error).catch(() => {
      // Ignore logging errors
    })
  }
}

/**
 * Global logger instance.
 * Import and use this throughout the application.
 */
export const log = new Logger()

/**
 * Legacy logger export for backwards compatibility.
 *
 * @deprecated Use `log` instead
 */
export const logger = {
  debug: (message: string, meta?: LogMetadataInput) => log.debug(message, meta),
  info: (message: string, meta?: LogMetadataInput) => log.info(message, meta),
  warn: (message: string, meta?: LogMetadataInput) => log.warn(message, meta),
  error: (message: string, error?: Error | unknown, meta?: LogMetadataInput) =>
    log.error(message, error, meta),
}
