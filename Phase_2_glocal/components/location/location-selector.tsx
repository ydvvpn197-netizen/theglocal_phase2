'use client'

import { useState } from 'react'
import { MapPin, ChevronDown, Plus, Settings, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLocation } from '@/lib/context/location-context'
interface LocationSelectorProps {
  onManageLocationsClick?: () => void
  onSaveCurrentClick?: () => void
  className?: string
}

/**
 * Location Selector Component
 *
 * Dropdown for quick location switching
 * Shows current location, saved locations, and actions
 */
export function LocationSelector({
  onManageLocationsClick,
  onSaveCurrentClick,
  className = '',
}: LocationSelectorProps) {
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

  const handleChangeLocation = async () => {
    setIsChangingLocation(true)
    try {
      await requestLocation()
    } finally {
      setIsChangingLocation(false)
    }
  }

  const handleSwitchToSaved = (location: (typeof savedLocations)[0]) => {
    switchToLocation(location)
  }

  const radiusOptions = [
    { value: 5, label: '5 km' },
    { value: 10, label: '10 km' },
    { value: 25, label: '25 km' },
    { value: 50, label: '50 km' },
    { value: 100, label: '100 km' },
  ]

  const currentLocationDisplay = userCity || 'Location not set'
  const hasCoordinates = !!userCoordinates

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 ${className}`}
          disabled={isLoading || isLoadingSavedLocations}
        >
          {isLoading || isLoadingSavedLocations ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
          <span className="max-w-[120px] truncate">{currentLocationDisplay}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[280px]">
        {/* Current Location */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Current Location</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{currentLocationDisplay}</span>
            </div>
            {hasCoordinates && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Radius: {radius} km</span>
              </div>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Change Location Actions */}
        <DropdownMenuItem onClick={handleChangeLocation} disabled={isChangingLocation}>
          <MapPin className="mr-2 h-4 w-4" />
          {isChangingLocation ? 'Detecting...' : 'Update Location'}
        </DropdownMenuItem>

        {onSaveCurrentClick && hasCoordinates && (
          <DropdownMenuItem onClick={onSaveCurrentClick}>
            <Plus className="mr-2 h-4 w-4" />
            Save Current Location
          </DropdownMenuItem>
        )}

        {/* Saved Locations */}
        {savedLocations.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
              Saved Locations
            </DropdownMenuLabel>

            {savedLocations.map((location) => (
              <DropdownMenuItem
                key={location.id}
                onClick={() => handleSwitchToSaved(location)}
                className="flex items-start gap-2"
              >
                <MapPin className={`h-4 w-4 mt-0.5 ${location.is_primary ? 'text-primary' : ''}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{location.location_name}</span>
                    {location.is_primary && <span className="text-xs text-primary">★</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{location.location_city}</p>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Radius Selection */}
        {hasCoordinates && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
              Search Radius
            </DropdownMenuLabel>

            {radiusOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setRadius(option.value)}
                className="justify-between"
              >
                <span>{option.label}</span>
                {radius === option.value && <span className="text-primary">✓</span>}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Manage Locations */}
        {onManageLocationsClick && savedLocations.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onManageLocationsClick}>
              <Settings className="mr-2 h-4 w-4" />
              Manage Saved Locations
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
