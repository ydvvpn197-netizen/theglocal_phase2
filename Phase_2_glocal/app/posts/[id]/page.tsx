import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PostCard } from '@/components/posts/post-card'
import { CommentThread } from '@/components/posts/comment-thread'
import { CommentForm } from '@/components/posts/comment-form'
import { Card } from '@/components/ui/card'
import { ErrorBoundary } from '@/components/error-boundary'
import { getUserCommunityRole } from '@/lib/utils/permissions'

interface PostDetailPageProps {
  params: { id: string }
}

async function PostDetailContent({ postId }: { postId: string }) {
  console.log('PostDetailContent: Fetching post', postId);
  
  try {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('PostDetailContent: Missing Supabase environment variables');
      notFound()
    }

    const supabase = await createClient()
    console.log('PostDetailContent: Supabase client created successfully');

    // Get current user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('PostDetailContent: Auth error', authError.message);
      notFound()
    }
    
    console.log('PostDetailContent: User auth status', user ? 'authenticated' : 'not authenticated');

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

    console.log('PostDetailContent: Post fetch result', { post: !!post, error: postError?.message });

    if (postError) {
      console.error('PostDetailContent: Post fetch error', postError.message);
      notFound()
    }

    if (!post) {
      console.log('PostDetailContent: Post not found');
      notFound()
    }

    // Fetch user's vote on this post if authenticated
    if (user) {
      try {
        const { data: userVote, error: voteError } = await supabase
          .from('votes')
          .select('vote_type')
          .eq('user_id', user.id)
          .eq('content_type', 'post')
          .eq('content_id', postId)
          .single()

        if (voteError && voteError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('PostDetailContent: Vote fetch error', voteError.message);
        } else {
          post.user_vote = userVote?.vote_type || null
        }
      } catch (error) {
        console.error('PostDetailContent: Vote fetch exception', error);
      }
    }

    // Fetch comments
    let comments = []
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(
          `
          *,
          author:users!author_id(anonymous_handle, avatar_seed),
          replies:comments!parent_comment_id(
            *,
            author:users!author_id(anonymous_handle, avatar_seed)
          )
        `
        )
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: true })

      if (commentsError) {
        console.error('PostDetailContent: Comments fetch error', commentsError.message);
      } else {
        comments = commentsData || []
        
        // Fetch user votes for comments if user is authenticated
        if (user && comments.length > 0) {
          // Collect all comment IDs (including replies)
          const commentIds: string[] = []
          comments.forEach((comment: any) => {
            commentIds.push(comment.id)
            if (comment.replies) {
              comment.replies.forEach((reply: any) => commentIds.push(reply.id))
            }
          })

          const { data: userVotes } = await supabase
            .from('votes')
            .select('content_id, vote_type')
            .eq('user_id', user.id)
            .eq('content_type', 'comment')
            .in('content_id', commentIds)

          const votesMap = new Map(userVotes?.map(v => [v.content_id, v.vote_type]) || [])
          
          comments = comments.map((comment: any) => ({
            ...comment,
            user_vote: votesMap.get(comment.id) || null,
            replies: comment.replies?.map((reply: any) => ({
              ...reply,
              user_vote: votesMap.get(reply.id) || null,
            })) || [],
          }))
        }
      }
    } catch (error) {
      console.error('PostDetailContent: Comments fetch exception', error);
    }

    // Get user's role in the community
    let currentUserRole: 'admin' | 'moderator' | 'member' | null = null
    if (user && post.community_id) {
      try {
        currentUserRole = await getUserCommunityRole(user.id, post.community_id)
      } catch (error) {
        console.error('PostDetailContent: Error fetching user role', error);
      }
    }

    // Count all comments including replies
    const countAllComments = (comments: any[]): number => {
      let total = 0
      comments.forEach(comment => {
        total += 1 // Count the comment itself
        if (comment.replies && comment.replies.length > 0) {
          total += countAllComments(comment.replies) // Recursively count replies
        }
      })
      return total
    }

    const totalCommentCount = countAllComments(comments)

    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* Post Card */}
        <PostCard post={post} showCommunity={true} variant="detail" />

        {/* Comments Section */}
        <div className="mt-8 space-y-6">
          <h2 className="text-xl font-semibold">
            Comments {totalCommentCount > 0 && `(${totalCommentCount})`}
          </h2>

          {/* Add Comment Form */}
          <Card className="p-4">
            <CommentForm postId={postId} />
          </Card>

          {/* Comment Thread */}
          <Suspense fallback={<div>Loading comments...</div>}>
            <CommentThread 
              comments={comments} 
              postId={postId} 
              currentUserRole={currentUserRole}
              communityId={post.community_id}
            />
          </Suspense>
        </div>
      </div>
    )
  } catch (error) {
    console.error('PostDetailContent: Unexpected error', error);
    notFound()
  }
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  // Destructure id from params (Next.js 15 async params)
  const { id } = await params
  
  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading post...</div>}>
        <PostDetailContent postId={id} />
      </Suspense>
    </ErrorBoundary>
  )
}

export async function generateMetadata({ params }: PostDetailPageProps) {
  // Destructure id from params (Next.js 14 synchronous params)
  const { id } = params
  
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('posts')
    .select('title, body')
    .eq('id', id)
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
