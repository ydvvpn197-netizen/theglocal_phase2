'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { VoteButtons } from './vote-buttons'
import { CommentForm } from './comment-form'
import { CommentActions } from './comment-actions'
import { generateGeometricAvatar } from '@/lib/utils/avatar-generator'

interface Author {
  anonymous_handle: string
  avatar_seed: string
}

interface Reply {
  id: string
  author_id: string
  text: string
  author: Author
  created_at: string
  updated_at: string
  upvotes: number
  downvotes: number
  is_deleted: boolean
  is_edited: boolean
}

interface Comment {
  id: string
  author_id: string
  text: string
  author: Author
  created_at: string
  updated_at: string
  upvotes: number
  downvotes: number
  is_deleted: boolean
  is_edited: boolean
  replies?: Reply[]
}

interface CommentThreadProps {
  comments: Comment[]
  postId: string
  onCommentAdded?: () => void
}

export function CommentThread({ comments, postId, onCommentAdded }: CommentThreadProps) {
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
        <div key={comment.id}>
          <CommentCard
            comment={comment}
            onReply={() => setReplyingTo(comment.id)}
            isReplying={replyingTo === comment.id}
            onCancelReply={() => setReplyingTo(null)}
            postId={postId}
            onReplySuccess={handleReplySuccess}
          />

          {/* Render replies with left margin */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="ml-8 mt-2 space-y-2 border-l-2 border-muted pl-4">
              {comment.replies.map((reply) => (
                <CommentCard
                  key={reply.id}
                  comment={reply}
                  isReply
                  postId={postId}
                  onReplySuccess={handleReplySuccess}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

interface CommentCardProps {
  comment: Comment | Reply
  onReply?: () => void
  onCancelReply?: () => void
  isReplying?: boolean
  isReply?: boolean
  postId: string
  onReplySuccess?: () => void
}

function CommentCard({
  comment,
  onReply,
  onCancelReply,
  isReplying,
  isReply,
  postId,
  onReplySuccess,
}: CommentCardProps) {
  const avatarSvg = generateGeometricAvatar(comment.author.avatar_seed)

  return (
    <Card className="p-4">
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar className="h-8 w-8 flex-shrink-0">
          <div dangerouslySetInnerHTML={{ __html: avatarSvg }} />
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
            </div>
            <CommentActions
              commentId={comment.id}
              authorId={comment.author_id}
              text={comment.text}
              createdAt={comment.created_at}
              onUpdate={onReplySuccess}
            />
          </div>

          {/* Comment Text */}
          <p className="text-sm">
            {comment.is_deleted ? (
              <span className="italic text-muted-foreground">[deleted]</span>
            ) : (
              comment.text
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
              />

              {!isReply && onReply && (
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
                postId={postId}
                parentId={comment.id}
                onSuccess={onReplySuccess}
                onCancel={onCancelReply}
                placeholder="Write a reply..."
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
