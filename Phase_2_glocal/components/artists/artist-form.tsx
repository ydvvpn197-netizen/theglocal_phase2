'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createArtistSchema } from '@/lib/utils/validation'
import { ARTIST_CATEGORIES } from '@/lib/utils/constants'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { useToast } from '@/lib/hooks/use-toast'
import { useAuth } from '@/lib/context/auth-context'
import { Loader2, Paperclip, MapPin } from 'lucide-react'
import { SERVICE_CATEGORIES, parseServiceCategory } from '@/lib/data/service-categories'
import { searchCities } from '@/lib/data/indian-cities'
import { MediaUploadGallery, useFileUpload } from '@/components/posts/media-upload-gallery'
import { MediaUploadResult } from '@/lib/types/api.types'
import { Switch } from '@/components/ui/switch'
import { getCurrentLocation } from '@/lib/utils/location'
import { Coordinates } from '@/lib/utils/location'

type ArtistFormData = z.infer<typeof createArtistSchema>

interface Artist {
  id: string
  stage_name: string
  service_category: string
  description?: string
  location_city: string
  rate_min?: number
  rate_max?: number
  portfolio_images?: string[]
  genres?: string[]
  social_links?: Record<string, string>
}

interface ArtistFormProps {
  mode: 'create' | 'edit'
  artist?: Artist
  onSuccess?: (artistId: string) => void
}

// Using MediaUploadResult from the working upload system

