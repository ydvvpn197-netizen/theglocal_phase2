/**
 * API Response Utilities
 *
 * Provides helper functions for consistent API responses with proper headers,
 * error handling, and standardized response formats.
 * Ensures Content-Type includes charset=utf-8 for all JSON responses.
 */

import { NextResponse } from 'next/server'
import type { NextResponse as NextResponseType } from 'next/server'
import { log } from './logger'

/**
 * Standard API error class with status code and error code.
 *
 * @example
 * ```ts
 * throw new APIError('User not found', 404, 'USER_NOT_FOUND')
 * ```
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * Standard success response format.
 */
export interface APISuccessResponse<T = unknown> {
  success: true
  data: T
  meta?: Record<string, unknown>
}

/**
 * Standard error response format.
 */
export interface APIErrorResponse {
  success: false
  error: {
    message: string
    code: string
    statusCode: number
    details?: unknown
  }
}

/**
 * Context information for error logging.
 */
export interface ErrorContext {
  method: string
  path: string
  userId?: string
  [key: string]: unknown
}

/**
 * Create a JSON response with proper Content-Type header including charset
 *
 * @param data - Data to be serialized as JSON
 * @param init - Response initialization options
 * @returns NextResponse with proper Content-Type: application/json; charset=utf-8
 */
export function jsonResponse<T>(
  data: T,
  init?: ResponseInit & { status?: number }
): NextResponseType {
  const response = NextResponse.json(data, init)

  // Ensure Content-Type includes charset=utf-8
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('charset=')) {
    response.headers.set('Content-Type', 'application/json; charset=utf-8')
  }

  return response
}

/**
 * Handles API errors with standardized format and logging.
 *
 * Converts errors to consistent JSON responses and logs appropriately
 * based on error type and severity.
 *
 * @param error - Error to handle (APIError or unknown)
 * @param context - Request context for logging
 * @returns NextResponse with error details
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const context = { method: 'GET', path: '/api/posts' }
 *
 *   try {
 *     const posts = await fetchPosts()
 *     return createSuccessResponse(posts)
 *   } catch (error) {
 *     return handleAPIError(error, context)
 *   }
 * }
 * ```
 */
export function handleAPIError(
  error: unknown,
  context: ErrorContext
): NextResponse<APIErrorResponse> {
  // Handle known API errors
  if (error instanceof APIError) {
    const logLevel = error.statusCode >= 500 ? 'error' : 'warn'

    if (logLevel === 'error') {
      log.error('API error', error, context)
    } else {
      log.warn('API validation error', { ...context, error: error.message, code: error.code })
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
        },
      },
      { status: error.statusCode }
    )
  }

  // Handle Supabase errors
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    const dbError = error as { code: string; message: string; details?: string }

    const errorInstance = error instanceof Error ? error : new Error(String(error))
    log.error('Database error', errorInstance, { ...context, dbCode: dbError.code })

    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Database operation failed',
          code: 'DATABASE_ERROR',
          statusCode: 500,
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
        },
      },
      { status: 500 }
    )
  }

  // Handle unexpected errors
  log.critical('Unhandled API error', error as Error, context)

  return NextResponse.json(
    {
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        statusCode: 500,
        details:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : undefined,
      },
    },
    { status: 500 }
  )
}

/**
 * Creates a success response with data and optional metadata.
 *
 * @param data - Response data
 * @param meta - Optional metadata
 * @returns NextResponse with success format and proper Content-Type
 * @example
 * ```ts
 * return createSuccessResponse(posts, { total: posts.length, page: 1 })
 * ```
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: Record<string, unknown>
): NextResponse<APISuccessResponse<T>> {
  const response = NextResponse.json(
    {
      success: true as const,
      data,
      ...(meta && { meta }),
    },
    { status: 200 }
  )

  // Ensure Content-Type includes charset=utf-8
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('charset=')) {
    response.headers.set('Content-Type', 'application/json; charset=utf-8')
  }

  return response as NextResponse<APISuccessResponse<T>>
}

/**
 * Common API error instances for quick use.
 */
export const APIErrors = {
  unauthorized: () => new APIError('Authentication required', 401, 'UNAUTHORIZED'),
  forbidden: () =>
    new APIError('You do not have permission to perform this action', 403, 'FORBIDDEN'),
  notFound: (resource: string = 'Resource') =>
    new APIError(`${resource} not found`, 404, 'NOT_FOUND'),
  badRequest: (message: string) => new APIError(message, 400, 'BAD_REQUEST'),
  conflict: (message: string) => new APIError(message, 409, 'CONFLICT'),
  tooManyRequests: () =>
    new APIError('Too many requests, please try again later', 429, 'RATE_LIMIT_EXCEEDED'),
  internalError: () => new APIError('Internal server error', 500, 'INTERNAL_ERROR'),
}
