import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/posts/[id]/comments/enhanced - Get paginated and sorted comments
 *
 * @param _request - Next.js request with query parameters
 * @param params - Route parameters with post ID
 * @returns Paginated and sorted comments with metadata
 */
export const GET = withRateLimit(async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const logger = createAPILogger('GET', `/api/posts/${postId}/comments/enhanced`)

  try {
    const { searchParams } = new URL(_request.url)

    // Parse query parameters
    const sortBy =
      (searchParams.get('sort') as 'oldest' | 'newest' | 'top' | 'controversial') || 'oldest'
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const parentId = searchParams.get('parentId') || null
    const maxDepth = parseInt(searchParams.get('maxDepth') || '8')

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    logger.info('Fetching enhanced comments', {
      postId,
      sortBy,
      page,
      pageSize,
      parentId,
      maxDepth,
    })

    // First check if the post exists and user has access
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(
        `
        id,
        community_id,
        is_deleted,
        community:communities(
          name, 
          slug, 
          max_thread_depth,
          comments_per_page,
          default_comment_sort
        )
      `
      )
      .eq('id', postId)
      .single()

    if (postError || !post) {
      throw APIErrors.notFound('Post')
    }

    if (post.is_deleted) {
      throw APIErrors.notFound('Post')
    }

    // Access control is handled by get_comments_enhanced via can_view_post_safe
    // which checks can_view_community_safe (allows public communities, requires membership for private)
    // No need to duplicate this logic here - let the database function handle it

    // Use community settings for pagination and depth
    interface CommunitySettings {
      max_thread_depth?: number
      comments_per_page?: number
      default_comment_sort?: string
    }
    const community = post.community as CommunitySettings | null | undefined
    const communityMaxDepth = community?.max_thread_depth || maxDepth
    const communityPageSize = community?.comments_per_page || pageSize
    const communityDefaultSort = community?.default_comment_sort || sortBy

    // Get enhanced comments using the new robust database function
    logger.info('📞 Calling RPC get_comments_enhanced with params:', {
      p_post_id: postId,
      p_user_id: user?.id || null,
      p_sort_by: sortBy,
      p_page: page,
      p_page_size: Math.min(communityPageSize, 50),
      p_max_depth: communityMaxDepth,
    })

    const { data: enhancedCommentsResult, error: commentsError } = await supabase.rpc(
      'get_comments_enhanced',
      {
        p_post_id: postId,
        p_user_id: user?.id || null,
        p_sort_by: sortBy,
        p_page: page,
        p_page_size: Math.min(communityPageSize, 50), // Cap at 50 per page
        p_max_depth: communityMaxDepth,
      }
    )

    if (commentsError) {
      throw commentsError
    }

    // CRITICAL: Log what we actually got back
    logger.info('📊 RPC call succeeded, raw result:', {
      type: typeof enhancedCommentsResult,
      isNull: enhancedCommentsResult === null,
      isUndefined: enhancedCommentsResult === undefined,
      value: enhancedCommentsResult
        ? JSON.stringify(enhancedCommentsResult).substring(0, 200)
        : 'null/undefined',
    })

    // If RPC returned empty comments due to access denial, return empty result (not error)
    // The database function returns empty comments array when can_view_post_safe returns false

    // CRITICAL: Supabase RPC returns JSONB in different formats
    // It can be: string, object, or null
    // We need to handle ALL cases robustly
    logger.info('📊 Enhanced comments RPC result:', {
      resultType: typeof enhancedCommentsResult,
      isArray: Array.isArray(enhancedCommentsResult),
      resultLength: Array.isArray(enhancedCommentsResult) ? enhancedCommentsResult.length : 'N/A',
      result: JSON.stringify(enhancedCommentsResult).substring(0, 500), // Limit log size
      hasComments: enhancedCommentsResult?.comments !== undefined,
      hasPagination: enhancedCommentsResult?.pagination !== undefined,
    })

    interface CommentsData {
      comments: unknown[]
      pagination: {
        page?: number
        pageSize?: number
        totalComments: number
        totalPages?: number
        hasMore: boolean
      }
      error?: string
    }

    let commentsData: CommentsData

    // If result is null or undefined, return empty structure
    if (!enhancedCommentsResult) {
      logger.warn(
        '⚠️ RPC returned null/undefined result - this might mean can_view_post_safe returned false'
      )
      commentsData = {
        comments: [],
        pagination: {
          page: page,
          pageSize: communityPageSize,
          totalComments: 0,
          totalPages: 0,
          hasMore: false,
        },
      }
    } else if (typeof enhancedCommentsResult === 'string') {
      // JSONB returned as string, parse it
      try {
        const parsed = JSON.parse(enhancedCommentsResult)
        // After parsing, check if it's the expected structure
        if (parsed && typeof parsed === 'object') {
          if (parsed.comments !== undefined || parsed.pagination !== undefined) {
            commentsData = parsed
          } else {
            // Might be wrapped - try to extract
            commentsData = {
              comments: Array.isArray(parsed) ? parsed : [],
              pagination: parsed.pagination || {
                totalComments: Array.isArray(parsed) ? parsed.length : 0,
                hasMore: false,
              },
            }
          }
        } else {
          throw new Error('Parsed result is not an object')
        }
      } catch (error) {
        logger.error('Failed to parse JSONB result', error instanceof Error ? error : undefined)
        commentsData = {
          comments: [],
          pagination: {
            page: page,
            pageSize: communityPageSize,
            totalComments: 0,
            totalPages: 0,
            hasMore: false,
          },
        }
      }
    } else if (Array.isArray(enhancedCommentsResult)) {
      // If it's an array directly, wrap it
      logger.info('📊 RPC returned array directly, wrapping in structure')
      commentsData = {
        comments: enhancedCommentsResult,
        pagination: {
          totalComments: enhancedCommentsResult.length,
          hasMore: false,
        },
      }
    } else if (typeof enhancedCommentsResult === 'object') {
      // It's an object - check structure
      if (
        enhancedCommentsResult.comments !== undefined ||
        enhancedCommentsResult.pagination !== undefined
      ) {
        // It's already in the expected format
        commentsData = enhancedCommentsResult
        logger.info('📊 RPC result is in expected format')
      } else {
        // It might be wrapped - check all keys
        logger.warn('RPC result is object but not in expected format', {
          keys: Object.keys(enhancedCommentsResult),
          fullResult: JSON.stringify(enhancedCommentsResult).substring(0, 1000),
        })

        // Try to find comments array in any key
        let foundComments: unknown[] = []
        let foundPagination: CommentsData['pagination'] | null = null
        const resultObj = enhancedCommentsResult as Record<string, unknown>

        for (const [key, value] of Object.entries(resultObj)) {
          if (Array.isArray(value)) {
            foundComments = value
            logger.info(`Found comments array in key: ${key}`, { length: value.length })
          } else if (value && typeof value === 'object') {
            const val = value as Record<string, unknown>
            if (val.totalComments !== undefined || val.page !== undefined) {
              foundPagination = val as CommentsData['pagination']
              logger.info(`Found pagination in key: ${key}`)
            }
          }
        }

        if (foundComments.length > 0 || foundPagination) {
          commentsData = {
            comments: foundComments,
            pagination: foundPagination || {
              totalComments: foundComments.length,
              hasMore: false,
            },
          }
          logger.info('📊 Extracted comments from wrapped structure')
        } else {
          // Fallback: check if the entire object is actually the comments array structure
          // Sometimes Supabase returns { data: {...} } wrapper
          const resultObj = enhancedCommentsResult as Record<string, unknown>
          if (resultObj.data) {
            const data = resultObj.data as Record<string, unknown>
            if (data.comments !== undefined || data.pagination !== undefined) {
              commentsData = data as unknown as CommentsData
              logger.info('📊 Found comments in data wrapper')
            } else {
              commentsData = {
                comments: [],
                pagination: {
                  page: page,
                  pageSize: communityPageSize,
                  totalComments: 0,
                  totalPages: 0,
                  hasMore: false,
                },
              }
            }
          } else {
            // Last resort: return empty
            commentsData = {
              comments: [],
              pagination: {
                page: page,
                pageSize: communityPageSize,
                totalComments: 0,
                totalPages: 0,
                hasMore: false,
              },
            }
          }
        }
      }
    } else {
      // Unknown type
      logger.error(
        '❌ Unexpected RPC result type:',
        typeof enhancedCommentsResult,
        enhancedCommentsResult
      )
      commentsData = {
        comments: [],
        pagination: {
          page: page,
          pageSize: communityPageSize,
          totalComments: 0,
          totalPages: 0,
          hasMore: false,
        },
      }
    }

    logger.info('📊 Parsed commentsData:', {
      hasComments: commentsData.comments !== undefined,
      commentsIsArray: Array.isArray(commentsData.comments),
      commentsLength: Array.isArray(commentsData.comments) ? commentsData.comments.length : 'N/A',
      hasPagination: commentsData.pagination !== undefined,
    })

    // Check if the response contains an error field (from database function exception handler)
    if (commentsData.error) {
      throw new Error(commentsData.error)
    }

    // Ensure comments is an array
    // Handle case where comments might be a JSON string or nested structure
    let paginatedComments: unknown[] = []

    if (Array.isArray(commentsData.comments)) {
      paginatedComments = commentsData.comments
    } else if (typeof commentsData.comments === 'string') {
      // Comments might be a JSON string
      try {
        const parsed = JSON.parse(commentsData.comments)
        paginatedComments = Array.isArray(parsed) ? parsed : parsed ? [parsed] : []
      } catch (e) {
        logger.error('❌ Failed to parse comments string:', e instanceof Error ? e : undefined)
        paginatedComments = []
      }
    } else if (commentsData.comments) {
      // Single comment object
      paginatedComments = [commentsData.comments]
    } else {
      paginatedComments = []
    }

    logger.info('📊 Parsed comments data:', {
      commentsCount: paginatedComments.length,
      pagination: commentsData.pagination,
      commentsDataType: typeof commentsData.comments,
      commentsDataIsArray: Array.isArray(commentsData.comments),
      firstCommentId: (paginatedComments[0] as Record<string, unknown> | undefined)?.id || 'none',
    })

    if (!paginatedComments || paginatedComments.length === 0) {
      return createSuccessResponse({
        comments: [],
        pagination: {
          currentPage: page,
          pageSize: communityPageSize,
          totalComments: commentsData.pagination?.totalComments || 0,
          hasNextPage: false,
          hasPreviousPage: page > 1,
        },
        metadata: {
          sortBy,
          maxDepth: communityMaxDepth,
          communityDefaults: {
            sort: communityDefaultSort,
            pageSize: communityPageSize,
            maxDepth: communityMaxDepth,
          },
        },
      })
    }

    // Extract structured comments from the enhanced result
    // The get_comments_enhanced function already includes author info in the proper format
    let structuredComments = paginatedComments

    // Get media items for comments in batch if needed
    interface CommentWithId {
      id: string
      [key: string]: unknown
    }
    const commentIds = (paginatedComments as CommentWithId[]).map((comment) => comment.id)
    if (commentIds.length > 0) {
      const { data: mediaItems } = await supabase
        .from('media_items')
        .select('*')
        .eq('owner_type', 'comment')
        .in('owner_id', commentIds)
        .order('display_order')

      // Group media by comment ID and attach to comments
      const mediaByComment = new Map()
      mediaItems?.forEach((media) => {
        if (!mediaByComment.has(media.owner_id)) {
          mediaByComment.set(media.owner_id, [])
        }
        mediaByComment.get(media.owner_id).push(media)
      })

      // Attach media items to structured comments
      interface CommentWithReplies extends CommentWithId {
        replies?: unknown[]
      }
      structuredComments = (structuredComments as CommentWithReplies[]).map((comment) => ({
        ...comment,
        media_items: mediaByComment.get(comment.id) || [],
        replies: comment.replies || [], // Preserve existing replies structure
      }))
    }

    // If this is a top-level _request, optionally fetch immediate replies for preview
    if (!parentId) {
      // For now, we'll use the existing replies structure from the enhanced function
      // In the future, we could add preview functionality here if needed
      logger.info(`📝 Top-level comments loaded with ${structuredComments.length} items`)
    } else {
      logger.info(
        `📝 Child comments loaded for parent ${parentId}: ${structuredComments.length} items`
      )
    }

    // Use pagination data from enhanced function instead of separate stats call
    const stats = {
      total_comments: commentsData.pagination?.totalComments || 0,
      top_level_comments: structuredComments.length,
      avg_thread_depth: 0, // Could be calculated if needed
      most_popular_comment_id: null,
    }

    logger.info('Enhanced comments fetched successfully', {
      postId,
      commentCount: structuredComments.length,
      page,
    })

    return createSuccessResponse({
      comments: structuredComments,
      pagination: {
        currentPage: page,
        pageSize: communityPageSize,
        totalComments: commentsData.pagination?.totalComments || 0,
        topLevelComments: (structuredComments as CommentWithId[]).filter(
          (c) => !(c as CommentWithId & { parent_comment_id?: string }).parent_comment_id
        ).length,
        hasNextPage: commentsData.pagination?.hasMore || false,
        hasPreviousPage: page > 1,
      },
      metadata: {
        sortBy,
        parentId,
        maxDepth: communityMaxDepth,
        averageThreadDepth: stats.avg_thread_depth || 0,
        mostPopularCommentId: stats.most_popular_comment_id,
        communityDefaults: {
          sort: communityDefaultSort,
          pageSize: communityPageSize,
          maxDepth: communityMaxDepth,
        },
      },
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: `/api/posts/${postId}/comments/enhanced`,
    })
  }
})

