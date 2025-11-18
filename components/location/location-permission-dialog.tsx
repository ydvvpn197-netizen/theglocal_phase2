'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Loader2, Users, Calendar, Sparkles } from 'lucide-react'
import { useLocation } from '@/lib/context/location-context'
import { useToast } from '@/lib/hooks/use-toast'

interface LocationPermissionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
}

const STORAGE_KEY = 'location_permission_dismissed'

/**
 * Location Permission Dialog
 *
 * Enhanced onboarding flow for location permissions
 * - Explains benefits
 * - Shows examples
 * - Offers manual fallback
 * - Remembers user choice
 */
export function LocationPermissionDialog({
  open,
  onOpenChange,
  onComplete,
}: LocationPermissionDialogProps) {
  const { requestLocation, setUserCity, isLoading } = useLocation()
  const { toast } = useToast()

  const [step, setStep] = useState<'benefits' | 'requesting' | 'manual'>('benefits')
  const [manualCity, setManualCity] = useState('')

  // Request location permission
  const handleRequestLocation = async () => {
    setStep('requesting')

    try {
      await requestLocation()

      toast({
        title: 'Location set!',
        description: 'You can now discover nearby artists, events, and communities.',
      })

      onComplete?.()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Location access denied',
        description: 'You can enter your city manually instead.',
        variant: 'destructive',
      })

      setStep('manual')
    }
  }

  // Manual city entry
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!manualCity.trim()) {
      toast({
        title: 'City required',
        description: 'Please enter your city name.',
        variant: 'destructive',
      })
      return
    }

    setUserCity(manualCity.trim())

    toast({
      title: 'Location saved!',
      description: `Showing content for ${manualCity}`,
    })

    onComplete?.()
    onOpenChange(false)
  }

  // Skip and remember choice
  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {step === 'benefits' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <MapPin className="h-6 w-6 text-primary" />
                Discover What's Near You
              </DialogTitle>
              <DialogDescription className="text-base">
                Get personalized recommendations based on your location
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Benefits */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Users className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">Find Nearby Artists</h4>
                    <p className="text-sm text-muted-foreground">
                      Discover musicians, photographers, and creators in your area
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">Events Happening Nearby</h4>
                    <p className="text-sm text-muted-foreground">
                      Never miss concerts, workshops, and shows around you
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">Join Local Communities</h4>
                    <p className="text-sm text-muted-foreground">
                      Connect with people who share your interests nearby
                    </p>
                  </div>
                </div>
              </div>

              {/* Privacy Note */}
              <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                <p className="text-xs text-green-900 dark:text-green-100">
                  🔒 <strong>Privacy First:</strong> We only use your location to show relevant
                  content. Your exact coordinates are never shared publicly.
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Button
                  onClick={handleRequestLocation}
                  className="w-full"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Getting location...
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-2 h-4 w-4" />
                      Allow Location Access
                    </>
                  )}
                </Button>

                <Button variant="outline" className="w-full" onClick={() => setStep('manual')}>
                  Enter City Manually
                </Button>

                <Button
                  variant="ghost"
                  className="w-full text-sm text-muted-foreground"
                  onClick={handleSkip}
                >
                  Skip for now
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'requesting' && (
          <>
            <DialogHeader>
              <DialogTitle>Accessing Your Location</DialogTitle>
              <DialogDescription>Please allow location access in your browser...</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground text-center">Waiting for permission...</p>
            </div>

            <Button variant="outline" className="w-full" onClick={() => setStep('manual')}>
              Enter City Manually Instead
            </Button>
          </>
        )}

        {step === 'manual' && (
          <>
            <DialogHeader>
              <DialogTitle>Enter Your City</DialogTitle>
              <DialogDescription>
                Tell us where you're located to see relevant content
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleManualSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="manual-city">City Name</Label>
                <Input
                  id="manual-city"
                  type="text"
                  placeholder="e.g., Mumbai, Delhi, Bangalore"
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  We'll show you artists, events, and communities in this city
                </p>
              </div>

              <div className="space-y-2">
                <Button type="submit" className="w-full">
                  Continue
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStep('benefits')}
                >
                  ← Back
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Hook to check if location permission dialog should be shown
 */
export function useShouldShowLocationDialog() {
  const { userCity, userCoordinates } = useLocation()
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    // Don't show if user already has location set
    if (userCity || userCoordinates) {
      setShouldShow(false)
      return
    }

    // Don't show if user dismissed it before
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (dismissed) {
      setShouldShow(false)
      return
    }

    // Show the dialog
    setShouldShow(true)
  }, [userCity, userCoordinates])

  return shouldShow
}
