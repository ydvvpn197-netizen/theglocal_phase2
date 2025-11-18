'use client'

import { useState } from 'react'
import { ArtistList } from '@/components/artists/artist-list'
import { ArtistFilters } from '@/components/artists/artist-filters'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Palette, Star, Calendar } from 'lucide-react'
import Link from 'next/link'

export default function ArtistsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('all')

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
        <ArtistFilters onSearchChange={setSearchQuery} onCategoryChange={setCategory} />

        {/* Artist List */}
        <ArtistList searchQuery={searchQuery} category={category} />
      </div>
    </div>
  )
}
