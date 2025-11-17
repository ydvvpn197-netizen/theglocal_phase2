'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MapPin, Loader2 } from 'lucide-react'
import { getCurrentLocation } from '@/lib/utils/location'
import { useToast } from '@/lib/hooks/use-toast'

interface LocationPermissionProps {
  onLocationSet: (city: string, coordinates?: { latitude: number; longitude: number }) => void
  onSkip?: () => void
}

export function LocationPermission({ onLocationSet, onSkip }: LocationPermissionProps) {
  const { toast } = useToast()
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualCity, setManualCity] = useState('')

  const handleRequestLocation = async () => {
    setIsGettingLocation(true)
    try {
      const coordinates = await getCurrentLocation()

      if (!coordinates) {
        toast({
          title: 'Location Access Denied',
          description: 'Please enter your city manually',
          variant: 'destructive',
        })
        setShowManualInput(true)
        return
      }

      // In production, you'd reverse geocode to get city name
      // For now, we'll show manual input
      toast({
        title: 'Location Retrieved',
        description: 'Please confirm your city below',
      })

      setShowManualInput(true)
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to get your location',
        variant: 'destructive',
      })
      setShowManualInput(true)
    } finally {
      setIsGettingLocation(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!manualCity.trim()) {
      toast({
        title: 'City Required',
        description: 'Please enter your city name',
        variant: 'destructive',
      })
      return
    }

    onLocationSet(manualCity.trim())
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-brand-accent/10 rounded-full">
            <MapPin className="h-8 w-8 text-brand-accent" />
          </div>
        </div>
        <CardTitle>Set Your Location</CardTitle>
        <CardDescription>
          Help us show you local content and communities in your area
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showManualInput ? (
          <>
            <Button onClick={handleRequestLocation} className="w-full" disabled={isGettingLocation}>
              {isGettingLocation ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Getting Location...
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-4 w-4" />
                  Use My Current Location
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button onClick={() => setShowManualInput(true)} variant="outline" className="w-full">
              Enter City Manually
            </Button>
          </>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="city" className="text-sm font-medium">
                Your City
              </label>
              <Input
                id="city"
                type="text"
                placeholder="e.g., Mumbai, Delhi, Bangalore"
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                autoFocus
              />
            </div>

            <Button type="submit" className="w-full">
              Continue
            </Button>

            <Button
              type="button"
              onClick={() => setShowManualInput(false)}
              variant="ghost"
              className="w-full"
            >
              ← Back
            </Button>
          </form>
        )}

        {onSkip && (
          <Button onClick={onSkip} variant="link" className="w-full text-sm text-muted-foreground">
            Skip for now
          </Button>
        )}

        <div className="p-3 bg-muted/50 rounded-md text-xs text-center text-muted-foreground">
          <p>
            🔒 <strong>Privacy:</strong> We only store your city name, never precise GPS
            coordinates.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
