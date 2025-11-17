'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PostCard } from '@/components/posts/post-card'
import { CommunityCard } from '@/components/communities/community-card'
// Post and Community types are defined locally in their respective component files
// We'll use type assertions for now since the API returns compatible data
type Post = {
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

type Community = {
  id: string
  name: string
  slug: string
  description: string | null
  location_city: string
  member_count: number
  post_count: number
  is_private: boolean
  is_featured: boolean
  created_at: string
}
import { Loader2, MessageSquare } from 'lucide-react'
import Link from 'next/link'

interface Activity {
  type: 'post' | 'comment'
  id: string
  content: Record<string, unknown>
  created_at: string
}

interface ProfileActivityProps {
  userId: string
  isOwnProfile?: boolean
  bookings?: Array<Record<string, unknown>>
  artistInfo?: Record<string, unknown>
}

export function ProfileActivity({
  userId,
  isOwnProfile = false,
  bookings,
  artistInfo,
}: ProfileActivityProps) {
  const [activeTab, setActiveTab] = useState('posts')
  const [activities, setActivities] = useState<Activity[]>([])
  const [communities, setCommunities] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const loadActivity = async (type: string, reset: boolean = false) => {
    setLoading(true)
    const currentOffset = reset ? 0 : offset

    try {
      const response = await fetch(
        `/api/profile/activity?user_id=${userId}&type=${type}&limit=20&offset=${currentOffset}`
      )
      const data = await response.json()

      if (data.success) {
        if (reset) {
          setActivities(data.data)
        } else {
          setActivities((prev) => [...prev, ...data.data])
        }
        setHasMore(data.hasMore)
        setOffset(currentOffset + data.data.length)
      }
    } catch (error) {
      logger.error('Failed to load activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCommunities = async () => {
    setLoading(true)
    try {
      // Fetch communities user is a member of
      const response = await fetch(`/api/communities?user_id=${userId}`)
      const data = await response.json()

      if (data.success) {
        setCommunities(data.data)
      }
    } catch (error) {
      logger.error('Failed to load communities:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'posts' || activeTab === 'comments') {
      loadActivity(activeTab, true)
    } else if (activeTab === 'communities') {
      loadCommunities()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userId])

  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="communities">Communities</TabsTrigger>
            {isOwnProfile && bookings && <TabsTrigger value="bookings">Bookings</TabsTrigger>}
            {artistInfo && <TabsTrigger value="artist">Freelancer/Creator</TabsTrigger>}
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-4 mt-4">
            {loading && activities.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No posts yet</p>
            ) : (
              <>
                {activities
                  .filter((a) => a.type === 'post')
                  .map((activity) => (
                    <PostCard key={activity.id} post={activity.content as unknown as Post} />
                  ))}
                {hasMore && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => loadActivity('posts')}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Load More'}
                  </Button>
                )}
              </>
            )}
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="space-y-4 mt-4">
            {loading && activities.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No comments yet</p>
            ) : (
              <>
                {activities
                  .filter((a) => a.type === 'comment')
                  .map((activity) => (
                    <CommentActivityCard
                      key={activity.id}
                      comment={activity.content as unknown as CommentActivity}
                    />
                  ))}
                {hasMore && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => loadActivity('comments')}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Load More'}
                  </Button>
                )}
              </>
            )}
          </TabsContent>

          {/* Communities Tab */}
          <TabsContent value="communities" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : communities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No communities joined</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {communities.map((community) => (
                  <CommunityCard
                    key={String(community.id)}
                    community={community as unknown as Community}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Bookings Tab (Own Profile Only) */}
          {isOwnProfile && bookings && (
            <TabsContent value="bookings" className="space-y-4 mt-4">
              {bookings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No bookings yet</p>
              ) : (
                bookings.map((booking) => (
                  <BookingActivityCard
                    key={String(booking.id)}
                    booking={booking as unknown as BookingActivity}
                  />
                ))
              )}
            </TabsContent>
          )}

          {/* Freelancer/Creator Tab */}
          {artistInfo && (
            <TabsContent value="artist" className="mt-4">
              <ArtistInfoCard artist={artistInfo} />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Comment Activity Card Component
interface CommentActivity {
  created_at: string
  body: string
  upvotes: number
  downvotes: number
  post: {
    id: string
    title: string
    community?: {
      slug: string
    } | null
  }
}

function CommentActivityCard({ comment }: { comment: CommentActivity }) {
  const timeAgo = getTimeAgo(comment.created_at)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>Commented on</span>
            <Link
              href={`/posts/${comment.post.id}`}
              className="font-medium text-foreground hover:text-primary"
            >
              {comment.post.title}
            </Link>
            <span>•</span>
            <span>{timeAgo}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{comment.upvotes - comment.downvotes} points</span>
            {comment.post.community && (
              <>
                <span>•</span>
                <Link
                  href={`/communities/${comment.post.community.slug}`}
                  className="hover:text-foreground"
                >
                  c/{comment.post.community.slug}
                </Link>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Booking Activity Card Component
interface BookingActivity {
  id: string
  status: string
  event_date: string
  artist?: {
    stage_name?: string
    service_category?: string
  } | null
}

function BookingActivityCard({ booking }: { booking: BookingActivity }) {
  const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'secondary',
    accepted: 'default',
    declined: 'destructive',
    info_requested: 'outline',
    completed: 'outline',
  }

  const variant = statusColors[booking.status] || 'outline'

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <Link href={`/bookings/${booking.id}`}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {booking.artist?.stage_name || 'Unknown Freelancer/Creator'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {booking.artist?.service_category?.replace('_', ' ') || 'Unknown'}
                </p>
              </div>
              <Badge variant={variant}>{booking.status.replace('_', ' ')}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Event Date: {new Date(booking.event_date).toLocaleDateString()}
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  )
}

// Freelancer/Creator Info Card Component
interface ArtistInfo {
  stage_name?: string
  service_category?: string
  bio?: string
  [key: string]: unknown
}

function ArtistInfoCard({ artist }: { artist: ArtistInfo }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Stage Name</h3>
              <p>{artist.stage_name}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Category</h3>
              <Badge className="capitalize">
                {artist.service_category?.replace('_', ' ') || 'Unknown'}
              </Badge>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Subscription Status</h3>
              <Badge variant={artist.subscription_status === 'active' ? 'default' : 'secondary'}>
                {String(artist.subscription_status || '')}
              </Badge>
            </div>
            <Button asChild className="w-full">
              <Link href={`/artists/${artist.id}`}>View Full Freelancer/Creator Profile</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
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
