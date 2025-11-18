'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronDown, ChevronRight, MessageCircle, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CommentForm } from './comment-form'
import { VoteButtons } from '@/components/posts/vote-buttons'
import { MediaGallery } from './media-gallery'
import type { MediaItem } from '@/lib/types/api.types'
import { useAuth } from '@/lib/context/auth-context'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { ReportButton } from '@/components/moderation/report-button'

export interface EnhancedComment {
  id: string
  post_id: string
  parent_comment_id: string | null
  author_id: string
  body: string
  upvotes: number
  downvotes: number
  media_count: number
  is_deleted: boolean
  is_edited: boolean
  created_at: string
  updated_at: string
  user_vote: 'upvote' | 'downvote' | null
  author: {
    anonymous_handle: string
    avatar_seed: string
  }
  media_items?: Array<Record<string, unknown>>
  score: number
  reply_count: number
  depth_level: number
  has_more_replies: boolean
  replies: EnhancedComment[]
  needs_continuation?: boolean
  continuation_url?: string
}

interface EnhancedCommentThreadProps {
  comments: EnhancedComment[]
  postId: string
  isAuthenticated: boolean
  communityId?: string
  currentUserRole?: 'admin' | 'moderator' | 'member' | null
  maxDisplayDepth?: number
  allowSorting?: boolean
  defaultSort?: 'oldest' | 'newest' | 'top' | 'controversial'
  onCommentAdded?: () => void
}

interface CommentNodeProps {
  comment: EnhancedComment
  postId: string
  depth: number
  maxDepth: number
  isAuthenticated: boolean
  currentUserRole?: 'admin' | 'moderator' | 'member' | null
  onCommentAdded?: () => void
  onLoadMoreReplies?: (commentId: string) => void
  sortBy: string
}

