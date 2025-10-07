import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAnonymousHandle, generateAvatarSeed } from '@/lib/utils/anonymous-id'

export async function POST(request: NextRequest) {
  try {
    const { contact, otp } = await request.json()

    if (!contact || !otp) {
      return NextResponse.json({ error: 'Contact and OTP are required' }, { status: 400 })
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: 'OTP must be 6 digits' }, { status: 400 })
    }

    const supabase = await createClient()

    // Determine if contact is email or phone
    const isEmail = contact.includes('@')

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
      throw new Error('User ID not found after verification')
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (existingUser) {
      // User already exists, return their data
      return NextResponse.json({
        success: true,
        message: 'Login successful',
        data: {
          user: existingUser,
          session: verifyResult.session,
        },
      })
    }

    // Create new user profile with anonymous handle
    const anonymousHandle = generateAnonymousHandle()
    const avatarSeed = generateAvatarSeed(userId)

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

        return NextResponse.json({
          success: true,
          message: 'Account created successfully',
          data: {
            user: retryUser,
            session: verifyResult.session,
            anonymous_handle: retryHandle,
          },
        })
      }

      throw insertError
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: newUser,
        session: verifyResult.session,
        anonymous_handle: anonymousHandle,
      },
    })
  } catch (error) {
    console.error('OTP verification error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Verification failed',
      },
      { status: 500 }
    )
  }
}
