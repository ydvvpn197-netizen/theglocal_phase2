'use client'

import { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PostFeed } from '@/components/posts/post-feed'
import { CreatePostForm } from '@/components/posts/create-post-form'
import { PollFeed } from '@/components/polls/poll-feed'
import { CreatePollForm } from '@/components/polls/create-poll-form'
import { CommunityMembersList } from './community-members-list'
import { CommunitySidebar } from './community-sidebar'
import { CommunitySettings } from './community-settings'
import { CommunityAnalytics } from './community-analytics'
import { MessageSquare, Users, Info, Settings, BarChart3, BarChart } from 'lucide-react'

interface Community {
  id: string
  name: string
  slug: string
  description: string | null
  rules: string | null
  location_city: string
  member_count: number
  post_count: number
  is_private: boolean
  created_by: string
  created_at: string
  category?: string
  tags?: string[]
}

interface CommunityContentProps {
  community: Community
  isMember: boolean
  isAdmin: boolean
  currentUserRole?: 'admin' | 'moderator' | 'member' | null
  communityCreatorId?: string
  activeTab?: string
}

export function CommunityContent({
  community,
  isMember,
  isAdmin,
  currentUserRole: _currentUserRole = null,
  communityCreatorId: _communityCreatorId,
  activeTab: initialTab,
}: CommunityContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(initialTab || 'posts')
  const postFeedRefetchRef = useRef<(() => void) | null>(null)

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.push(`/communities/${community.slug}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full grid grid-cols-4 lg:grid-cols-6">
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Posts</span>
            </TabsTrigger>
            <TabsTrigger value="polls" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              <span className="hidden sm:inline">Polls</span>
            </TabsTrigger>
            <TabsTrigger value="about" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">About</span>
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="members" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Members</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts" className="mt-6 space-y-6">
            {isMember && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Share with this community</CardTitle>
                </CardHeader>
                <CardContent>
                  <CreatePostForm
                    communityId={community.id}
                    onSuccess={() => {
                      // Refresh feed after post creation using refetch
                      if (postFeedRefetchRef.current) {
                        postFeedRefetchRef.current()
                      }
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {!isMember && (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <p>Join this community to create posts and participate in discussions</p>
                </CardContent>
              </Card>
            )}

            <PostFeed communityId={community.id} />
          </TabsContent>

          {/* Polls Tab */}
          <TabsContent value="polls" className="mt-6 space-y-6">
            {isMember && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Create a Poll</CardTitle>
                </CardHeader>
                <CardContent>
                  <CreatePollForm communityId={community.id} />
                </CardContent>
              </Card>
            )}

            {!isMember && (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <p>Join this community to create polls and participate in voting</p>
                </CardContent>
              </Card>
            )}

            <PollFeed communityId={community.id} />
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About {community.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {community.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {community.description}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Location</h3>
                  <p className="text-muted-foreground">{community.location_city}</p>
                </div>

                {community.category && (
                  <div>
                    <h3 className="font-semibold mb-2">Category</h3>
                    <p className="text-muted-foreground capitalize">{community.category}</p>
                  </div>
                )}

                {community.tags && community.tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {community.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Stats</h3>
                  <div className="grid grid-cols-2 gap-4 text-muted-foreground">
                    <div>
                      <p className="text-sm">Members</p>
                      <p className="text-2xl font-bold text-foreground">
                        {community.member_count.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm">Posts</p>
                      <p className="text-2xl font-bold text-foreground">
                        {community.post_count.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Created</h3>
                  <p className="text-muted-foreground">
                    {new Date(community.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab (Admin Only) */}
          {isAdmin && (
            <TabsContent value="analytics" className="mt-6">
              <CommunityAnalytics slug={community.slug} />
            </TabsContent>
          )}

          {/* Members Tab (Admin Only) */}
          {isAdmin && (
            <TabsContent value="members" className="mt-6">
              <CommunityMembersList communityId={community.id} />
            </TabsContent>
          )}

          {/* Settings Tab (Admin Only) */}
          {isAdmin && (
            <TabsContent value="settings" className="mt-6">
              <CommunitySettings community={community} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Sidebar */}
      <div className="lg:col-span-1">
        <CommunitySidebar community={community} isMember={isMember} isAdmin={isAdmin} />
      </div>
    </div>
  )
}
