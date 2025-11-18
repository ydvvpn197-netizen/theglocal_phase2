'use client'

import { logger } from '@/lib/utils/logger'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MapPin, Loader2, Check } from 'lucide-react'
import { useAuth } from '@/lib/context/auth-context'
import { getCurrentLocation } from '@/lib/utils/location'

interface LocationUpdateButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

export function LocationUpdateButton({
  variant = 'outline',
  size = 'default',
  className = '',
}: LocationUpdateButtonProps) {
  const { user, updateUserLocation } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleLocationUpdate = async () => {
    if (!user) return

    setIsLoading(true)
    setSuccess(false)

    try {
      const coordinates = await getCurrentLocation()
      if (!coordinates) {
        throw new Error('Location permission denied or unavailable')
      }

      if (!updateUserLocation) {
        throw new Error('Location update function not available')
      }

      // Convert coordinates to string format (lat,lng)
      const coordinatesString = `${coordinates.latitude},${coordinates.longitude}`
      await updateUserLocation(coordinatesString)

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      logger.error('Error updating location:', error)
      // You could add a toast notification here
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLocationUpdate}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : success ? (
        <Check className="h-4 w-4" />
      ) : (
        <MapPin className="h-4 w-4" />
      )}
      <span className="ml-2">
        {isLoading ? 'Updating...' : success ? 'Updated!' : 'Use Current Location'}
      </span>
    </Button>
  )
}
