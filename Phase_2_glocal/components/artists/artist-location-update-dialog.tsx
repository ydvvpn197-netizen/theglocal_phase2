'use client'

import { logger } from '@/lib/utils/logger'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/lib/hooks/use-toast'
import { Loader2, MapPin } from 'lucide-react'
import { searchCities } from '@/lib/data/indian-cities'
import { getCurrentLocation } from '@/lib/utils/location'
import { Coordinates } from '@/lib/utils/location'
import { useMemo } from 'react'

const locationUpdateSchema = z
  .object({
    location_city: z.string().max(100, 'City name must be 100 characters or less').optional(),
    location_coordinates: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      })
      .optional(),
  })
  .refine(
    (data) => {
      // Either location_city or location_coordinates must be provided
      const hasCity = data.location_city && data.location_city.trim().length > 0
      const hasCoordinates = data.location_coordinates !== undefined

      return hasCity || hasCoordinates
    },
    {
      message: 'Either city or current location must be provided',
      path: ['location_city'],
    }
  )

type LocationUpdateData = z.infer<typeof locationUpdateSchema>

interface ArtistLocationUpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  artistId: string
  currentCity?: string
}

export function ArtistLocationUpdateDialog({
  open,
  onOpenChange,
  artistId,
  currentCity,
}: ArtistLocationUpdateDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // Location toggle state
  const [useCurrentLocation, setUseCurrentLocation] = useState(false)
  const [locationCoordinates, setLocationCoordinates] = useState<Coordinates | null>(null)
  const [isFetchingLocation, setIsFetchingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  const {
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
    clearErrors,
    reset,
  } = useForm<LocationUpdateData>({
    resolver: zodResolver(locationUpdateSchema),
    defaultValues: {
      location_city: currentCity || '',
    },
  })

  const locationCityValue = watch('location_city')
  const locationCoordinatesValue = watch('location_coordinates')

  // Determine if form is valid for submission
  const isFormValid = useMemo(() => {
    if (useCurrentLocation) {
      // When using current location, coordinates must be available
      return locationCoordinatesValue !== undefined && locationCoordinatesValue !== null
    } else {
      // When using manual city entry, city must be provided
      return locationCityValue && locationCityValue.trim().length > 0
    }
  }, [useCurrentLocation, locationCoordinatesValue, locationCityValue])

  // Compute city options
  const cityOptions = useMemo(() => {
    try {
      const searchQuery = locationCityValue || ''
      const cities = searchCities(searchQuery, 20)
      const options = cities.map((city) => ({
        value: city.name,
        label: `${city.name}, ${city.state}`,
      }))

      if (searchQuery && searchQuery.trim() && !options.some((opt) => opt.value === searchQuery)) {
        options.unshift({
          value: searchQuery,
          label: searchQuery,
        })
      }

      return options.length > 0 ? options : [{ value: '', label: 'Select city...' }]
    } catch (error) {
      logger.error('Error computing city options:', error)
      return [{ value: '', label: 'Select city...' }]
    }
  }, [locationCityValue])

  // Handle location toggle
  const handleLocationToggle = (checked: boolean) => {
    setUseCurrentLocation(checked)
    if (!checked) {
      setLocationCoordinates(null)
      setLocationError(null)
      setValue('location_city', '')
      setValue('location_coordinates', undefined)
      clearErrors('location_city')
      clearErrors('location_coordinates')
    } else {
      setValue('location_city', '')
      setValue('location_coordinates', undefined)
      clearErrors('location_city')
      clearErrors('location_coordinates')
    }
  }

  // Handle get current location
  const handleGetCurrentLocation = async () => {
    setIsFetchingLocation(true)
    setLocationError(null)

    try {
      const coords = await getCurrentLocation()

      if (!coords) {
        setLocationError('Unable to get your location. Please check your browser permissions.')
        setIsFetchingLocation(false)
        return
      }

      // Set coordinates in both component state and form data
      setLocationCoordinates(coords)
      setValue('location_coordinates', coords)
      setValue('location_city', '')
      setLocationError(null)
      clearErrors('location_city')
      clearErrors('location_coordinates')

      toast({
        title: 'Location detected',
        description: `Coordinates: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`,
      })
    } catch (error) {
      logger.error('Error getting location:', error)
      setLocationError('Failed to get your location. Please try again.')
      setValue('location_coordinates', undefined)
    } finally {
      setIsFetchingLocation(false)
    }
  }

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset({
        location_city: currentCity || '',
        location_coordinates: undefined,
      })
      setUseCurrentLocation(false)
      setLocationCoordinates(null)
      setLocationError(null)
    }
    onOpenChange(newOpen)
  }

  const onSubmit = async (data: LocationUpdateData) => {
    setIsLoading(true)

    try {
      // Prepare request body
      interface LocationUpdateRequestBody {
        location_coordinates?: string
        location_city?: string
      }
      const requestBody: LocationUpdateRequestBody = {}

      // If using current location, send coordinates from form data
      if (useCurrentLocation && data.location_coordinates) {
        requestBody.location_coordinates = `POINT(${data.location_coordinates.longitude} ${data.location_coordinates.latitude})`
        requestBody.location_city = ''
      } else if (data.location_city && data.location_city.trim()) {
        // Manual city entry - clear coordinates if any
        requestBody.location_city = data.location_city.trim()
        // Clear coordinates when using manual city entry
        setValue('location_coordinates', undefined)
      } else {
        // This shouldn't happen due to validation, but handle it gracefully
        throw new Error('Either city or current location must be provided')
      }

      const response = await fetch(`/api/artists/${artistId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      let result
      try {
        result = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to update location')
      }

      toast({
        title: 'Location updated',
        description: 'Your location has been updated successfully.',
      })

      // Close dialog
      handleOpenChange(false)

      // Refresh the page to show updated location
      router.refresh()
    } catch (error) {
      logger.error('Location update error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update location',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Location</DialogTitle>
          <DialogDescription>
            Update your location to help nearby users find you easily.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="location_city" className="text-sm font-medium">
                City
              </label>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="use-current-location"
                  className="text-xs text-muted-foreground cursor-pointer"
                >
                  Use Current Location
                </label>
                <Switch
                  id="use-current-location"
                  checked={useCurrentLocation}
                  onCheckedChange={handleLocationToggle}
                />
              </div>
            </div>

            {!useCurrentLocation ? (
              <>
                <Controller
                  name="location_city"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      options={cityOptions || []}
                      value={field.value || ''}
                      onValueChange={(value) => {
                        field.onChange(value || '')
                        // Clear coordinates when manually selecting a city
                        setValue('location_coordinates', undefined)
                        clearErrors('location_coordinates')
                      }}
                      placeholder="Search your city..."
                      searchPlaceholder="Search cities..."
                      emptyMessage="No cities found. Try a different search."
                      aria-describedby={errors.location_city ? 'location_city_error' : undefined}
                    />
                  )}
                />
                {errors.location_city && (
                  <p
                    id="location_city_error"
                    className="mt-1 text-sm text-destructive"
                    role="alert"
                  >
                    {errors.location_city.message}
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGetCurrentLocation}
                  disabled={isFetchingLocation || isLoading}
                  className="w-full"
                >
                  {isFetchingLocation ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Getting location...
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-2 h-4 w-4" />
                      Get Current Location
                    </>
                  )}
                </Button>

                {locationError && (
                  <p className="text-sm text-destructive" role="alert">
                    {locationError}
                  </p>
                )}

                {locationCoordinates && !locationError && (
                  <p className="text-sm text-muted-foreground">
                    Location detected: {locationCoordinates.latitude.toFixed(6)},{' '}
                    {locationCoordinates.longitude.toFixed(6)}
                  </p>
                )}

                {!locationCoordinates && !isFetchingLocation && !locationError && (
                  <p className="text-sm text-muted-foreground">
                    Click the button above to get your current location
                  </p>
                )}
                {errors.location_coordinates && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.location_coordinates.message}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !isFormValid}
              title={
                !isFormValid
                  ? useCurrentLocation
                    ? 'Please get your current location first'
                    : 'Please select a city'
                  : 'Update location'
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Location'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
