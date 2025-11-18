import { CommunityHeader } from '@/components/communities/community-header'
import { PostFeed } from '@/components/posts/post-feed'
import { CreatePostForm } from '@/components/posts/create-post-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

interface CommunityPageProps {
  params: { slug: string }
}

export default async function CommunityPage({ params }: CommunityPageProps) {
  const supabase = await createClient()

  // Fetch community to get ID
  const { data: community } = await supabase
    .from('communities')
    .select('id')
    .eq('slug', params.slug)
    .single()

  return (
    <div className="container max-w-6xl py-6">
      <CommunityHeader slug={params.slug} />

      <div className="mt-8 space-y-6">
        {/* Create Post Section */}
        {community && (
          <Card>
            <CardHeader>
              <CardTitle>Share with this community</CardTitle>
            </CardHeader>
            <CardContent>
              <CreatePostForm communityId={community.id} />
            </CardContent>
          </Card>
        )}

        {/* Community Posts Feed */}
        {community && <PostFeed communityId={community.id} />}

        {!community && (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground">Community not found</p>
          </div>
        )}
      </div>
    </div>
  )
}
