import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PostCard } from '@/components/posts/post-card'
import { CommentThread } from '@/components/posts/comment-thread'
import { CommentForm } from '@/components/posts/comment-form'
import { Card } from '@/components/ui/card'

interface PostDetailPageProps {
  params: { id: string }
}

async function PostDetailContent({ postId }: { postId: string }) {
  const supabase = await createClient()

  // Fetch post
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:users!author_id(anonymous_handle, avatar_seed),
      community:communities!community_id(name, slug)
    `
    )
    .eq('id', postId)
    .single()

  if (postError || !post) {
    return notFound()
  }

  // Fetch comments
  const { data: comments } = await supabase
    .from('comments')
    .select(
      `
      *,
      author:users!author_id(anonymous_handle, avatar_seed),
      replies:comments!parent_id(
        *,
        author:users!author_id(anonymous_handle, avatar_seed)
      )
    `
    )
    .eq('post_id', postId)
    .is('parent_id', null)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Post Card */}
      <PostCard post={post} showCommunity={true} />

      {/* Comments Section */}
      <div className="mt-8 space-y-6">
        <h2 className="text-xl font-semibold">
          Comments {comments && comments.length > 0 && `(${comments.length})`}
        </h2>

        {/* Add Comment Form */}
        <Card className="p-4">
          <CommentForm postId={postId} />
        </Card>

        {/* Comment Thread */}
        <Suspense fallback={<div>Loading comments...</div>}>
          <CommentThread comments={comments || []} postId={postId} />
        </Suspense>
      </div>
    </div>
  )
}

export default function PostDetailPage({ params }: PostDetailPageProps) {
  return (
    <Suspense fallback={<div>Loading post...</div>}>
      <PostDetailContent postId={params.id} />
    </Suspense>
  )
}

export async function generateMetadata({ params }: PostDetailPageProps) {
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('posts')
    .select('title, body')
    .eq('id', params.id)
    .single()

  if (!post) {
    return {
      title: 'Post Not Found',
    }
  }

  return {
    title: post.title,
    description: post.body?.slice(0, 160),
  }
}
