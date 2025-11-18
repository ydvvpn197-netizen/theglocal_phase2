import { Suspense } from 'react'
import { DiscoveryFeed } from '@/components/feed/discovery-feed'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Newspaper, TrendingUp, Calendar } from 'lucide-react'

export default function DiscoverPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Discover</h1>
          <p className="mt-2 text-muted-foreground">
            Local news, trending topics, and events happening around you
          </p>
        </div>

        {/* Content Type Info */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Newspaper className="h-8 w-8 text-brand-primary" />
              <div>
                <div className="font-semibold">Local News</div>
                <div className="text-sm text-muted-foreground">Top stories from your area</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <TrendingUp className="h-8 w-8 text-brand-secondary" />
              <div>
                <div className="font-semibold">Reddit Trending</div>
                <div className="text-sm text-muted-foreground">Popular local subreddit posts</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Calendar className="h-8 w-8 text-brand-accent" />
              <div>
                <div className="font-semibold">Events</div>
                <div className="text-sm text-muted-foreground">Upcoming shows and happenings</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Discovery Feed */}
        <Suspense fallback={<DiscoveryFeedSkeleton />}>
          <DiscoveryFeed />
        </Suspense>
      </div>
    </div>
  )
}

function DiscoveryFeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="h-4 w-32 rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-6 w-3/4 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export const metadata = {
  title: 'Discover - Theglocal',
  description: 'Discover local news, trending topics, and events happening in your area',
}
