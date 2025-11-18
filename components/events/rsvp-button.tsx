'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserPlus, UserCheck } from 'lucide-react'
import { useAuth } from '@/lib/context/auth-context'
import { useToast } from '@/lib/hooks/use-toast'

interface RsvpButtonProps {
  eventId: string
  initialRsvp?: boolean
  initialCount?: number
}

export function RsvpButton({ eventId, initialRsvp = false, initialCount = 0 }: RsvpButtonProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [hasRsvp, setHasRsvp] = useState(initialRsvp)
  const [rsvpCount, setRsvpCount] = useState(initialCount)
  const [isLoading, setIsLoading] = useState(false)

  const handleRsvp = async () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to RSVP',
        variant: 'destructive',
      })
      return
    }

    if (hasRsvp) {
      toast({
        title: "Already RSVP'd",
        description: 'You have already confirmed attendance for this event',
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to RSVP')
      }

      setHasRsvp(true)
      setRsvpCount(data.data.rsvp_count)

      toast({
        title: 'RSVP confirmed',
        description: "We'll notify you about this event",
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to RSVP',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {rsvpCount > 0 && (
        <span className="text-sm text-muted-foreground">
          {rsvpCount} {rsvpCount === 1 ? 'person' : 'people'} interested
        </span>
      )}

      <Button
        onClick={handleRsvp}
        disabled={isLoading || hasRsvp}
        variant={hasRsvp ? 'outline' : 'default'}
      >
        {hasRsvp ? (
          <>
            <UserCheck className="mr-2 h-4 w-4" />
            RSVP&apos;d
          </>
        ) : (
          <>
            <UserPlus className="mr-2 h-4 w-4" />
            RSVP
          </>
        )}
      </Button>
    </div>
  )
}
