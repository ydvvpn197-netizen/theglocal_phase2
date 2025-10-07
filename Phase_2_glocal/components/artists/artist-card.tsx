'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Star, Calendar } from 'lucide-react'

interface Artist {
  id: string
  user_id: string
  stage_name: string
  service_category: string
  description: string | null
  location_city: string
  rate_min: number | null
  rate_max: number | null
  portfolio_images: string[] | null
  profile_views: number
  subscription_status: string
  created_at: string
}

interface ArtistCardProps {
  artist: Artist
}

export function ArtistCard({ artist }: ArtistCardProps) {
  const portfolioImage = artist.portfolio_images?.[0] || '/placeholder-artist.jpg'
  const rateRange =
    artist.rate_min && artist.rate_max
      ? `₹${artist.rate_min.toLocaleString()} - ₹${artist.rate_max.toLocaleString()}`
      : 'Contact for pricing'

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Portfolio Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Image src={portfolioImage} alt={artist.stage_name} fill className="object-cover" />

        {/* Category Badge */}
        <div className="absolute left-3 top-3">
          <Badge className="bg-black/70 text-white capitalize">
            {artist.service_category.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      <CardContent className="space-y-3 p-4">
        {/* Artist Name */}
        <div>
          <h3 className="font-semibold text-lg">{artist.stage_name}</h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{artist.location_city}</span>
          </div>
        </div>

        {/* Description */}
        {artist.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{artist.description}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4" />
            <span>New</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{artist.profile_views} views</span>
          </div>
        </div>

        {/* Rate */}
        <div className="font-semibold text-brand-primary">{rateRange}</div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="default" size="sm" asChild className="flex-1">
            <Link href={`/artists/${artist.id}`}>View Profile</Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="flex-1">
            <Link href={`/bookings/create?artist=${artist.id}`}>Book Now</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
