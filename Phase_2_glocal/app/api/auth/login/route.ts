import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { otpSecurityManager } from '@/lib/security/otp-manager'
import { validateContact } from '@/lib/utils/validation'
import { createAPILogger } from '@/lib/utils/logger-context'
import {
  handleAPIError,
  createSuccessResponse,
  APIErrors,
  APIError,
} from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * Check if an error is retryable based on status code and error message
 * Retryable errors are temporary service issues that might resolve on retry
 */
interface ErrorWithStatus {
  status?: number | string
  code?: number | string
  message?: string
  name?: string
}

function isRetryableError(error: ErrorWithStatus | Error | null | undefined): boolean {
  if (!error) return false

  const status =
    ('status' in error ? error.status : undefined) ||
    ('code' in error ? error.code : undefined) ||
    0
  const message = (('message' in error ? error.message : undefined) || '').toLowerCase()
  const errorName = (('name' in error ? error.name : undefined) || '').toLowerCase()

  // Convert status to number for comparison
  const statusNum = typeof status === 'string' ? parseInt(status, 10) : status

  // Non-retryable error statuses (configuration or client errors)
  if (typeof statusNum === 'number' && statusNum >= 400 && statusNum < 500 && statusNum !== 429) {
    return false
  }

  // Non-retryable error messages (configuration issues)
  const nonRetryableMessages = ['invalid', 'unauthorized', 'forbidden', 'not found', 'not allowed']
  if (nonRetryableMessages.some((msg) => message.includes(msg))) {
    return false
  }

  // Retryable status codes
  const retryableStatuses = [502, 503, 504]

  // Retryable 500 errors (temporary service issues)
  if (statusNum === 500) {
    const retryableMessages = [
      'temporarily unavailable',
      'service error',
      'internal server error',
      'bad gateway',
      'service unavailable',
      'gateway timeout',
      'timeout',
    ]
    const isRetryableMessage = retryableMessages.some((msg) => message.includes(msg))
    const isAuthError = errorName.includes('auth') && statusNum === 500
    return isRetryableMessage || isAuthError
  }

  // Check retryable status codes
  if (typeof statusNum === 'number' && retryableStatuses.includes(statusNum)) {
    return true
  }

  // Network errors are retryable
  if (error instanceof Error && (!status || status === 0)) {
    return true
  }

  return false
}

/**
 * POST /api/auth/login - Send OTP for login
 *
 * @param request - Next.js request with contact (email or phone)
 * @returns Success response with OTP sent confirmation
 */
