import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MODERATION_ACTIONS } from '@/lib/utils/constants'
import {
  requireSuperAdminOrCommunityAdminModerator,
  AdminAccessDeniedError,
} from '@/lib/utils/admin-verification'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// POST /api/moderation - Take moderation action on content
export const POST = withRateLimit(async function POST(request: NextRequest) {
  const logger = createAPILogger('POST', '/api/moderation')
  try {
    const body = await request.json()
    const { content_type, content_id, action, reason, report_id } = body

    if (!content_type || !content_id || !action || !reason) {
      throw APIErrors.badRequest('content_type, content_id, action, and reason are required')
    }

    if (!['post', 'comment', 'poll', 'user'].includes(content_type)) {
      throw APIErrors.badRequest('Invalid content_type')
    }

    if (!MODERATION_ACTIONS.includes(action)) {
      throw APIErrors.badRequest('Invalid action')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Get community_id based on content
    let communityId: string | null = null

    if (content_type === 'post') {
      const { data: post } = await supabase
        .from('posts')
        .select('community_id')
        .eq('id', content_id)
        .single()
      communityId = post?.community_id || null
    } else if (content_type === 'comment') {
      const { data: comment } = await supabase
        .from('comments')
        .select('posts!inner(community_id)')
        .eq('id', content_id)
        .single()
      const commentPosts = comment?.posts as { community_id?: string } | undefined
      communityId =
        (Array.isArray(commentPosts)
          ? commentPosts[0]?.community_id
          : commentPosts?.community_id) || null
    } else if (content_type === 'poll') {
      const { data: poll } = await supabase
        .from('polls')
        .select('community_id')
        .eq('id', content_id)
        .single()
      communityId = poll?.community_id || null
    }

    // Verify user is super admin OR community admin/moderator
    try {
      await requireSuperAdminOrCommunityAdminModerator(user.id, communityId)
    } catch (error) {
      if (error instanceof AdminAccessDeniedError) {
        throw APIErrors.forbidden()
      }
      throw error
    }

    // Take action on content
    if (action === 'removed') {
      await removeContent(supabase, content_type, content_id)
    } else if (action === 'temp_banned' || action === 'banned') {
      // For user bans, implement in admin section
      // For now, just log it
    }

    // Log moderation action
    const { data: moderationLog, error: logError } = await supabase
      .from('moderation_log')
      .insert({
        moderator_id: user.id,
        content_type,
        content_id,
        community_id: communityId,
        action,
        reason,
        report_id,
      })
      .select()
      .single()

    if (logError) {
      logger.error('Error logging moderation action:', logError)
      // Continue anyway
    }

    // Update report status if provided
    if (report_id) {
      await supabase
        .from('reports')
        .update({
          status: 'actioned',
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', report_id)
    }

    return createSuccessResponse(moderationLog, {
      message: 'Moderation action completed successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: '/api/moderation',
    })
  }
})

// Helper function to remove content
async function removeContent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contentType: string,
  contentId: string
): Promise<void> {
  const removedText = '[removed by moderator]'

  if (contentType === 'post') {
    await supabase
      .from('posts')
      .update({
        is_deleted: true,
        title: removedText,
        body: removedText,
        image_url: null,
      })
      .eq('id', contentId)
  } else if (contentType === 'comment') {
    await supabase
      .from('comments')
      .update({
        is_deleted: true,
        body: removedText,
      })
      .eq('id', contentId)
  } else if (contentType === 'poll') {
    await supabase
      .from('polls')
      .update({
        is_deleted: true,
        question: removedText,
      })
      .eq('id', contentId)
  }
}
