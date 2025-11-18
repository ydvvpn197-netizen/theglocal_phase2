'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { VoteButtons } from '@/components/posts/vote-buttons'
import { CommentForm } from '@/components/posts/comment-form'
import { CommentActions } from '@/components/posts/comment-actions'
import { generateGeometricAvatar } from '@/lib/utils/avatar-generator'
import { createSafeSVG } from '@/lib/security/sanitize'

interface Author {
  anonymous_handle: string
  avatar_seed: string
}

interface Reply {
  id: string
  author_id: string
  body: string
  author: Author
  created_at: string
  updated_at: string
  upvotes: number
  downvotes: number
  is_deleted: boolean
  is_edited: boolean
  user_vote?: 'upvote' | 'downvote' | null
}

interface Comment {
  id: string
  author_id: string
  body: string
  author: Author
  created_at: string
  updated_at: string
  upvotes: number
  downvotes: number
  is_deleted: boolean
  is_edited: boolean
  user_vote?: 'upvote' | 'downvote' | null
  replies?: Reply[]
}

interface PollCommentThreadProps {
  comments: Comment[]
  pollId: string
  onCommentAdded?: () => void
  currentUserRole?: 'admin' | 'moderator' | 'member' | null
  communityId?: string
}

export function PollCommentThread({
  comments,
  pollId,
  onCommentAdded,
  currentUserRole,
  communityId,
}: PollCommentThreadProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  const handleReplySuccess = () => {
    setReplyingTo(null)
    onCommentAdded?.()
  }

  if (comments.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <MessageCircle className="mx-auto mb-4 h-12 w-12 opacity-20" />
        <p>No comments yet. Be the first to comment!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentTree
          key={comment.id}
          comment={comment}
          pollId={pollId}
          onReplySuccess={handleReplySuccess}
          currentUserRole={currentUserRole}
          communityId={communityId}
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
          depth={0}
        />
      ))}
    </div>
  )
}

interface CommentTreeProps {
  comment: Comment
  pollId: string
  onReplySuccess?: () => void
  currentUserRole?: 'admin' | 'moderator' | 'member' | null
  communityId?: string
  replyingTo: string | null
  setReplyingTo: (id: string | null) => void
  depth: number
}

interface CommentCardProps {
  comment: Comment | Reply
  onReply?: () => void
  onCancelReply?: () => void
  isReplying?: boolean
  pollId: string
  onReplySuccess?: () => void
  currentUserRole?: 'admin' | 'moderator' | 'member' | null
  communityId?: string
  depth?: number
}

// Recursive component to handle infinite nesting
function CommentTree({
  comment,
  pollId,
  onReplySuccess,
  currentUserRole,
  communityId,
  replyingTo,
  setReplyingTo,
  depth,
}: CommentTreeProps) {
  return (
    <div>
      <CommentCard
        comment={comment}
        onReply={() => setReplyingTo(comment.id)}
        onCancelReply={() => setReplyingTo(null)}
        isReplying={replyingTo === comment.id}
        pollId={pollId}
        onReplySuccess={onReplySuccess}
        currentUserRole={currentUserRole}
        communityId={communityId}
        depth={depth}
      />

      {/* Recursively render replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div
          className={`mt-2 space-y-2 border-l-2 border-muted pl-4 ${
            depth > 0 ? `ml-${Math.min(depth * 4, 16)}` : ''
          }`}
        >
          {comment.replies.map((reply) => (
            <CommentTree
              key={reply.id}
              comment={reply}
              pollId={pollId}
              onReplySuccess={onReplySuccess}
              currentUserRole={currentUserRole}
              communityId={communityId}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CommentCard({
  comment,
  onReply,
  onCancelReply,
  isReplying,
  pollId,
  onReplySuccess,
  currentUserRole,
  communityId,
  depth: _depth = 0,
}: CommentCardProps) {
  const avatarSvg = generateGeometricAvatar(comment.author.avatar_seed)
  const safeSvg = createSafeSVG(avatarSvg)

  return (
    <Card className="p-4">
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar className="h-8 w-8 flex-shrink-0">
          <div dangerouslySetInnerHTML={safeSvg} />
        </Avatar>

        <div className="flex-1 space-y-2">
          {/* Author & Timestamp & Actions */}
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2 text-sm">
              <span className="font-medium">{comment.author.anonymous_handle}</span>
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
              {comment.is_edited && <span className="text-xs text-muted-foreground">(edited)</span>}
              {comment.is_deleted && (
                <Badge variant="destructive" className="text-xs">
                  Deleted
                </Badge>
              )}
            </div>
            <CommentActions
              commentId={comment.id}
              authorId={comment.author_id}
              text={comment.body}
              onUpdate={onReplySuccess}
              currentUserRole={currentUserRole}
              communityId={communityId}
            />
          </div>

          {/* Comment Text */}
          <p className="text-sm">
            {comment.is_deleted ? (
              <span className="italic text-muted-foreground">[deleted]</span>
            ) : (
              comment.body
            )}
          </p>

          {/* Actions */}
          {!comment.is_deleted && (
            <div className="flex items-center gap-4">
              <VoteButtons
                contentId={comment.id}
                contentType="comment"
                upvotes={comment.upvotes}
                downvotes={comment.downvotes}
                userVote={comment.user_vote}
              />

              {onReply && (
                <Button variant="ghost" size="sm" onClick={onReply}>
                  Reply
                </Button>
              )}
            </div>
          )}

          {/* Reply Form */}
          {isReplying && onCancelReply && (
            <div className="mt-2">
              <CommentForm
                postId={pollId}
                parentId={comment.id}
                onSuccess={onReplySuccess}
                onCancel={onCancelReply}
                placeholder="Write a reply..."
                isPollComment={true}
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