export const POST = withRateLimit(async function POST(request: NextRequest) {
  const logger = createAPILogger('POST', '/api/auth/login')

  try {
    const { contact } = await request.json()

    // Validate contact format (email or phone)
    const contactValidation = validateContact(contact)
    if (!contactValidation.valid) {
      throw APIErrors.badRequest(contactValidation.error || 'Invalid email or phone number format')
    }

    // Use normalized contact (validated and formatted)
    const normalizedContact = contactValidation.normalized || contact.trim()
    const contactType =
      contactValidation.type || (normalizedContact.includes('@') ? 'email' : 'phone')

    // Check if user can request OTP (not locked out, cooldown passed)
    const canRequest = await otpSecurityManager.canRequestOTP(normalizedContact)
    if (!canRequest.allowed) {
      throw APIErrors.tooManyRequests()
    }

    const supabase = await createClient()

    // Get origin for email redirect URL
    const origin = request.headers.get('origin') || request.nextUrl.origin
    const redirectUrl = `${origin}/auth/verify`

    let supabaseError
    let retryCount = 0
    const maxRetries = 2

    // Retry logic for transient errors (502, 503, 504, and retryable 500 errors)
    while (retryCount <= maxRetries) {
      try {
        if (contactType === 'email') {
          // Send OTP to email - allow creating new user if doesn't exist (unified flow)
          const { error } = await supabase.auth.signInWithOtp({
            email: normalizedContact,
            options: {
              shouldCreateUser: true,
              emailRedirectTo: redirectUrl,
              data: {
                login_method: 'email',
                timestamp: new Date().toISOString(),
              },
            },
          })

          supabaseError = error
        } else {
          // Send OTP to phone - allow creating new user if doesn't exist (unified flow)
          const { error } = await supabase.auth.signInWithOtp({
            phone: normalizedContact,
            options: {
              shouldCreateUser: true,
              channel: 'sms',
              data: {
                login_method: 'phone',
                timestamp: new Date().toISOString(),
              },
            },
          })

          supabaseError = error
        }

        // If no error or error is not retryable, break out of retry loop
        if (!supabaseError || !isRetryableError(supabaseError)) {
          break
        }

        // If we get here, it's a retryable error
        if (retryCount < maxRetries) {
          retryCount++
          // Exponential backoff with jitter: Math.pow(2, retryCount) * 1000ms + random jitter
          const baseDelay = Math.pow(2, retryCount) * 1000
          const jitter = Math.random() * 500 // Add up to 500ms jitter
          const waitTime = Math.floor(baseDelay + jitter)

          const errorStatus = supabaseError.status || supabaseError.code || 'unknown'
          const errorMessage = supabaseError.message || 'service error'

          logger.warn('Supabase error detected, retrying', {
            errorStatus,
            errorMessage: errorMessage.substring(0, 100), // Truncate long messages
            errorName: supabaseError.name || 'Unknown',
            contactType,
            retryAttempt: retryCount,
            maxRetries,
            waitTimeMs: waitTime,
            timestamp: new Date().toISOString(),
          })

          await new Promise((resolve) => setTimeout(resolve, waitTime))
          continue
        }

        // Max retries reached, break out
        break
      } catch (error) {
        // Log error but continue retry loop
        logger.warn(`Retry attempt ${retryCount + 1} failed`, { error })
        if (retryCount < maxRetries) {
          retryCount++
          const baseDelay = Math.pow(2, retryCount) * 1000
          const jitter = Math.random() * 500
          const waitTime = Math.floor(baseDelay + jitter)
          await new Promise((resolve) => setTimeout(resolve, waitTime))
          continue
        }
        // Max retries reached, set error and break
        supabaseError = error as typeof supabaseError
        break
      }
    }

    if (supabaseError) {
      // Enhanced error logging
      const errorCodeRaw = supabaseError.status || supabaseError.code || 500
      // Ensure errorCode is a number
      const errorCode =
        typeof errorCodeRaw === 'number'
          ? errorCodeRaw
          : typeof errorCodeRaw === 'string'
            ? parseInt(errorCodeRaw, 10) || 500
            : 500

      // Extract error message - handle AuthRetryableFetchError and empty messages
      let errorMessage = supabaseError.message || 'Failed to send OTP'

      // Handle cases where error message is an empty object or not useful
      if (errorMessage === '{}' || errorMessage === '' || !errorMessage) {
        errorMessage = 'Authentication service error occurred'
      }

      // For AuthRetryableFetchError (502 Bad Gateway), provide better context
      if (errorCode === 502 || (errorCode >= 500 && errorCode < 600)) {
        errorMessage = 'Authentication service is temporarily unavailable'
      }

      // Check error name for auth errors
      const errorName = supabaseError.name || 'Unknown'
      const isAuthError = errorName.includes('Auth') || errorCode >= 500
      const wasRetried = retryCount > 0
      const isRetryable = isRetryableError(supabaseError)

      logger.error(
        'Supabase OTP send error',
        supabaseError instanceof Error ? supabaseError : undefined,
        {
          errorCode,
          errorMessage,
          contactType,
          contact: normalizedContact.substring(0, 5) + '***', // Partially mask for privacy
          errorName,
          isAuthError,
          errorStatus: supabaseError.status,
          retryInfo: {
            wasRetried,
            retryAttempts: retryCount,
            maxRetries,
            isRetryable,
            retryDecision: wasRetried
              ? `Retried ${retryCount} time(s)`
              : isRetryable
                ? 'Could be retried but max attempts reached'
                : 'Not retryable',
          },
          fullError: {
            message: errorMessage,
            status: errorCode,
            name: errorName,
          },
          timestamp: new Date().toISOString(),
        }
      )

      // Map common Supabase errors to user-friendly messages
      let userFriendlyMessage = errorMessage
      let httpStatus = 500

      // Handle 502 Bad Gateway - Supabase service unavailable
      if (errorCode === 502 || errorMessage.includes('Bad Gateway')) {
        userFriendlyMessage =
          'Authentication service is temporarily unavailable. Please try again in a few moments.'
        httpStatus = 503
      } else if (errorCode === 503 || errorMessage.includes('Service Unavailable')) {
        userFriendlyMessage =
          'Authentication service is temporarily unavailable. Please try again later.'
        httpStatus = 503
      } else if (
        errorCode === 400 ||
        errorMessage.includes('Invalid') ||
        errorMessage.includes('invalid')
      ) {
        userFriendlyMessage = `Invalid ${contactType === 'email' ? 'email' : 'phone number'} format`
        httpStatus = 400
      } else if (
        errorCode === 429 ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('too many')
      ) {
        userFriendlyMessage = 'Too many requests. Please try again in a few minutes.'
        httpStatus = 429
      } else if (
        errorMessage.includes('SMTP') ||
        errorMessage.includes('email') ||
        errorMessage.includes('smtp')
      ) {
        userFriendlyMessage =
          'Email service is temporarily unavailable. Please try again later or use phone verification.'
        httpStatus = 503
      } else if (
        errorMessage.includes('SMS') ||
        errorMessage.includes('Twilio') ||
        errorMessage.includes('phone')
      ) {
        userFriendlyMessage =
          'SMS service is temporarily unavailable. Please try again later or use email verification.'
        httpStatus = 503
      } else if (isAuthError || errorCode >= 500) {
        // Generic auth error or server errors
        userFriendlyMessage =
          'Authentication service error. Please try again or contact support if the issue persists.'
        httpStatus = 503
      }

      // Create APIError for structured error handling
      throw new APIError(userFriendlyMessage, httpStatus, 'AUTH_SERVICE_ERROR')
    }

    // Success - log for monitoring
    logger.info('Login OTP sent successfully', {
      contactType,
      contact: normalizedContact.substring(0, 5) + '***',
    })

    return createSuccessResponse(
      {
        contact: normalizedContact,
        type: contactType,
      },
      {
        message: `OTP sent successfully to your ${contactType === 'email' ? 'email' : 'phone'}`,
      }
    )
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: '/api/auth/login',
    })
  }
})
