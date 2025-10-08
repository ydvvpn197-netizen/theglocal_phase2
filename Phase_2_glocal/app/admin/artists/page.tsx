'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle, DollarSign, Eye } from 'lucide-react'
import Link from 'next/link'

interface Artist {
  id: string
  user_id: string
  stage_name: string
  service_category: string
  location_city: string
  subscription_status: string
  subscription_start_date?: string
  subscription_end_date?: string
  subscription_cancelled_at?: string
  pricing_starting_from?: number
  created_at: string
}

export default function AdminArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchArtists()
  }, [statusFilter])

  const fetchArtists = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await fetch(`/api/admin/artists?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch artists')
      }

      setArtists(result.data || [])
    } catch (error) {
      console.error('Error fetching artists:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>
      case 'trial':
        return <Badge variant="secondary">Trial</Badge>
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Artist Management</h1>
          <p className="mt-2 text-muted-foreground">Manage artist profiles and subscriptions</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              {['all', 'trial', 'active', 'expired', 'cancelled'].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Artists List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : artists.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No artists found
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {artists.map((artist) => (
              <Card key={artist.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{artist.stage_name}</h3>
                        {getStatusBadge(artist.subscription_status)}
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {artist.service_category.replace('_', ' ')} • {artist.location_city}
                      </p>

                      {artist.pricing_starting_from && (
                        <p className="text-sm">
                          Starting from: ₹{artist.pricing_starting_from.toLocaleString()}
                        </p>
                      )}

                      {artist.subscription_start_date && (
                        <div className="text-xs text-muted-foreground space-y-1 mt-2">
                          <p>Start: {new Date(artist.subscription_start_date).toLocaleDateString()}</p>
                          {artist.subscription_end_date && (
                            <p>
                              End: {new Date(artist.subscription_end_date).toLocaleDateString()}
                            </p>
                          )}
                          {artist.subscription_cancelled_at && (
                            <p className="text-destructive">
                              Cancelled: {new Date(artist.subscription_cancelled_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/artists/${artist.id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="mr-2 h-4 w-4" />
                          View Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
