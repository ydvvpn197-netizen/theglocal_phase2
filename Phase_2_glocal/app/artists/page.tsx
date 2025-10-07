import { Suspense } from 'react'
import { ArtistList } from '@/components/artists/artist-list'
import { ArtistFilters } from '@/components/artists/artist-filters'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Palette, Star, Calendar } from 'lucide-react'
import Link from 'next/link'

export default function ArtistsPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Local Artists</h1>
            <p className="mt-2 text-muted-foreground">
              Discover talented artists and service providers in your community
            </p>
          </div>

          <Button asChild>
            <Link href="/artists/register">
              <Palette className="mr-2 h-4 w-4" />
              Register as Artist
            </Link>
          </Button>
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Palette className="h-8 w-8 text-brand-primary" />
              <div>
                <div className="font-semibold">10+ Categories</div>
                <div className="text-sm text-muted-foreground">
                  Musicians, DJs, photographers & more
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Star className="h-8 w-8 text-brand-secondary" />
              <div>
                <div className="font-semibold">Verified Artists</div>
                <div className="text-sm text-muted-foreground">Active subscriptions only</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Calendar className="h-8 w-8 text-brand-accent" />
              <div>
                <div className="font-semibold">Direct Booking</div>
                <div className="text-sm text-muted-foreground">Message and book instantly</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <ArtistFilters />

        {/* Artist List */}
        <Suspense fallback={<ArtistListSkeleton />}>
          <ArtistList />
        </Suspense>
      </div>
    </div>
  )
}

function ArtistListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="animate-pulse">
          <div className="aspect-square bg-muted" />
          <CardContent className="space-y-3 pt-4">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export const metadata = {
  title: 'Artists - Theglocal',
  description: 'Discover and book local artists and service providers',
}
