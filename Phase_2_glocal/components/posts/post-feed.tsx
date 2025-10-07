'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PostCard } from './post-card'
import { Loader2 } from 'lucide-react'

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

interface PostFeedProps {
  communityId?: string
  initialPosts?: Post[]
  useFeedApi?: boolean
  sort?: 'recent' | 'popular'
  city?: string | null
  radius?: number
}

export function PostFeed({
  communityId,
  initialPosts = [],
  useFeedApi = false,
  sort = 'recent',
  city,
  radius,
}: PostFeedProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const fetchPosts = useCallback(
    async (offset: number = 0) => {
      if (isLoading || (!hasMore && offset > 0)) return

      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          limit: '20',
          offset: offset.toString(),
        })

        // Use feed API or posts API
        let endpoint = '/api/posts'

        if (useFeedApi) {
          endpoint = '/api/feed'
          if (sort) params.append('sort', sort)
          if (city) params.append('city', city)
          if (radius) params.append('radius', radius.toString())
        } else if (communityId) {
          params.append('community_id', communityId)
        }

        const response = await fetch(`${endpoint}?${params}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch posts')
        }

        const newPosts = result.data || []

        if (offset === 0) {
          setPosts(newPosts)
        } else {
          setPosts((prev) => [...prev, ...newPosts])
        }

        // If we got fewer posts than requested, we've reached the end
        setHasMore(newPosts.length === 20)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load posts')
      } finally {
        setIsLoading(false)
      }
    },
    [communityId, useFeedApi, sort, city, radius, isLoading, hasMore]
  )

  const handlePostUpdate = useCallback(() => {
    // Refresh the feed after a post is updated/deleted
    fetchPosts(0)
  }, [fetchPosts])

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry && entry.isIntersecting && hasMore && !isLoading) {
          fetchPosts(posts.length)
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before reaching the bottom
      }
    )

    observerRef.current.observe(loadMoreRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [fetchPosts, posts.length, hasMore, isLoading])

  // Initial load if no initial posts provided
  useEffect(() => {
    if (initialPosts.length === 0) {
      fetchPosts(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error && posts.length === 0) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
        <p className="text-destructive">{error}</p>
        <button
          onClick={() => fetchPosts(0)}
          className="mt-4 text-sm text-destructive underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (posts.length === 0 && !isLoading) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <p className="text-lg">No posts yet</p>
        <p className="mt-2 text-sm">Be the first to share something with your community!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onUpdate={handlePostUpdate} />
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error message for pagination errors */}
      {error && posts.length > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Intersection observer target */}
      {hasMore && !isLoading && <div ref={loadMoreRef} className="h-4" />}

      {/* End of feed message */}
      {!hasMore && posts.length > 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          You&apos;ve reached the end!
        </div>
      )}
    </div>
  )
}