export function ArtistForm({ mode, artist, onSuccess }: ArtistFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [portfolioImages, setPortfolioImages] = useState<MediaUploadResult[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Location toggle state
  const [useCurrentLocation, setUseCurrentLocation] = useState(false)
  const [locationCoordinates, setLocationCoordinates] = useState<Coordinates | null>(null)
  const [isFetchingLocation, setIsFetchingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Parse initial category/subcategory
  const initialCategory = artist?.service_category
    ? parseServiceCategory(artist.service_category)
    : { category: '' }
  const [selectedCategory, setSelectedCategory] = useState(initialCategory.category)
  const [selectedSubcategory, setSelectedSubcategory] = useState(initialCategory.subcategory || '')

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
    clearErrors,
  } = useForm<ArtistFormData>({
    resolver: zodResolver(createArtistSchema),
    defaultValues: {
      stage_name: artist?.stage_name || '',
      description: artist?.description || '',
      service_category:
        artist?.service_category &&
        ARTIST_CATEGORIES.includes(artist.service_category as (typeof ARTIST_CATEGORIES)[number])
          ? (artist.service_category as (typeof ARTIST_CATEGORIES)[number])
          : undefined,
      location_city: artist?.location_city || '',
      rate_min: artist?.rate_min || undefined,
      rate_max: artist?.rate_max || undefined,
    },
  })

  // Watch form fields for character count
  const stageNameValue = watch('stage_name')
  const descriptionValue = watch('description')
  const locationCityValue = watch('location_city')

  // Handle location toggle
  const handleLocationToggle = (checked: boolean) => {
    setUseCurrentLocation(checked)
    if (!checked) {
      // Clear coordinates when switching back to manual mode
      setLocationCoordinates(null)
      setLocationError(null)
      // Clear city field
      setValue('location_city', '')
    } else {
      // Clear city field when switching to current location mode
      setValue('location_city', '')
      clearErrors('location_city')
    }
  }

  // Handle get current location button click
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

      // Store coordinates as-is (no rounding for accuracy)
      setLocationCoordinates(coords)
      setLocationError(null)

      toast({
        title: 'Location detected',
        description: `Coordinates: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`,
      })
    } catch (error) {
      logger.error('Error getting location:', error)
      setLocationError('Failed to get your location. Please try again.')
    } finally {
      setIsFetchingLocation(false)
    }
  }

  // Safely compute city options with memoization
  const cityOptions = useMemo(() => {
    try {
      const searchQuery = locationCityValue || ''
      const cities = searchCities(searchQuery, 20)
      const options = cities.map((city) => ({
        value: city.name,
        label: `${city.name}, ${city.state}`,
      }))

      // If user has entered a value that's not in options, add it
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

  // Parse portfolio images for edit mode
  useEffect(() => {
    if (mode === 'edit' && artist?.portfolio_images) {
      try {
        // For edit mode, create MediaUploadResult from existing URLs
        const existingImages: MediaUploadResult[] = artist.portfolio_images
          .filter((url): url is string => Boolean(url && typeof url === 'string'))
          .map((url, index) => ({
            id: `existing-${index}-${Date.now()}`,
            url: url,
            variants: { original: url },
            mediaType: 'image' as const,
            fileSize: 0,
            mimeType: 'image/jpeg',
            altText: `Portfolio image ${index + 1}`,
          }))
        setPortfolioImages(existingImages)
      } catch (error) {
        logger.error('Error parsing portfolio images:', error)
      }
    }
  }, [mode, artist?.portfolio_images])

  // Use the chunked upload system
  const handleMediaSelect = (items: MediaUploadResult[]) => {
    setPortfolioImages(items)
  }

  const handleMediaRemove = (mediaId: string) => {
    setPortfolioImages((prev) => prev.filter((item) => item.id !== mediaId))
  }

  const { handleFileSelect, uploadProgress } = useFileUpload(
    handleMediaSelect,
    portfolioImages,
    10, // max 10 portfolio images
    isLoading,
    'portfolios' // Use portfolios folder for artist portfolio images
  )

  // Update service_category when category/subcategory changes
  useEffect(() => {
    try {
      if (selectedCategory) {
        const categoryObj = SERVICE_CATEGORIES.find((cat) => cat.id === selectedCategory)
        if (
          categoryObj &&
          ARTIST_CATEGORIES.includes(categoryObj.label as (typeof ARTIST_CATEGORIES)[number])
        ) {
          setValue('service_category', categoryObj.label as (typeof ARTIST_CATEGORIES)[number], {
            shouldValidate: false, // Don't trigger full form validation on change
            shouldDirty: true,
            shouldTouch: false,
          })
          // Clear any previous errors for service_category
          clearErrors('service_category')
        }
      } else {
        // Clear service_category if no category is selected - use undefined instead of empty string
        setValue('service_category', '' as never, { shouldValidate: false })
      }
    } catch (error) {
      logger.error('Error updating service category:', error)
      // Don't throw - just log the error to prevent form from disappearing
    }
  }, [selectedCategory, selectedSubcategory, setValue, clearErrors])

  // File selection is handled by useFileUpload hook
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const onSubmit = async (data: ArtistFormData): Promise<void> => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to continue',
        variant: 'destructive',
      })
      return
    }

    // Validate service category is selected
    if (!selectedCategory || !data.service_category) {
      toast({
        title: 'Service category required',
        description: 'Please select a service category',
        variant: 'destructive',
      })
      return
    }

    // Check if there are images that haven't finished uploading
    const uploadingCount = uploadProgress.filter(
      (p) => p.status !== 'completed' && p.status !== 'error' && p.status !== 'cancelled'
    ).length
    if (uploadingCount > 0) {
      toast({
        title: 'Upload in progress',
        description: `Please wait for ${uploadingCount} image${uploadingCount > 1 ? 's' : ''} to finish uploading`,
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const endpoint = mode === 'create' ? '/api/artists' : `/api/artists/${artist?.id}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const uploadedUrls = portfolioImages
        .map((img) => img.url)
        .filter((url): url is string => Boolean(url && typeof url === 'string'))

      // Prepare request body
      interface ArtistRequestBody extends ArtistFormData {
        portfolio_images: string[]
        location_coordinates?: string
      }
      const requestBody: ArtistRequestBody = {
        ...data,
        portfolio_images: uploadedUrls,
      }

      // If using current location, send coordinates instead of city
      if (useCurrentLocation && locationCoordinates) {
        // Don't send city name - let geocoding trigger handle it
        requestBody.location_coordinates = `POINT(${locationCoordinates.longitude} ${locationCoordinates.latitude})`
        // Set location_city to empty string to indicate coordinates should be used
        requestBody.location_city = ''
      }

      const response = await fetch(endpoint, {
        method,
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
        throw new Error(result?.error || `Failed to ${mode} artist profile`)
      }

      toast({
        title: mode === 'create' ? 'Profile created' : 'Profile updated',
        description:
          mode === 'create'
            ? 'Your freelancer/creator profile has been created. Subscribe to receive booking requests.'
            : 'Your freelancer/creator profile has been updated successfully.',
      })

      const artistId = result?.data?.id || artist?.id || ''
      if (onSuccess && artistId) {
        onSuccess(artistId)
      } else if (mode === 'create' && artistId) {
        router.push(`/artists/${artistId}`)
      } else if (mode === 'create') {
        router.push('/artists/dashboard')
      } else {
        router.push('/artists/dashboard')
      }
    } catch (error) {
      logger.error('Form submission error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to ${mode} profile`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const selectedCategoryObj = SERVICE_CATEGORIES.find((cat) => cat.id === selectedCategory)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Stage Name + City in grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="stage_name" className="text-sm font-medium">
              Stage Name / Business Name
            </label>
            <span className="text-xs text-muted-foreground">{stageNameValue?.length || 0}/100</span>
          </div>
          <Input
            id="stage_name"
            {...register('stage_name')}
            placeholder="Your professional name"
            maxLength={100}
            aria-describedby={errors.stage_name ? 'stage_name_error' : undefined}
          />
          {errors.stage_name && (
            <p id="stage_name_error" className="mt-1 text-sm text-destructive" role="alert">
              {errors.stage_name.message}
            </p>
          )}
        </div>

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
                    }}
                    placeholder="Search your city..."
                    searchPlaceholder="Search cities..."
                    emptyMessage="No cities found. Try a different search."
                    aria-describedby={errors.location_city ? 'location_city_error' : undefined}
                  />
                )}
              />
              {errors.location_city && (
                <p id="location_city_error" className="mt-1 text-sm text-destructive" role="alert">
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
            </div>
          )}
        </div>
      </div>

      {/* Service Category + Subcategory */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="service_category" className="text-sm font-medium mb-2 block">
            Service Category <span className="text-destructive">*</span>
          </label>
          <Select
            value={selectedCategory || undefined}
            onValueChange={(value) => {
              setSelectedCategory(value || '')
              setSelectedSubcategory('') // Reset subcategory when category changes
            }}
          >
            <SelectTrigger
              id="service_category"
              aria-describedby={errors.service_category ? 'service_category_error' : undefined}
            >
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_CATEGORIES.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.service_category && (
            <p id="service_category_error" className="mt-1 text-sm text-destructive" role="alert">
              {errors.service_category.message}
            </p>
          )}
        </div>

        {selectedCategoryObj?.subcategories && selectedCategoryObj.subcategories.length > 0 && (
          <div>
            <label htmlFor="service_subcategory" className="text-sm font-medium mb-2 block">
              Subcategory <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <Select
              value={selectedSubcategory || undefined}
              onValueChange={(value) => setSelectedSubcategory(value || '')}
            >
              <SelectTrigger id="service_subcategory">
                <SelectValue placeholder="Select subcategory (optional)" />
              </SelectTrigger>
              <SelectContent>
                {selectedCategoryObj.subcategories.map((subcat) => (
                  <SelectItem key={subcat} value={subcat}>
                    {subcat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Hidden field for service_category */}
      <input type="hidden" {...register('service_category')} />

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <span className="text-xs text-muted-foreground">
            {descriptionValue?.length || 0}/1000
          </span>
        </div>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Tell us about your work, experience, and what makes you unique..."
          rows={3}
          maxLength={1000}
          aria-describedby={errors.description ? 'description_error' : undefined}
        />
        {errors.description && (
          <p id="description_error" className="mt-1 text-sm text-destructive" role="alert">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Rate Range */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="rate_min" className="text-sm font-medium mb-2 block">
            Minimum Rate (₹)
          </label>
          <Input
            id="rate_min"
            type="number"
            inputMode="numeric"
            {...register('rate_min', { valueAsNumber: true })}
            placeholder="5000"
            min={0}
            aria-describedby={errors.rate_min ? 'rate_min_error' : undefined}
          />
          {errors.rate_min && (
            <p id="rate_min_error" className="mt-1 text-sm text-destructive" role="alert">
              {errors.rate_min.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="rate_max" className="text-sm font-medium mb-2 block">
            Maximum Rate (₹)
          </label>
          <Input
            id="rate_max"
            type="number"
            inputMode="numeric"
            {...register('rate_max', { valueAsNumber: true })}
            placeholder="25000"
            min={0}
            aria-describedby={errors.rate_max ? 'rate_max_error' : undefined}
          />
          {errors.rate_max && (
            <p id="rate_max_error" className="mt-1 text-sm text-destructive" role="alert">
              {errors.rate_max.message}
            </p>
          )}
        </div>
      </div>

      {/* Portfolio Images */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <label htmlFor="portfolio_images" className="text-sm font-medium">
              Portfolio Images (Max 10)
            </label>
            <p className="text-sm text-muted-foreground">Upload images showcasing your work</p>
          </div>
        </div>

        {/* Image Upload Button */}
        <div className="mb-4">
          <input
            id="portfolio_images"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
            disabled={portfolioImages.length >= 10 || isLoading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={portfolioImages.length >= 10 || isLoading}
            onClick={() => fileInputRef.current?.click()}
            className="relative min-h-[48px] min-w-[48px]"
            aria-label="Select portfolio images"
          >
            <Paperclip className="h-4 w-4" />
            {portfolioImages.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {portfolioImages.length}
              </span>
            )}
          </Button>
        </div>

        {/* Media Upload Gallery with progress tracking */}
        <MediaUploadGallery
          onMediaRemove={handleMediaRemove}
          currentMedia={portfolioImages}
          uploadProgress={uploadProgress}
        />

        <p className="mt-2 text-sm text-muted-foreground">
          {portfolioImages.length}/10 images {portfolioImages.length > 0 ? 'selected' : ''}
        </p>
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isLoading} className="w-full" size="lg">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {mode === 'create' ? 'Creating Profile...' : 'Updating Profile...'}
          </>
        ) : mode === 'create' ? (
          'Register as Freelancer/Creator'
        ) : (
          'Save Changes'
        )}
      </Button>

      {mode === 'create' && (
        <p className="text-center text-sm text-muted-foreground">
          By registering, you agree to our terms. Subscription (₹1,100/month) is optional but
          required to receive booking requests.
        </p>
      )}
    </form>
  )
}
