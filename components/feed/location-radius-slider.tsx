'use client'

import { useState, useMemo } from 'react'
import { MapPin, Loader2, Clock, TrendingUp, RefreshCw } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLocation } from '@/lib/context/location-context'
import { cn } from '@/lib/utils'

const RADIUS_OPTIONS = [5, 10, 25, 50, 100] as const

interface LocationRadiusSliderProps {
  currentSort?: 'recent' | 'popular'
  onSortChange?: (sort: 'recent' | 'popular') => void
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function LocationRadiusSlider({
  currentSort,
  onSortChange,
  onRefresh,
  isRefreshing = false,
}: LocationRadiusSliderProps) {
  const {
    userCity,
    userCoordinates,
    radius,
    setRadius,
    savedLocations,
    switchToLocation,
    requestLocation,
    isLoading,
    isLoadingSavedLocations,
  } = useLocation()

  const [isChangingLocation, setIsChangingLocation] = useState(false)

  // Combine current location (if set) with saved locations
  const allLocations = useMemo(() => {
    const locations: Array<{
      id: string
      name: string
      city: string
      isCurrent: boolean
      isPrimary?: boolean
      coordinates?: { lat: number; lng: number }
    }> = []

    // Add current location if set
    if (userCity && userCoordinates) {
      const currentLocationInSaved = savedLocations.find(
        (loc) => loc.location_city === userCity && loc.coordinates
      )

      if (!currentLocationInSaved) {
        locations.push({
          id: 'current',
          name: 'Current Location',
          city: userCity,
          isCurrent: true,
          coordinates: userCoordinates,
        })
      }
    }

    // Add saved locations
    savedLocations.forEach((loc) => {
      const isCurrent = loc.location_city === userCity && loc.coordinates
      locations.push({
        id: loc.id,
        name: loc.location_name,
        city: loc.location_city,
        isCurrent: !!isCurrent,
        isPrimary: loc.is_primary,
        coordinates: loc.coordinates,
      })
    })

    return locations
  }, [userCity, userCoordinates, savedLocations])

  // Find current location index
  const currentLocationIndex = useMemo(() => {
    return allLocations.findIndex((loc) => loc.isCurrent)
  }, [allLocations])

  // Handle location selection via slider
  const handleLocationChange = async (value: number[]) => {
    const index = value[0]
    if (index === undefined || index < 0 || index >= allLocations.length) return

    const selectedLocation = allLocations[index]
    if (!selectedLocation) return

    // If it's the current location, do nothing
    if (selectedLocation.isCurrent) return

    // If it's a saved location, switch to it
    if (selectedLocation.id !== 'current') {
      const savedLocation = savedLocations.find((loc) => loc.id === selectedLocation.id)
      if (savedLocation) {
        setIsChangingLocation(true)
        try {
          await switchToLocation(savedLocation)
        } finally {
          setIsChangingLocation(false)
        }
      }
    }
  }

  // Handle setting location if not set
  const handleSetLocation = async () => {
    setIsChangingLocation(true)
    try {
      await requestLocation()
    } finally {
      setIsChangingLocation(false)
    }
  }

  // Handle radius change
  const handleRadiusChange = (value: number[]) => {
    const newRadius = value[0]
    if (newRadius !== undefined && RADIUS_OPTIONS.includes(newRadius as (typeof RADIUS_OPTIONS)[number])) {
      setRadius(newRadius)
    }
  }

  // Loading state
  if (isLoadingSavedLocations) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // No location set state - show slider with placeholder
  const hasNoLocation = !userCity || allLocations.length === 0

  // Render sort controls section
  const renderSortControls = () => {
    if (!currentSort || !onSortChange) return null

    return (
      <div className="flex items-center gap-3 pt-4 border-t border-border/60">
        {/* Sort Options */}
        <div className="flex gap-2">
          <Button
            variant={currentSort === 'recent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSortChange('recent')}
            className="transition-all"
          >
            <Clock className="h-4 w-4" />
            Recent
          </Button>
          <Button
            variant={currentSort === 'popular' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSortChange('popular')}
            className="transition-all"
          >
            <TrendingUp className="h-4 w-4" />
            Popular
          </Button>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="ml-auto"
            aria-label="Refresh feed"
          >
            <RefreshCw className={cn('h-4 w-4 transition-transform', isRefreshing && 'animate-spin')} />
          </Button>
        )}
      </div>
    )
  }

