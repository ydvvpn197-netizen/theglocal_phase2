'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Calendar, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateEventForm } from './create-event-form'
import { useAuth } from '@/lib/context/auth-context'
import { CACHE_TIMES, STALE_TIMES } from '@/lib/config/query-config'

interface Artist {
  id: string
  stage_name: string
  subscription_status: string
  subscription_end_date: string | null
}

async function fetchArtistProfile(): Promise<Artist | null> {
  const response = await fetch('/api/artists/me')
  if (!response.ok) {
    if (response.status === 401) {
      return null
    }
    throw new Error('Failed to fetch artist profile')
  }
  const data = await response.json()
  return data.artist || null
}

export function CreateEventModal() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  // Fetch artist profile with React Query caching
  const {
    data: artist,
    isLoading,
    error,
  } = useQuery<Artist | null>({
    queryKey: ['artist', 'me'],
    queryFn: fetchArtistProfile,
    enabled: !!user, // Only fetch when user is authenticated
    staleTime: STALE_TIMES.ARTISTS,
    gcTime: CACHE_TIMES.ARTIST_PROFILE,
    retry: 1,
  })

  const handleSuccess = (eventId: string) => {
    setOpen(false)
    router.push(`/events/${eventId}`)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    setOpen(newOpen)
  }

  // Not authenticated
  if (!user) {
    return (
      <Button
        className="w-full sm:w-auto"
        variant="outline"
        onClick={() => router.push('/auth/login')}
      >
        <Calendar className="mr-2 h-4 w-4" />
        Create Event
      </Button>
    )
  }

  // Loading artist profile
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button className="w-full sm:w-auto" variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading artist profile...
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Error loading artist profile
  if (error) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button className="w-full sm:w-auto" variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
          </DialogHeader>
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Error Loading Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Failed to load your artist profile. Please try again.</p>
              <Button
                onClick={() => {
                  setOpen(false)
                  router.refresh()
                }}
                className="w-full"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    )
  }

  // Not an artist
  if (!artist) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button className="w-full sm:w-auto" variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
          </DialogHeader>
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Freelancer/Creator Registration Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                You need to register as a freelancer/creator to create events. This allows you to
                showcase your work and connect with your local community.
              </p>
              <Button
                onClick={() => {
                  setOpen(false)
                  router.push('/artists/register')
                }}
                className="w-full"
              >
                Register as Freelancer/Creator
              </Button>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    )
  }

  // Artist without active subscription
  const hasActiveSubscription = ['trial', 'active'].includes(artist.subscription_status)
  if (!hasActiveSubscription) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button className="w-full sm:w-auto" variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
          </DialogHeader>
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Subscription Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                You need an active subscription to create events. Your subscription has expired.
              </p>
              <p>
                Please renew your subscription to continue creating events and receiving booking
                requests.
              </p>
              <Button
                onClick={() => {
                  setOpen(false)
                  router.push('/artists/dashboard')
                }}
                className="w-full"
              >
                Renew Subscription
              </Button>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    )
  }

  // Artist with active subscription - show form
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto" variant="outline">
          <Calendar className="mr-2 h-4 w-4" />
          Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
        </DialogHeader>
        <CreateEventForm artistName={artist.stage_name} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
