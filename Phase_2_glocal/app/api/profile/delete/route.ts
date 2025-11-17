import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDeletedHandle } from '@/lib/utils/profile-helpers'
import { handleAPIError } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// POST /api/profile/delete - Soft delete user account with anonymization
export const POST = withRateLimit(async function POST(_request: NextRequest) {
  const logger = createAPILogger('POST', '/api/profile/delete')
  try {
    const body = await _request.json()
    const { confirmation_handle } = body

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Fetch current profile to verify handle
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('anonymous_handle, deleted_at')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check if already deleted
    if (profile.deleted_at) {
      return NextResponse.json({ error: 'Account already deleted' }, { status: 400 })
    }

    // Verify handle confirmation
    if (confirmation_handle !== profile.anonymous_handle) {
      return NextResponse.json({ error: 'Handle confirmation does not match' }, { status: 400 })
    }

    // Generate new anonymous handle for deleted user
    const deletedHandle = generateDeletedHandle()

    // Anonymize user account
    const { error: updateError } = await supabase
      .from('users')
      .update({
        anonymous_handle: deletedHandle,
        email: null,
        phone: null,
        bio: null,
        location_city: null,
        location_coordinates: null,
        deleted_at: new Date().toISOString(),
        is_banned: true, // Prevent re-login
        ban_reason: 'Account deleted by user',
      })
      .eq('id', user.id)

    if (updateError) throw updateError

    // Sign out the user
    await supabase.auth.signOut()

    return NextResponse.json({
      success: true,
      message: 'Account deleted and anonymized successfully',
    })
  } catch (error) {
    return handleAPIError(error, { method: 'POST', path: '/api/profile/delete' })
  }
})