/**
 * POST /api/posts/[id]/comments/enhanced - Create comment using enhanced system
 *
 * @param _request - Next.js request with comment data
 * @param params - Route parameters with post ID
 * @returns Created comment with metadata
 */
export const POST = withRateLimit(async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const logger = createAPILogger('POST', `/api/posts/${postId}/comments/enhanced`)

  try {
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

    logger.info('Creating enhanced comment', {
      postId,
      userId: user.id,
      hasParent: !!parent_id,
      mediaCount: media_items?.length || 0,
    })

    logger.info('Enhanced comment creation', {
      postId,
      parentId: parent_id,
      userId: user.id,
      commentLength: text.length,
      mediaItems: media_items?.length || 0,
    })

    // Check thread depth if this is a reply
    if (parent_id) {
      const { data: continuationInfo } = await supabase.rpc('get_thread_continuation_info', {
        p_comment_id: parent_id,
      })

      if (continuationInfo?.[0]?.needs_continuation) {
        logger.info('Thread depth limit reached, creating continuation')

        // Create continuation thread
        const { data: continuationThreadId } = await supabase.rpc('create_continuation_thread', {
          p_post_id: postId,
          p_root_comment_id: parent_id, // In a real implementation, we'd find the root
          p_continuation_after_comment_id: parent_id,
        })

        logger.info('Created continuation thread:', continuationThreadId)
      }
    }

    // Validate and prepare media items
    let mediaItemsJson = '[]'
    if (media_items && Array.isArray(media_items) && media_items.length > 0) {
      try {
        mediaItemsJson = JSON.stringify(media_items)
      } catch (error) {
        throw APIErrors.badRequest('Invalid media_items format')
      }
    }
    // Use the enhanced comment creation function
    const { data: newComment, error: commentError } = await supabase.rpc(
      'create_comment_with_media',
      {
        p_post_id: postId,
        p_body: text.trim(),
        p_parent_id: parent_id || null,
        p_media_items: mediaItemsJson,
      }
    )

    if (commentError || !newComment) {
      logger.error(
        'Comment creation failed:',
        commentError instanceof Error ? commentError : undefined
      )
      throw new Error(commentError?.message || 'Failed to create comment')
    }

    const result = newComment[0]

    if (!result.success) {
      throw new Error(result.error_message || 'Comment creation failed')
    }

    logger.info('✅ Enhanced comment created successfully:', result.comment_id)

    // Fetch the complete comment data with author info
    const { data: completeComment } = await supabase
      .from('comments')
      .select(
        `
        *,
        author:users!author_id(anonymous_handle, avatar_seed),
        media_items:media_items(*)
      `
      )
      .eq('id', result.comment_id)
      .single()

    logger.info('Enhanced comment created successfully', {
      commentId: result.comment_id,
      postId,
      userId: user.id,
    })

    return createSuccessResponse(
      {
        comment: completeComment,
        metadata: {
          thread_depth: result.thread_depth || 0,
          is_continuation: result.is_continuation || false,
        },
      },
      {
        message: 'Comment created successfully',
      }
    )
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: `/api/posts/${postId}/comments/enhanced`,
    })
  }
})