  // Single location state (just current, no saved locations)
  if (allLocations.length === 1 && !hasNoLocation) {
    return (
      <div className="space-y-6">
        {/* Location Display */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className={cn(
                'rounded-lg p-2 bg-brand-primary/10 border border-brand-primary/20',
                'transition-all duration-200'
              )}>
                <MapPin className="h-5 w-5 text-brand-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-base text-foreground">{userCity}</span>
                  <Badge variant="secondary" className="text-xs font-medium">
                    {radius} km
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Showing posts from your local communities
                </p>
              </div>
            </div>
          </div>

          {/* Radius Slider */}
          <div className="space-y-3 pl-12">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Search Radius</span>
              <span className="text-xs font-semibold text-foreground">{radius} km</span>
            </div>
            <div className="px-1">
              <Slider
                value={[radius]}
                onValueChange={handleRadiusChange}
                min={5}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>5 km</span>
              <span>City-wide</span>
            </div>
          </div>
        </div>

        {/* Sort Controls */}
        {renderSortControls()}
      </div>
    )
  }

  // Main component with location slider (multiple locations or no location placeholder)
  return (
    <div className="space-y-6">
      {/* Location Section */}
      <div className="space-y-4">
        {/* Location Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MapPin
              className={cn(
                'h-5 w-5 transition-colors',
                hasNoLocation ? 'text-muted-foreground' : 'text-brand-primary'
              )}
            />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Location
            </span>
          </div>
          {hasNoLocation ? (
            <Button
              variant="default"
              size="sm"
              onClick={handleSetLocation}
              disabled={isLoading || isChangingLocation}
              className="font-medium shadow-sm hover:shadow transition-all"
            >
              {isChangingLocation || isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Setting...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4" />
                  Set Location
                </>
              )}
            </Button>
          ) : (
            allLocations[currentLocationIndex] && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {allLocations[currentLocationIndex].name}
                </span>
                <Badge variant="secondary" className="text-xs font-medium">
                  {allLocations[currentLocationIndex].city}
                </Badge>
              </div>
            )
          )}
        </div>

        {/* Location Slider with Markers */}
        <div className="relative space-y-3">
          {hasNoLocation ? (
            <>
              {/* Placeholder slider */}
              <Slider
                value={[0]}
                onValueChange={() => {}}
                min={0}
                max={1}
                step={1}
                className="w-full opacity-50"
                disabled={true}
              />
              {/* Set Location prompt */}
              <div className="relative -mt-2 flex justify-center px-2">
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="rounded-full p-2 bg-muted/50">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground text-center max-w-[160px] leading-relaxed">
                    Set your location to see posts from your local communities
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <Slider
                value={[currentLocationIndex >= 0 ? currentLocationIndex : 0]}
                onValueChange={handleLocationChange}
                min={0}
                max={allLocations.length - 1}
                step={1}
                className="w-full"
                disabled={isChangingLocation}
              />

              {/* Location Markers */}
              <div className="relative -mt-2 flex justify-between px-1">
                {allLocations.map((location, index) => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => handleLocationChange([index])}
                    disabled={isChangingLocation}
                    className={cn(
                      'relative flex flex-col items-center gap-2 transition-all duration-200',
                      'hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg px-1 py-1',
                      location.isCurrent ? 'opacity-100' : 'opacity-60 hover:opacity-80'
                    )}
                    title={`${location.name} - ${location.city}`}
                  >
                    <div className={cn(
                      'rounded-full p-1.5 transition-all',
                      location.isCurrent 
                        ? 'bg-brand-primary/10 border border-brand-primary/30'
                        : 'bg-muted/30 border border-transparent hover:bg-muted/50'
                    )}>
                      <MapPin
                        className={cn(
                          'h-4 w-4 transition-colors',
                          location.isCurrent
                            ? 'text-brand-primary fill-brand-primary'
                            : 'text-muted-foreground',
                          location.isPrimary && !location.isCurrent && 'text-primary'
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        'text-[10px] font-medium truncate max-w-[70px] transition-colors',
                        location.isCurrent ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {location.name}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Loading indicator */}
        {isChangingLocation && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground animate-fade-in">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Switching location...</span>
          </div>
        )}
      </div>

      {/* Radius Slider */}
      {!hasNoLocation && (
        <div className="space-y-3 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Search Radius
            </span>
            <Badge variant="secondary" className="text-xs font-medium">
              {radius} km
            </Badge>
          </div>
          <div className="px-1">
            <Slider
              value={[radius]}
              onValueChange={handleRadiusChange}
              min={5}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>5 km</span>
            <span>City-wide</span>
          </div>
        </div>
      )}

      {/* Sort Controls */}
      {renderSortControls()}
    </div>
  )
}