function CommentNode({
  comment,
  postId,
  depth,
  maxDepth,
  isAuthenticated,
  currentUserRole,
  onCommentAdded,
  onLoadMoreReplies,
  sortBy,
}: CommentNodeProps) {
  // CRITICAL: All hooks must be called before any early returns
  // This is required by React Hooks rules
  const { user } = useAuth()
  const [_isExpanded, _setIsExpanded] = useState(true)
  const [isReplying, setIsReplying] = useState(false)
  const [showReplies, setShowReplies] = useState(true)
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // CRITICAL: All hooks (including useEffect) must be called before any early returns
  // Prevent hydration mismatch by only rendering date after mount
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // CRITICAL: Validate comment before accessing properties
  // This prevents React error #185 (Cannot read property of undefined)
  if (!comment || !comment.id) {
    logger.error('CommentNode: Invalid comment received', comment)
    return null
  }

  // Ensure all required properties exist with defaults
  const safeComment: EnhancedComment = {
    ...comment,
    id: String(comment.id),
    post_id: String(comment.post_id || ''),
    parent_comment_id: comment.parent_comment_id ? String(comment.parent_comment_id) : null,
    author_id: String(comment.author_id || ''),
    body: String(comment.body || ''),
    upvotes: Number(comment.upvotes || 0),
    downvotes: Number(comment.downvotes || 0),
    media_count: Number(comment.media_count || 0),
    score: Number(comment.score || 0),
    reply_count: Number(comment.reply_count || 0),
    depth_level: Number(comment.depth_level || 0),
    has_more_replies: Boolean(comment.has_more_replies || false),
    replies: Array.isArray(comment.replies) ? comment.replies : [],
    is_deleted: Boolean(comment.is_deleted || false),
    is_edited: Boolean(comment.is_edited || false),
    created_at: String(comment.created_at || new Date().toISOString()),
    updated_at: String(comment.updated_at || comment.created_at || new Date().toISOString()),
    user_vote:
      comment.user_vote === 'upvote' || comment.user_vote === 'downvote' ? comment.user_vote : null,
    author: {
      anonymous_handle: String(comment.author?.anonymous_handle || 'Anonymous'),
      avatar_seed: String(comment.author?.avatar_seed || ''),
    },
    media_items: Array.isArray(comment.media_items) ? comment.media_items : [],
  }

  // Use safeComment instead of comment throughout
  const commentToUse = safeComment

  const isOwnComment = user?.id === commentToUse.author_id
  const canReply = isAuthenticated && depth < maxDepth
  // Ensure replies is always an array to prevent hydration errors
  const safeReplies = Array.isArray(commentToUse.replies) ? commentToUse.replies : []
  const hasVisibleReplies = safeReplies.length > 0
  const needsContinuation = commentToUse.needs_continuation || depth >= maxDepth

  // Generate a unique color for the thread line based on depth
  const getThreadColor = (depth: number) => {
    const colors = [
      'border-blue-300',
      'border-green-300',
      'border-purple-300',
      'border-orange-300',
      'border-pink-300',
      'border-indigo-300',
      'border-teal-300',
      'border-red-300',
    ]
    return colors[depth % colors.length]
  }

  const handleLoadMoreReplies = async () => {
    if (onLoadMoreReplies) {
      setLoadingReplies(true)
      await onLoadMoreReplies(commentToUse.id)
      setLoadingReplies(false)
    }
  }

  const formatCommentTime = (dateString: string) => {
    if (!isMounted) {
      // Return a placeholder during SSR to prevent hydration mismatch
      return 'just now'
    }
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch (error) {
      logger.warn('Error formatting date:', error)
      return 'just now'
    }
  }

  return (
    <div
      className={cn(
        'relative',
        depth > 0 && 'ml-4 pl-4 border-l-2',
        depth > 0 && getThreadColor(depth - 1)
      )}
    >
      {/* Comment Header */}
      <div className="flex items-start gap-3 mb-2">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {commentToUse.author.anonymous_handle.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          {/* Author and Meta Info */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{commentToUse.author.anonymous_handle}</span>
            {isOwnComment && (
              <Badge variant="outline" className="text-xs">
                You
              </Badge>
            )}
            {commentToUse.is_edited && (
              <Badge variant="secondary" className="text-xs">
                Edited
              </Badge>
            )}
            {commentToUse.is_deleted && (
              <Badge variant="destructive" className="text-xs">
                Deleted
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatCommentTime(commentToUse.created_at)}
            </span>
            <span className="text-xs text-muted-foreground">Lv.{depth + 1}</span>
          </div>

          {/* Comment Body */}
          <div className="prose prose-sm max-w-none mb-2">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {commentToUse.is_deleted ? (
                <span className="italic text-muted-foreground">[deleted]</span>
              ) : (
                commentToUse.body
              )}
            </p>
          </div>

          {/* Media Items */}
          {!commentToUse.is_deleted &&
            commentToUse.media_items &&
            commentToUse.media_items.length > 0 && (
              <div className="mb-3">
                <MediaGallery
                  mediaItems={commentToUse.media_items as unknown as MediaItem[]}
                  maxItems={5}
                  compact={false}
                  showLightbox={true}
                  className="mt-2"
                />
              </div>
            )}

          {/* Comment Actions */}
          <div className="flex items-center gap-2 mb-2">
            {!commentToUse.is_deleted && (
              <>
                <VoteButtons
                  contentType="comment"
                  contentId={commentToUse.id}
                  upvotes={commentToUse.upvotes}
                  downvotes={commentToUse.downvotes}
                  userVote={commentToUse.user_vote}
                />

                {canReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setIsReplying(!isReplying)}
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                )}
                <ReportButton
                  contentType="comment"
                  contentId={commentToUse.id}
                  variant="ghost"
                  size="sm"
                  showLabel={false}
                />
              </>
            )}

            {commentToUse.reply_count > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setShowReplies(!showReplies)}
              >
                {showReplies ? (
                  <ChevronDown className="h-3 w-3 mr-1" />
                ) : (
                  <ChevronRight className="h-3 w-3 mr-1" />
                )}
                {commentToUse.reply_count} repl{commentToUse.reply_count === 1 ? 'y' : 'ies'}
              </Button>
            )}

            {!commentToUse.is_deleted && needsContinuation && commentToUse.reply_count > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs ml-auto"
                onClick={() => {
                  if (commentToUse.continuation_url) {
                    window.open(commentToUse.continuation_url, '_blank')
                  }
                }}
              >
                <ArrowRight className="h-3 w-3 mr-1" />
                Continue thread
              </Button>
            )}
          </div>

          {/* Reply Form */}
          {isReplying && canReply && (
            <div className="mb-4 p-3 bg-muted/30 rounded-lg">
              <CommentForm
                postId={postId}
                parentId={commentToUse.id}
                placeholder="Write a reply..."
                onSuccess={() => {
                  setIsReplying(false)
                  onCommentAdded?.()
                }}
                onCancel={() => setIsReplying(false)}
              />
            </div>
          )}

          {/* Thread Continuation Warning */}
          {needsContinuation && depth >= maxDepth && (
            <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
              <div className="flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                <span>Thread too deep - replies will continue in a new page</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {showReplies && hasVisibleReplies && depth < maxDepth && (
        <div className="space-y-4">
          {safeReplies.map((reply) => {
            // Ensure reply is valid before rendering
            if (!reply || !reply.id) {
              logger.warn('CommentNode: Skipping invalid reply', reply)
              return null
            }
            return (
              <CommentNode
                key={reply.id}
                comment={reply}
                postId={postId}
                depth={depth + 1}
                maxDepth={maxDepth}
                isAuthenticated={isAuthenticated}
                currentUserRole={currentUserRole}
                onCommentAdded={onCommentAdded}
                onLoadMoreReplies={onLoadMoreReplies}
                sortBy={sortBy}
              />
            )
          })}
        </div>
      )}

      {/* Load More Replies */}
      {comment.has_more_replies && showReplies && depth < maxDepth && (
        <div className="mt-2 ml-11">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-blue-600"
            onClick={handleLoadMoreReplies}
            disabled={loadingReplies}
          >
            {loadingReplies ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Load more replies
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

export function EnhancedCommentThread({
  comments,
  postId,
  isAuthenticated,
  communityId: _communityId,
  currentUserRole,
  maxDisplayDepth = 8,
  allowSorting = true,
  defaultSort = 'oldest',
  onCommentAdded,
}: EnhancedCommentThreadProps) {
  const [sortBy, setSortBy] = useState(defaultSort)
  const [_currentPage, _setCurrentPage] = useState(1)
  const [_loadingMore, _setLoadingMore] = useState(false)

  // Sort comments based on selected sort option
  // Ensure comments is always an array to prevent hydration errors
  const sortedComments = useMemo(() => {
    // Guard against null/undefined/non-array input
    if (!Array.isArray(comments)) {
      logger.warn(
        'EnhancedCommentThread: comments is not an array, returning empty array',
        comments
      )
      return []
    }

    const sorted = [...comments]

    // Filter out invalid comments before sorting
    const validComments = sorted.filter((comment) => comment && comment.id)

    switch (sortBy) {
      case 'newest':
        return validComments.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      case 'top':
        return validComments.sort((a, b) => b.score - a.score)
      case 'controversial':
        return validComments.sort((a, b) => b.upvotes + b.downvotes - (a.upvotes + a.downvotes))
      case 'oldest':
      default:
        return validComments.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
    }
  }, [comments, sortBy])

  const handleLoadMoreReplies = useCallback(async (commentId: string) => {
    // This would typically fetch more replies for a specific comment
    logger.info(`Loading more replies for comment: ${commentId}`)
    // Implementation would involve API call to get paginated replies
  }, [])

  // Ensure comments is always an array before checking length
  const safeComments = Array.isArray(comments) ? comments : []

  const totalComments = useMemo(() => {
    const countComments = (comments: EnhancedComment[]): number => {
      // Ensure comments is always an array
      if (!Array.isArray(comments)) {
        return 0
      }
      return comments.reduce((total, comment) => {
        // Ensure replies is always an array
        const safeReplies = Array.isArray(comment.replies) ? comment.replies : []
        return total + 1 + countComments(safeReplies)
      }, 0)
    }
    return countComments(safeComments)
  }, [safeComments])
  if (safeComments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No comments yet</p>
        {isAuthenticated && <p className="text-xs mt-2">Be the first to share your thoughts!</p>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Comment Header with Sorting */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">
            {totalComments} Comment{totalComments !== 1 ? 's' : ''}
          </h3>
          <Badge variant="outline" className="text-xs">
            {safeComments.length} top-level
          </Badge>
        </div>

        {allowSorting && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
              <SelectTrigger className="w-32 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="top">Top Voted</SelectItem>
                <SelectItem value="controversial">Most Discussed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Comment Thread */}
      <div className="space-y-6">
        {sortedComments.map((comment) => {
          // Ensure comment is valid before rendering
          if (!comment || !comment.id) {
            logger.warn('EnhancedCommentThread: Skipping invalid comment', comment)
            return null
          }
          return (
            <CommentNode
              key={comment.id}
              comment={comment}
              postId={postId}
              depth={0}
              maxDepth={maxDisplayDepth}
              isAuthenticated={isAuthenticated}
              currentUserRole={currentUserRole}
              onCommentAdded={onCommentAdded}
              onLoadMoreReplies={handleLoadMoreReplies}
              sortBy={sortBy}
            />
          )
        })}
      </div>

      {/* Load More Top-Level Comments */}
      {safeComments.length >= 20 && (
        <div className="text-center pt-4">
          <Button
            variant="outline"
            onClick={() => _setCurrentPage((prev: number) => prev + 1)}
            disabled={_loadingMore}
          >
            {_loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading more comments...
              </>
            ) : (
              'Load more comments'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
