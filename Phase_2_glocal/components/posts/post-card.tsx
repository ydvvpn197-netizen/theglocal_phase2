'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { MessageSquare, MapPin } from 'lucide-react'
import { VoteButtons } from './vote-buttons'
import { PostActions } from './post-actions'
import { generateAvatarDataUrl } from '@/lib/utils/avatar-generator'

interface Post {
  id: string
  community_id: string
  author_id: string
  title: string
  body: string | null
  image_url: string | null
  location_city: string | null
  upvotes: number
  downvotes: number
  comment_count: number
  is_deleted: boolean
  is_edited: boolean
  created_at: string
  author?: {
    anonymous_handle: string
    avatar_seed: string
  }
  community?: {
    name: string
    slug: string
  }
}

interface PostCardProps {
  post: Post
  showCommunity?: boolean
  onUpdate?: () => void
}

export function PostCard({ post, showCommunity = true, onUpdate }: PostCardProps) {
  if (post.is_deleted) {
    return (
      <Card className="opacity-60">
        <CardContent className="py-6 text-center text-muted-foreground">[deleted]</CardContent>
      </Card>
    )
  }

  const avatarDataUrl = post.author?.avatar_seed
    ? generateAvatarDataUrl(post.author.avatar_seed)
    : null

  const timeAgo = getTimeAgo(post.created_at)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {avatarDataUrl && (
              <Avatar className="h-10 w-10">
                <Image src={avatarDataUrl} alt="" width={40} height={40} />
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-semibold">
                  {post.author?.anonymous_handle || 'Anonymous'}
                </span>
                {post.is_edited && (
                  <Badge variant="outline" className="text-xs">
                    edited
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                {showCommunity && post.community && (
                  <>
                    <Link
                      href={`/communities/${post.community.slug}`}
                      className="hover:text-brand-primary"
                    >
                      c/{post.community.slug}
                    </Link>
                    <span>•</span>
                  </>
                )}
                <span>{timeAgo}</span>
                {post.location_city && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{post.location_city}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Post Actions */}
          <PostActions
            postId={post.id}
            authorId={post.author_id}
            title={post.title}
            body={post.body}
            createdAt={post.created_at}
            onUpdate={onUpdate}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <Link href={`/posts/${post.id}`}>
          <h3 className="text-lg font-semibold hover:text-brand-primary transition-colors">
            {post.title}
          </h3>
        </Link>

        {post.body && (
          <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
            {post.body}
          </p>
        )}

        {post.image_url && (
          <div className="relative w-full h-64 rounded-md overflow-hidden">
            <Image src={post.image_url} alt={post.title} fill className="object-cover" />
          </div>
        )}

        <div className="flex items-center gap-4 pt-2">
          <VoteButtons
            contentType="post"
            contentId={post.id}
            upvotes={post.upvotes}
            downvotes={post.downvotes}
          />

          <Link
            href={`/posts/${post.id}`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            <span>{post.comment_count} comments</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function getTimeAgo(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return then.toLocaleDateString()
}
