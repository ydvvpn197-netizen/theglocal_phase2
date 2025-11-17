'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LocationUpdateButton } from './location-update-button'
import { useAuth } from '@/lib/context/auth-context'
import { convertPostGISToCoordinates } from '@/lib/utils/location'
import { MapPin, Clock, AlertCircle } from 'lucide-react'

export function LocationSettings() {
  const { user, profile } = useAuth()
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    // Get last location update from localStorage
    const saved = localStorage.getItem('lastLocationUpdate')
    if (saved) {
      setLastUpdated(saved)
    }
  }, [])

  if (!user || !profile) {
    return null
  }

  const userCoords = profile.location_coordinates
    ? convertPostGISToCoordinates(profile.location_coordinates)
    : null

  const hasLocation = userCoords !== null
  const locationStatus = hasLocation ? 'active' : 'missing'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Location Status */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Current Location</span>
              <Badge variant={locationStatus === 'active' ? 'default' : 'secondary'}>
                {locationStatus === 'active' ? 'Set' : 'Not Set'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {profile.location_city || 'No location set'}
            </p>
          </div>
        </div>

        {/* Location Update Button */}
        <div className="space-y-2">
          <LocationUpdateButton className="w-full" />
          <p className="text-xs text-muted-foreground">
            Allow location access to see distance to artists
          </p>
        </div>

        {/* Last Updated Info */}
        {lastUpdated && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Last updated: {new Date(lastUpdated).toLocaleString()}</span>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-medium">Privacy</p>
            <p className="text-xs text-muted-foreground">
              Your location is only used to calculate distances to artists. It's stored securely and
              not shared with other users.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
