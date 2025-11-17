'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/lib/hooks/use-toast'
import { Pause, Play, XCircle, Loader2 } from 'lucide-react'

interface SubscriptionActionsProps {
  artistId: string
  subscriptionStatus: string
  onActionComplete?: () => void
}

export function SubscriptionActions({
  artistId,
  subscriptionStatus,
  onActionComplete,
}: SubscriptionActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [actionType, setActionType] = useState<'pause' | 'resume' | 'cancel' | null>(null)
  const { toast } = useToast()

  const handleAction = async (action: 'pause' | 'resume' | 'cancel') => {
    setIsLoading(true)
    setActionType(action)

    try {
      const response = await fetch(`/api/artists/${artistId}/subscription`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${action} subscription`)
      }

      toast({
        title: 'Success',
        description: result.message || `Subscription ${action}d successfully`,
      })

      onActionComplete?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to ${action} subscription`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
      setActionType(null)
    }
  }

  const canPause = ['active', 'trial'].includes(subscriptionStatus)
  const canResume = subscriptionStatus === 'paused'
  const canCancel = ['active', 'trial', 'paused'].includes(subscriptionStatus)

  return (
    <div className="flex flex-wrap gap-3">
      {/* Pause Button */}
      {canPause && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={isLoading}>
              {isLoading && actionType === 'pause' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Pause className="mr-2 h-4 w-4" />
              )}
              Pause Subscription
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Pause Subscription?</AlertDialogTitle>
              <AlertDialogDescription>
                Your subscription will be paused immediately. You can resume it anytime. Your
                payment method will not be charged while paused.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleAction('pause')}>
                Pause Subscription
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Resume Button */}
      {canResume && (
        <Button
          onClick={() => handleAction('resume')}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          {isLoading && actionType === 'resume' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Resume Subscription
        </Button>
      )}

      {/* Cancel Button */}
      {canCancel && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isLoading}>
              {isLoading && actionType === 'cancel' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Cancel Subscription
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel your subscription? You'll lose access to premium
                features at the end of your current billing period. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleAction('cancel')}
                className="bg-red-600 hover:bg-red-700"
              >
                Yes, Cancel Subscription
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
