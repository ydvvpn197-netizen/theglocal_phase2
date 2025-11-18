import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * POST /api/auth/signup - Send OTP for signup
 *
 * @param request - Next.js request with contact (email or phone)
 * @returns Success response with OTP sent confirmation
 */
export const POST = withRateLimit(async function POST(request: NextRequest) {
  const logger = createAPILogger('POST', '/api/auth/signup')

  try {
    const { contact } = await request.json()

    if (!contact) {
      throw APIErrors.badRequest('Email or phone is required')
    }

    const supabase = await createClient()

    // Determine if contact is email or phone
    const isEmail = contact.includes('@')

    logger.info('Sending signup OTP', {
      contactType: isEmail ? 'email' : 'phone',
      contact: contact.substring(0, 5) + '***',
    })

    if (isEmail) {
      // Send OTP to email
      const { error } = await supabase.auth.signInWithOtp({
        email: contact,
        options: {
          shouldCreateUser: true,
        },
      })

      if (error) throw error
    } else {
      // Send OTP to phone
      const { error } = await supabase.auth.signInWithOtp({
        phone: contact,
        options: {
          shouldCreateUser: true,
        },
      })

      if (error) throw error
    }

    logger.info('Signup OTP sent successfully', {
      contactType: isEmail ? 'email' : 'phone',
    })

    return createSuccessResponse(
      {
        contact,
        type: isEmail ? 'email' : 'phone',
      },
      {
        message: 'OTP sent successfully',
      }
    )
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: '/api/auth/signup',
    })
  }
})
