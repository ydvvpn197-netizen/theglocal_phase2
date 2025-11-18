import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateUniqueAnonymousHandle, generateAvatarSeed } from '@/lib/utils/anonymous-id'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/callback - OAuth callback handler
 *
 * @param _request - Next.js request with OAuth code
 * @returns Redirect to callback URL or error page
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/auth/callback')

  try {
    const requestUrl = new URL(_request.url)
    const code = requestUrl.searchParams.get('code')
    const callbackUrl = requestUrl.searchParams.get('callbackUrl')
    const origin = requestUrl.origin

    // Determine redirect destination
    const redirectTo = callbackUrl ? decodeURIComponent(callbackUrl) : `${origin}/?login=success`

    if (!code) {
      // No code provided
      const errorRedirect = callbackUrl
        ? `${origin}/auth/login?error=no_code&callbackUrl=${encodeURIComponent(callbackUrl)}`
        : `${origin}/auth/login?error=no_code`
      return NextResponse.redirect(errorRedirect)
    }

    const supabase = await createClient()

    logger.info('Processing OAuth callback', {
      hasCode: !!code,
      hasCallbackUrl: !!callbackUrl,
    })

    // Exchange code for session
    const { data: sessionData, error: sessionError } =
      await supabase.auth.exchangeCodeForSession(code)

    if (sessionError) {
      logger.error('Session exchange error', sessionError)
      const errorRedirect = callbackUrl
        ? `${origin}/auth/login?error=auth_failed&callbackUrl=${encodeURIComponent(callbackUrl)}`
        : `${origin}/auth/login?error=auth_failed`
      return NextResponse.redirect(errorRedirect)
    }

    const newAuthUserId = sessionData.user?.id
    const email = sessionData.user?.email
    const phone = sessionData.user?.phone

    if (!newAuthUserId) {
      logger.error('No user ID found after session exchange')
      const errorRedirect = callbackUrl
        ? `${origin}/auth/login?error=no_user&callbackUrl=${encodeURIComponent(callbackUrl)}`
        : `${origin}/auth/login?error=no_user`
      return NextResponse.redirect(errorRedirect)
    }

    try {
      // Check if user profile already exists by ID first
      const { data: existingUserById } = await supabase
        .from('users')
        .select('*')
        .eq('id', newAuthUserId)
        .maybeSingle()

      let existingUser = existingUserById
      let existingAuthUserId: string | null = null

      // If no profile found by ID, check by email/phone (for OAuth users linking to existing profiles)
      if (!existingUser) {
        if (email) {
          const { data: existingUserByEmail } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle()

          if (existingUserByEmail) {
            logger.info('[Auth Callback] Found existing profile with same email', {
              newAuthUserId,
              existingProfileId: existingUserByEmail.id,
              email: email.substring(0, 5) + '***',
            })
            existingUser = existingUserByEmail
            existingAuthUserId = existingUserByEmail.id
          }
        }

        // Also check by phone if email didn't match
        if (!existingUser && phone) {
          const { data: existingUserByPhone } = await supabase
            .from('users')
            .select('*')
            .eq('phone', phone)
            .maybeSingle()

          if (existingUserByPhone) {
            logger.info('[Auth Callback] Found existing profile with same phone', {
              newAuthUserId,
              existingProfileId: existingUserByPhone.id,
              phone: phone.substring(0, 3) + '***',
            })
            existingUser = existingUserByPhone
            existingAuthUserId = existingUserByPhone.id
          }
        }
      }

      // If we found an existing profile by email/phone but it's a different user ID
      // The user is already signed in with the new auth user ID from OAuth
      // We should ensure the new auth user has a profile (may have been created by trigger)
      // and update it with the existing profile data if needed
      if (existingUser && existingAuthUserId && existingAuthUserId !== newAuthUserId) {
        logger.info('[Auth Callback] Found existing profile with same email/phone', {
          existingAuthUserId,
          newAuthUserId,
          email: email?.substring(0, 5) + '***',
        })

        // Check if new auth user already has a profile (created by trigger)
        const { data: newUserProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', newAuthUserId)
          .maybeSingle()

        if (newUserProfile) {
          // New user already has a profile - update it with existing profile data
          // This ensures the user gets their existing profile data
          const { error: updateError } = await supabase
            .from('users')
            .update({
              email: existingUser.email || email || null,
              phone: existingUser.phone || phone || null,
              anonymous_handle: existingUser.anonymous_handle,
              avatar_seed: existingUser.avatar_seed,
            })
            .eq('id', newAuthUserId)

          if (updateError) {
            logger.error(
              '[Auth Callback] Error updating new user profile with existing data',
              updateError
            )
          } else {
            logger.info('[Auth Callback] Updated new user profile with existing profile data')
          }
        } else {
          // New user doesn't have a profile yet - create one with existing profile data
          const { error: insertError } = await supabase.from('users').insert({
            id: newAuthUserId,
            email: existingUser.email || email || null,
            phone: existingUser.phone || phone || null,
            anonymous_handle: existingUser.anonymous_handle,
            avatar_seed: existingUser.avatar_seed,
          })

          if (insertError) {
            logger.error('[Auth Callback] Error creating profile for new user', insertError)
            // Continue anyway - profile might be created by trigger
          } else {
            logger.info('[Auth Callback] Created profile for new user with existing profile data')
          }
        }

        // User is already signed in with newAuthUserId - continue with redirect
        // The session is established and profile is ready
        logger.info('[Auth Callback] User signed in with existing profile data')
        return NextResponse.redirect(redirectTo)
      }

      // Only create new profile if no existing profile found (by ID or email/phone)
      if (!existingUser) {
        // Create new user profile with unique anonymous handle
        const anonymousHandle = await generateUniqueAnonymousHandle(newAuthUserId)
        const avatarSeed = generateAvatarSeed(newAuthUserId)

        const { error: insertError } = await supabase.from('users').insert({
          id: newAuthUserId,
          email: email || null,
          phone: phone || null,
          anonymous_handle: anonymousHandle,
          avatar_seed: avatarSeed,
        })

        if (insertError) {
          logger.error('User creation error in callback', insertError, {
            userId: newAuthUserId,
            code: insertError.code,
          })

          // Handle duplicate key errors (email/handle already exists)
          if (insertError.code === '23505') {
            // Check if it's a duplicate email - if so, use existing profile
            if (email) {
              const { data: existingByEmail } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .maybeSingle()

              if (existingByEmail) {
                logger.info('[Auth Callback] Duplicate email detected, using existing profile', {
                  profileId: existingByEmail.id,
                })
                // User will use existing profile - don't create new one
                existingUser = existingByEmail
              } else {
                // Duplicate handle - retry with new handle
                let retryCount = 0
                const maxRetries = 3
                let success = false

                while (retryCount < maxRetries && !success) {
                  const retryHandle = await generateUniqueAnonymousHandle(newAuthUserId)
                  const { error: retryError } = await supabase.from('users').insert({
                    id: newAuthUserId,
                    email: email || null,
                    phone: phone || null,
                    anonymous_handle: retryHandle,
                    avatar_seed: avatarSeed,
                  })

                  if (!retryError) {
                    success = true
                    break
                  }
                  retryCount++
                }

                if (!success) {
                  throw new Error('Failed to create user profile after retries')
                }
              }
            } else {
              // Duplicate handle without email - retry
              let retryCount = 0
              const maxRetries = 3
              let success = false

              while (retryCount < maxRetries && !success) {
                const retryHandle = await generateUniqueAnonymousHandle(newAuthUserId)
                const { error: retryError } = await supabase.from('users').insert({
                  id: newAuthUserId,
                  email: email || null,
                  phone: phone || null,
                  anonymous_handle: retryHandle,
                  avatar_seed: avatarSeed,
                })

                if (!retryError) {
                  success = true
                  break
                }
                retryCount++
              }

              if (!success) {
                throw new Error('Failed to create user profile after retries')
              }
            }
          } else {
            throw insertError
          }
        } else {
          logger.info('[Auth Callback] Created new user profile', { userId: newAuthUserId })
        }
      } else {
        logger.info('[Auth Callback] Using existing user profile', { userId: existingUser.id })
      }

      // Successful login - redirect to callback URL or home
      logger.info('OAuth callback completed successfully', {
        userId: newAuthUserId,
      })
      return NextResponse.redirect(redirectTo)
    } catch (error) {
      logger.error('User creation error', error instanceof Error ? error : undefined, {
        message: error instanceof Error ? error.message : 'Unknown error',
      })
      const errorRedirect = callbackUrl
        ? `${origin}/auth/login?error=profile_creation_failed&callbackUrl=${encodeURIComponent(callbackUrl)}`
        : `${origin}/auth/login?error=profile_creation_failed`
      return NextResponse.redirect(errorRedirect)
    }
  } catch (error) {
    logger.error('OAuth callback error', error instanceof Error ? error : undefined, {
      message: error instanceof Error ? error.message : 'Unknown error',
    })
    const requestUrl = new URL(_request.url)
    const errorCallbackUrl = requestUrl.searchParams.get('callbackUrl')
    const errorOrigin = requestUrl.origin
    const errorRedirect = errorCallbackUrl
      ? `${errorOrigin}/auth/login?error=callback_failed&callbackUrl=${encodeURIComponent(errorCallbackUrl)}`
      : `${errorOrigin}/auth/login?error=callback_failed`
    return NextResponse.redirect(errorRedirect)
  }
})
