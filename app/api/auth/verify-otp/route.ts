import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { generateAnonymousHandle, generateAvatarSeed } from '@/lib/utils/anonymous-id'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * POST /api/auth/verify-otp - Verify OTP and create/login user
 *
 * @param request - Next.js request with contact and OTP
 * @returns User data and session on successful verification
 */
export const POST = withRateLimit(async function POST(request: NextRequest) {
  const logger = createAPILogger('POST', '/api/auth/verify-otp')

  try {
    const { contact, otp } = await request.json()

    if (!contact || !otp) {
      throw APIErrors.badRequest('Contact and OTP are required')
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      throw APIErrors.badRequest('OTP must be 6 digits')
    }

    const supabase = await createClient()

    // Determine if contact is email or phone
    const isEmail = contact.includes('@')

    logger.info('Verifying OTP', {
      contactType: isEmail ? 'email' : 'phone',
      contact: contact.substring(0, 5) + '***',
    })

    let verifyResult

    if (isEmail) {
      // Verify OTP for email
      const { data, error } = await supabase.auth.verifyOtp({
        email: contact,
        token: otp,
        type: 'email',
      })

      if (error) throw error
      verifyResult = data
    } else {
      // Verify OTP for phone
      const { data, error } = await supabase.auth.verifyOtp({
        phone: contact,
        token: otp,
        type: 'sms',
      })

      if (error) throw error
      verifyResult = data
    }

    // Check if user profile already exists
    const userId = verifyResult.user?.id

    if (!userId) {
      throw APIErrors.internalError()
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (existingUser) {
      // User already exists, return their data
      logger.info('User logged in successfully', {
        userId,
        contactType: isEmail ? 'email' : 'phone',
      })

      return createSuccessResponse(
        {
          user: existingUser,
          session: verifyResult.session,
        },
        {
          message: 'Login successful',
        }
      )
    }

    // Create new user profile with anonymous handle
    const anonymousHandle = generateAnonymousHandle()
    const avatarSeed = generateAvatarSeed(userId)

    logger.info('Creating new user profile', {
      userId,
      contactType: isEmail ? 'email' : 'phone',
    })

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: isEmail ? contact : null,
        phone: isEmail ? null : contact,
        anonymous_handle: anonymousHandle,
        avatar_seed: avatarSeed,
      })
      .select()
      .single()

    if (insertError) {
      // Handle duplicate handle (very rare, but possible)
      if (insertError.code === '23505') {
        // Try again with new handle
        const retryHandle = generateAnonymousHandle()
        const { data: retryUser, error: retryError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: isEmail ? contact : null,
            phone: isEmail ? null : contact,
            anonymous_handle: retryHandle,
            avatar_seed: avatarSeed,
          })
          .select()
          .single()

        if (retryError) throw retryError

        logger.info('User account created successfully (retry)', {
          userId,
          anonymousHandle: retryHandle,
        })

        return createSuccessResponse(
          {
            user: retryUser,
            session: verifyResult.session,
            anonymous_handle: retryHandle,
          },
          {
            message: 'Account created successfully',
          }
        )
      }

      throw insertError
    }

    logger.info('User account created successfully', {
      userId,
      anonymousHandle,
    })

    return createSuccessResponse(
      {
        user: newUser,
        session: verifyResult.session,
        anonymous_handle: anonymousHandle,
      },
      {
        message: 'Account created successfully',
      }
    )
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: '/api/auth/verify-otp',
    })
  }
})
