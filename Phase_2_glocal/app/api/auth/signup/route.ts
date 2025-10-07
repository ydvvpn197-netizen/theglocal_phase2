import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { contact } = await request.json()

    if (!contact) {
      return NextResponse.json({ error: 'Email or phone is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Determine if contact is email or phone
    const isEmail = contact.includes('@')

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

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        contact,
        type: isEmail ? 'email' : 'phone',
      },
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to send OTP',
      },
      { status: 500 }
    )
  }
}
