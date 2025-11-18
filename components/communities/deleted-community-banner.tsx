'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, RotateCcw, Loader2 } from 'lucide-react'
import { useToast } from '@/lib/hooks/use-toast'

interface DeletedCommunityBannerProps {
  community: {
    id: string
    name: string
    slug: string
    deleted_at: string
    deletion_scheduled_for: string
  }
  isAdmin: boolean
}

export function DeletedCommunityBanner({ community, isAdmin }: DeletedCommunityBannerProps) {
  const { toast } = useToast()
  const [timeLeft, setTimeLeft] = useState('')
  const [isRestoring, setIsRestoring] = useState(false)
  const [isExpired, setIsExpired] = useState(false)

  // Calculate time left until permanent deletion
  useEffect(() => {
    const calculateTimeLeft = () => {
      const deletionTime = new Date(community.deletion_scheduled_for).getTime()
      const now = new Date().getTime()
      const difference = deletionTime - now

      if (difference <= 0) {
        setIsExpired(true)
        setTimeLeft('Expired')
        return
      }

      const hours = Math.floor(difference / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`)
      } else {
        setTimeLeft(`${seconds}s`)
      }
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [community.deletion_scheduled_for])

  const handleRestore = async () => {
    setIsRestoring(true)

    try {
      const response = await fetch(`/api/communities/${community.slug}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to restore community')
      }

      toast({
        title: 'Community Restored',
        description: 'Your community has been restored successfully.',
      })

      // Refresh the page to show restored community
      window.location.reload()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to restore community',
        variant: 'destructive',
      })
    } finally {
      setIsRestoring(false)
    }
  }

  const deletionDate = new Date(community.deleted_at).toLocaleString()

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />

          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-destructive mb-1">Community Deleted</h3>
              <p className="text-sm text-muted-foreground">
                This community was deleted on {deletionDate}
              </p>
            </div>

            {isExpired ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Recovery window has expired</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  This community can no longer be restored and will be permanently deleted soon.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">
                    Time remaining: <span className="text-orange-600">{timeLeft}</span>
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  After this time, the community will be permanently deleted and cannot be restored.
                </p>
              </div>
            )}

            <div className="rounded-md bg-muted/50 p-3">
              <h4 className="font-medium text-sm mb-2">What happened to the content:</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• All posts have been moved to &quot;Archived Communities&quot;</li>
                <li>• Community members have been removed</li>
                <li>• Community settings and rules have been preserved</li>
                <li>
                  • You can still view archived posts by visiting the Archived Communities page
                </li>
              </ul>
            </div>

            {isAdmin && !isExpired && (
              <Button onClick={handleRestore} disabled={isRestoring} className="w-full sm:w-auto">
                {isRestoring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore Community
                  </>
                )}
              </Button>
            )}

            {isExpired && (
              <div className="text-sm text-muted-foreground">
                Only super admins can restore communities after the recovery window expires.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
