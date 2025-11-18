import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * POST /api/posts/[id]/view - Track a post view
 *
 * @param _request - Next.js request with session_id
 * @param params - Route parameters with post ID
 * @returns Updated view count
 */
export const POST = withRateLimit(async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const logger = createAPILogger('POST', `/api/posts/${postId}/view`)

  try {
    const { session_id } = await _request.json()

    if (!session_id) {
      throw APIErrors.badRequest('Session ID required')
    }

    const supabase = await createClient()

    // Get client IP and hash it for privacy
    const forwarded = _request.headers.get('x-forwarded-for')
    const realIp = _request.headers.get('x-real-ip')
    const ip = forwarded ? forwarded.split(',')[0] : realIp || 'unknown'
    const ipHash = crypto
      .createHash('sha256')
      .update(ip || 'unknown')
      .digest('hex')

    // Get current user from auth (optional - for authenticated users)
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    // Verify authenticated user exists in public.users before using their ID
    // The foreign key references public.users(id), not auth.users(id)
    let userId: string | null = null
    if (authUser?.id) {
      const { data: publicUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUser.id)
        .maybeSingle()

      if (publicUser) {
        userId = publicUser.id
      }
    }

    // Insert view record (on conflict do nothing due to unique constraint)
    const { error: insertError } = await supabase
      .from('post_views')
      .insert({
        post_id: postId,
        session_id,
        ip_hash: ipHash,
        user_id: userId,
      })
      .select()

    // If it's a duplicate view (unique constraint violation), that's fine
    if (insertError && !insertError.message.includes('duplicate key')) {
      throw insertError
    }

    // Get updated view count
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('view_count')
      .eq('id', postId)
      .maybeSingle()

    if (fetchError) {
      throw fetchError
    }

    // If post doesn't exist, return 404
    if (!post) {
      throw APIErrors.notFound('Post')
    }

    logger.info('Post view tracked', {
      postId,
      viewCount: post.view_count || 0,
    })

    return createSuccessResponse({
      view_count: post.view_count || 0,
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: `/api/posts/${postId}/view`,
    })
  }
})
