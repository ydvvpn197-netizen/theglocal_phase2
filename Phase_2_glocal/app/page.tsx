import { PostFeed } from '@/components/posts/post-feed'
import { CreatePostForm } from '@/components/posts/create-post-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-6">
        {/* Create Post Section */}
        <Card>
          <CardHeader>
            <CardTitle>Share with your community</CardTitle>
          </CardHeader>
          <CardContent>
            <CreatePostForm />
          </CardContent>
        </Card>

        {/* Post Feed */}
        <PostFeed />
      </div>
    </div>
  )
}
