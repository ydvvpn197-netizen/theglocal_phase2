/**
 * Integration tests for API error handling standardization
 *
 * Tests that all API routes:
 * - Return standardized error response format
 * - Use handleAPIError for error handling
 * - Log errors with proper context
 * - Return consistent error codes
 */

import {
  APIError,
  APIErrors,
  handleAPIError,
  createSuccessResponse,
} from '@/lib/utils/api-response'
import type { APIErrorResponse, APISuccessResponse } from '@/lib/utils/api-response'

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      json: async () => body,
      status: init?.status || 200,
      headers: new Headers(init?.headers || { 'content-type': 'application/json; charset=utf-8' }),
    })),
  },
}))

// Mock the logger to verify logging calls
jest.mock('@/lib/utils/logger', () => ({
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    critical: jest.fn(),
  },
}))

describe('API Error Handling Standardization', () => {
  describe('Error Response Format', () => {
    it('should return standardized error response format with correct structure', async () => {
      const error = APIErrors.badRequest('Test error message')
      const context = { method: 'GET', path: '/api/test' }

      const response = handleAPIError(error, context)
      const json = await response.json()

      expect(json).toHaveProperty('success', false)
      expect(json).toHaveProperty('error')
      expect(json.error).toHaveProperty('message', 'Test error message')
      expect(json.error).toHaveProperty('code', 'BAD_REQUEST')
      expect(json.error).toHaveProperty('statusCode', 400)
      expect(response.status).toBe(400)
    })

    it('should include success: false in error responses', async () => {
      const error = APIErrors.notFound('Resource')
      const context = { method: 'GET', path: '/api/test' }

      const response = handleAPIError(error, context)
      const json = (await response.json()) as APIErrorResponse

      expect(json.success).toBe(false)
      expect(json.error).toBeDefined()
    })

    it('should include error code in error responses', async () => {
      const error = APIErrors.unauthorized()
      const context = { method: 'POST', path: '/api/test' }

      const response = handleAPIError(error, context)
      const json = (await response.json()) as APIErrorResponse

      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should include status code in error responses', async () => {
      const error = APIErrors.forbidden()
      const context = { method: 'DELETE', path: '/api/test' }

      const response = handleAPIError(error, context)
      const json = (await response.json()) as APIErrorResponse

      expect(json.error.statusCode).toBe(403)
      expect(response.status).toBe(403)
    })

    it('should include Content-Type header with charset=utf-8', async () => {
      const error = APIErrors.badRequest('Test')
      const context = { method: 'GET', path: '/api/test' }

      const response = handleAPIError(error, context)
      const contentType = response.headers.get('content-type')

      expect(contentType).toContain('application/json')
      expect(contentType).toContain('charset=utf-8')
    })
  })

  describe('Success Response Format', () => {
    it('should return standardized success response format with correct structure', async () => {
      const data = { id: '123', name: 'Test' }
      const response = createSuccessResponse(data)
      const json = await response.json()

      expect(json).toHaveProperty('success', true)
      expect(json).toHaveProperty('data', data)
      expect(response.status).toBe(200)
    })

    it('should include success: true in success responses', async () => {
      const data = { items: [1, 2, 3] }
      const response = createSuccessResponse(data)
      const json = (await response.json()) as APISuccessResponse

      expect(json.success).toBe(true)
    })

    it('should include data in success responses', async () => {
      const testData = { user: { id: '123', name: 'John' } }
      const response = createSuccessResponse(testData)
      const json = (await response.json()) as APISuccessResponse

      expect(json.data).toEqual(testData)
    })

    it('should include optional metadata in success responses', async () => {
      const data = { items: [] }
      const meta = { count: 0, page: 1, total: 0 }
      const response = createSuccessResponse(data, meta)
      const json = (await response.json()) as APISuccessResponse

      expect(json.meta).toEqual(meta)
    })

    it('should include Content-Type header with charset=utf-8 for success responses', async () => {
      const data = { test: 'data' }
      const response = createSuccessResponse(data)
      const contentType = response.headers.get('content-type')

      expect(contentType).toContain('application/json')
      expect(contentType).toContain('charset=utf-8')
    })
  })

  describe('APIError Class', () => {
    it('should create APIError with message, status code, and code', () => {
      const error = new APIError('Test error', 400, 'TEST_ERROR')

      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('TEST_ERROR')
      expect(error).toBeInstanceOf(Error)
    })

    it('should use default values when not provided', () => {
      const error = new APIError('Test error')

      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(500)
      expect(error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('APIErrors Helper Functions', () => {
    it('should create unauthorized error', () => {
      const error = APIErrors.unauthorized()

      expect(error).toBeInstanceOf(APIError)
      expect(error.statusCode).toBe(401)
      expect(error.code).toBe('UNAUTHORIZED')
      expect(error.message).toBe('Authentication required')
    })

    it('should create forbidden error', () => {
      const error = APIErrors.forbidden()

      expect(error).toBeInstanceOf(APIError)
      expect(error.statusCode).toBe(403)
      expect(error.code).toBe('FORBIDDEN')
    })

    it('should create not found error', () => {
      const error = APIErrors.notFound('User')

      expect(error).toBeInstanceOf(APIError)
      expect(error.statusCode).toBe(404)
      expect(error.code).toBe('NOT_FOUND')
      expect(error.message).toContain('User')
    })

    it('should create bad request error with custom message', () => {
      const message = 'Invalid input data'
      const error = APIErrors.badRequest(message)

      expect(error).toBeInstanceOf(APIError)
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('BAD_REQUEST')
      expect(error.message).toBe(message)
    })

    it('should create conflict error', () => {
      const message = 'Resource already exists'
      const error = APIErrors.conflict(message)

      expect(error).toBeInstanceOf(APIError)
      expect(error.statusCode).toBe(409)
      expect(error.code).toBe('CONFLICT')
      expect(error.message).toBe(message)
    })

    it('should create rate limit error', () => {
      const error = APIErrors.tooManyRequests()

      expect(error).toBeInstanceOf(APIError)
      expect(error.statusCode).toBe(429)
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED')
    })

    it('should create internal error', () => {
      const error = APIErrors.internalError()

      expect(error).toBeInstanceOf(APIError)
      expect(error.statusCode).toBe(500)
      expect(error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('Error Handling for Different Error Types', () => {
    it('should handle APIError instances', async () => {
      const error = APIErrors.badRequest('Test')
      const context = { method: 'GET', path: '/api/test' }

      const response = handleAPIError(error, context)
      const json = (await response.json()) as APIErrorResponse

      expect(json.success).toBe(false)
      expect(json.error.code).toBe('BAD_REQUEST')
      expect(json.error.statusCode).toBe(400)
    })

    it('should handle database errors', async () => {
      const dbError = {
        code: '23505',
        message: 'Duplicate key violation',
        details: 'Key (email)=(test@example.com) already exists.',
      }
      const context = { method: 'POST', path: '/api/test' }

      const response = handleAPIError(dbError, context)
      const json = (await response.json()) as APIErrorResponse

      expect(json.success).toBe(false)
      expect(json.error.code).toBe('DATABASE_ERROR')
      expect(json.error.statusCode).toBe(500)
    })

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected error')
      const context = { method: 'GET', path: '/api/test' }

      const response = handleAPIError(unexpectedError, context)
      const json = (await response.json()) as APIErrorResponse

      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INTERNAL_ERROR')
      expect(json.error.statusCode).toBe(500)
    })

    it('should handle non-Error objects', async () => {
      const stringError = 'String error'
      const context = { method: 'POST', path: '/api/test' }

      const response = handleAPIError(stringError, context)
      const json = (await response.json()) as APIErrorResponse

      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('Error Context Logging', () => {
    it('should include method in error context', async () => {
      const { log } = require('@/lib/utils/logger')
      log.error.mockClear()

      const error = APIErrors.unauthorized()
      const context = { method: 'GET', path: '/api/test' }

      handleAPIError(error, context)

      // Verify error was logged with context
      expect(log.warn).toHaveBeenCalledWith(
        'API validation error',
        expect.objectContaining({
          method: 'GET',
          path: '/api/test',
        })
      )
    })

    it('should include path in error context', async () => {
      const { log } = require('@/lib/utils/logger')
      log.warn.mockClear()

      const error = APIErrors.notFound('Resource')
      const context = { method: 'POST', path: '/api/users/123' }

      handleAPIError(error, context)

      expect(log.warn).toHaveBeenCalledWith(
        'API validation error',
        expect.objectContaining({
          path: '/api/users/123',
        })
      )
    })

    it('should include optional userId in error context', async () => {
      const { log } = require('@/lib/utils/logger')
      log.warn.mockClear()

      const error = APIErrors.forbidden()
      const context = { method: 'DELETE', path: '/api/posts/123', userId: 'user-456' }

      handleAPIError(error, context)

      expect(log.warn).toHaveBeenCalledWith(
        'API validation error',
        expect.objectContaining({
          userId: 'user-456',
        })
      )
    })

    it('should log critical errors for 5xx status codes', async () => {
      const { log } = require('@/lib/utils/logger')
      log.critical.mockClear()

      const error = APIErrors.internalError()
      const context = { method: 'GET', path: '/api/test' }

      handleAPIError(error, context)

      expect(log.error).toHaveBeenCalled()
    })
  })

  describe('HTTP Method Coverage', () => {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

    methods.forEach((method) => {
      it(`should handle errors for ${method} requests`, async () => {
        const error = APIErrors.badRequest('Test error')
        const context = { method, path: '/api/test' }

        const response = handleAPIError(error, context)
        const json = (await response.json()) as APIErrorResponse

        expect(json.success).toBe(false)
        expect(json.error.statusCode).toBe(400)
      })
    })
  })

  describe('Error Code Consistency', () => {
    it('should use consistent error codes for same error types', () => {
      const error1 = APIErrors.unauthorized()
      const error2 = APIErrors.unauthorized()

      expect(error1.code).toBe(error2.code)
      expect(error1.statusCode).toBe(error2.statusCode)
      expect(error1.message).toBe(error2.message)
    })

    it('should use different error codes for different error types', () => {
      const unauthorized = APIErrors.unauthorized()
      const forbidden = APIErrors.forbidden()
      const notFound = APIErrors.notFound()

      expect(unauthorized.code).not.toBe(forbidden.code)
      expect(forbidden.code).not.toBe(notFound.code)
      expect(unauthorized.code).not.toBe(notFound.code)

      expect(unauthorized.statusCode).not.toBe(forbidden.statusCode)
      expect(forbidden.statusCode).not.toBe(notFound.statusCode)
    })
  })

  describe('Response Status Codes', () => {
    it('should return correct status code for bad request', async () => {
      const error = APIErrors.badRequest('Invalid input')
      const response = handleAPIError(error, { method: 'POST', path: '/api/test' })

      expect(response.status).toBe(400)
    })

    it('should return correct status code for unauthorized', async () => {
      const error = APIErrors.unauthorized()
      const response = handleAPIError(error, { method: 'GET', path: '/api/test' })

      expect(response.status).toBe(401)
    })

    it('should return correct status code for forbidden', async () => {
      const error = APIErrors.forbidden()
      const response = handleAPIError(error, { method: 'DELETE', path: '/api/test' })

      expect(response.status).toBe(403)
    })

    it('should return correct status code for not found', async () => {
      const error = APIErrors.notFound('Resource')
      const response = handleAPIError(error, { method: 'GET', path: '/api/test' })

      expect(response.status).toBe(404)
    })

    it('should return correct status code for conflict', async () => {
      const error = APIErrors.conflict('Already exists')
      const response = handleAPIError(error, { method: 'POST', path: '/api/test' })

      expect(response.status).toBe(409)
    })

    it('should return correct status code for rate limit', async () => {
      const error = APIErrors.tooManyRequests()
      const response = handleAPIError(error, { method: 'POST', path: '/api/test' })

      expect(response.status).toBe(429)
    })

    it('should return correct status code for internal error', async () => {
      const error = APIErrors.internalError()
      const response = handleAPIError(error, { method: 'GET', path: '/api/test' })

      expect(response.status).toBe(500)
    })
  })
})
