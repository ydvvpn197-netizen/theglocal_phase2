import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// Helper function to calculate comment depth
async function getCommentDepth(
  commentId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<number> {
  let depth = 0
  let currentId = commentId

  while (currentId) {
    const { data: comment } = await supabase
      .from('poll_comments')
      .select('parent_comment_id')
      .eq('id', currentId)
      .single()

    if (!comment || !comment.parent_comment_id) {
      break
    }

    currentId = comment.parent_comment_id
    depth++

    // Safety check to prevent infinite loops
    if (depth > 20) {
      break
    }
  }

  return depth
}

// Helper function to build comment tree recursively
async function buildCommentTree(
  comments: Record<string, unknown>[],
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: Record<string, unknown> | null
): Promise<Record<string, unknown>[]> {
  if (!comments || comments.length === 0) return []

  // Get all comment IDs for vote fetching
  const commentIds = comments.map((c: Record<string, unknown>) => c.id)

  // Fetch user votes if authenticated
  let votesMap = new Map()
  if (user) {
    const { data: userVotes } = await supabase
      .from('votes')
      .select('content_id, vote_type')
      .eq('user_id', user.id)
      .eq('content_type', 'comment')
      .in('content_id', commentIds)

    votesMap = new Map(
      (userVotes as Array<{ content_id?: string; vote_type?: string }> | null)
        ?.map((v) => (v.content_id && v.vote_type ? [v.content_id, v.vote_type] : null))
        .filter((v): v is [string, string] => v !== null) || []
    )
  }

  // Process comments and recursively fetch replies
  const processedComments = await Promise.all(
    comments.map(async (comment: Record<string, unknown>) => {
      // Fetch replies for this comment
      const { data: replies } = await supabase
        .from('poll_comments')
        .select(
          `
          *,
          author:users!author_id(anonymous_handle, avatar_seed)
        `
        )
        .eq('parent_comment_id', comment.id)
        .order('created_at', { ascending: true })

      // Recursively build reply tree
      const nestedReplies = replies
        ? await buildCommentTree(replies as Record<string, unknown>[], supabase, user)
        : []

      return {
        ...comment,
        user_vote: votesMap.get(comment.id as string) || null,
        replies: nestedReplies,
      }
    })
  )

  return processedComments
}

// GET /api/polls/[id]/comments - List comments for a poll
export const GET = withRateLimit(async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pollId } = await params
    const searchParams = _request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Fetch top-level comments (parent_comment_id is null) with pagination
    const {
      data: comments,
      error,
      count,
    } = await supabase
      .from('poll_comments')
      .select(
        `
        *,
        author:users!author_id(anonymous_handle, avatar_seed)
      `,
        { count: 'exact' }
      )
      .eq('poll_id', pollId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // Helper function to collect all comment IDs from the tree recursively
    const collectCommentIds = (commentList: unknown[]): string[] => {
      const ids: string[] = []
      for (const comment of commentList) {
        const commentObj = comment as { id?: string; replies?: unknown[] }
        if (commentObj.id) {
          ids.push(commentObj.id)
          if (commentObj.replies && commentObj.replies.length > 0) {
            ids.push(...collectCommentIds(commentObj.replies))
          }
        }
      }
      return ids
    }

    // Build the complete comment tree recursively first
    const processedComments = await buildCommentTree(
      comments || [],
      supabase,
      user as Record<string, unknown> | null
    )

    // Collect all comment IDs from the tree
    const allCommentIds = collectCommentIds(processedComments)

    // Fetch media items for all comments in batch
    const mediaByComment = new Map()
    if (allCommentIds.length > 0) {
      const { data: mediaItems, error: mediaError } = await supabase
        .from('media_items')
        .select('*')
        .eq('owner_type', 'poll_comment')
        .in('owner_id', allCommentIds)
        .order('display_order', { ascending: true })

      if (!mediaError && mediaItems) {
        mediaItems.forEach((media) => {
          if (!mediaByComment.has(media.owner_id)) {
            mediaByComment.set(media.owner_id, [])
          }
          const existingMedia = mediaByComment.get(media.owner_id) || []
          existingMedia.push(media)
          mediaByComment.set(media.owner_id, existingMedia)
        })
      }
    }

    // Helper function to attach media items recursively
    const attachMedia = (commentList: unknown[]): unknown[] => {
      return commentList.map((comment) => {
        const commentObj = comment as { id?: string; replies?: unknown[] }
        return {
          ...commentObj,
          media_items: mediaByComment.get(commentObj.id) || [],
          replies: commentObj.replies ? attachMedia(commentObj.replies) : [],
        }
      })
    }

    // Attach media items to all comments
    const commentsWithMedia = attachMedia(processedComments)

    return createSuccessResponse(commentsWithMedia, {
      pagination: {
        limit,
        offset,
        total: count || 0,
        has_more: (count || 0) > offset + limit,
      },
    })
  } catch (error) {
    const { id: errorPollId } = await params
    return handleAPIError(error, { method: 'GET', path: `/api/polls/${errorPollId}/comments` })
  }
})
// POST /api/polls/[id]/comments - Create a new poll comment
export const POST = withRateLimit(async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createAPILogger('POST', '/api/polls/[id]/comments')
  try {
    const { id: pollId } = await params
    const body = await _request.json()
    const { text, parent_id, media_items } = body

    if (!text || text.trim().length === 0) {
      throw APIErrors.badRequest('Comment text is required')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Verify poll exists
    const { data: poll } = await supabase
      .from('polls')
      .select('id, community_id')
      .eq('id', pollId)
      .single()

    if (!poll) {
      throw APIErrors.notFound('Poll')
    }

    // Verify user is a member of the community
    const { data: membership } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', poll.community_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      throw APIErrors.forbidden()
    }

    // If parent_id provided, verify it exists and check depth limit
    if (parent_id) {
      const { data: parentComment } = await supabase
        .from('poll_comments')
        .select('parent_comment_id')
        .eq('id', parent_id)
        .single()

      if (!parentComment) {
        throw APIErrors.notFound('Parent comment')
      }

      // Check depth limit (max 10 levels to prevent UI issues)
      const depth = await getCommentDepth(parent_id, supabase)
      if (depth >= 10) {
        throw APIErrors.badRequest(
          'Maximum nesting depth reached (10 levels). Please reply to a higher-level comment.'
        )
      }
    }

    // Create comment using admin client to bypass RLS
    const adminClient = createAdminClient()
    const { data: comment, error: createError } = await adminClient
      .from('poll_comments')
      .insert({
        poll_id: pollId,
        author_id: user.id,
        body: text,
        parent_comment_id: parent_id || null,
        media_count: media_items?.length || 0,
      })
      .select(
        `
        *,
        author:users!author_id(anonymous_handle, avatar_seed)
      `
      )
      .single()

    if (createError) {
      logger.error(
        'Poll comment creation error:',
        createError instanceof Error ? createError : undefined
      )
      throw createError
    }

    // Insert media items if provided
    if (media_items && media_items.length > 0) {
      interface MediaItem {
        mediaType: string
        url: string
        variants?: Record<string, unknown>
        duration?: number
        thumbnailUrl?: string
        fileSize?: number
        mimeType?: string
        altText?: string
      }
      const mediaItemsToInsert = (media_items as MediaItem[]).map((item, index: number) => ({
        owner_type: 'poll_comment',
        owner_id: comment.id,
        media_type: item.mediaType,
        url: item.url,
        variants: item.variants,
        display_order: index,
        duration: item.duration || null,
        thumbnail_url: item.thumbnailUrl || null,
        file_size: item.fileSize || null,
        mime_type: item.mimeType || null,
        alt_text: item.altText || null,
      }))

      const { error: mediaError } = await adminClient.from('media_items').insert(mediaItemsToInsert)

      if (mediaError) {
        logger.error(
          'Media items creation error:',
          mediaError instanceof Error ? mediaError : undefined
        )
        // Don't fail the comment creation if media fails
      }

      // Fetch the inserted media items to include in response
      const { data: insertedMediaItems } = await adminClient
        .from('media_items')
        .select('*')
        .eq('owner_type', 'poll_comment')
        .eq('owner_id', comment.id)
        .order('display_order', { ascending: true })

      return createSuccessResponse(
        {
          ...comment,
          media_items: insertedMediaItems || [],
        },
        {
          message: 'Comment created successfully',
        }
      )
    }

    return createSuccessResponse(
      {
        ...comment,
        media_items: [],
      },
      {
        message: 'Comment created successfully',
      }
    )
  } catch (error) {
    const { id: errorPollId } = await params
    return handleAPIError(error, { method: 'POST', path: `/api/polls/${errorPollId}/comments` })
  }
})
