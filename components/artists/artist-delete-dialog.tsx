'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertTriangle, XCircle, Trash2 } from 'lucide-react'
import { useToast } from '@/lib/hooks/use-toast'

interface ArtistDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  artistId: string
  stageName: string
}

type DeleteStep = 'choose' | 'confirm-soft' | 'confirm-hard'

export function ArtistDeleteDialog({
  open,
  onOpenChange,
  artistId,
  stageName,
}: ArtistDeleteDialogProps) {
  const [step, setStep] = useState<DeleteStep>('choose')
  const [confirmStageName, setConfirmStageName] = useState('')
  const [understandPermanent, setUnderstandPermanent] = useState(false)
  const [understandNoRecover, setUnderstandNoRecover] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleClose = () => {
    if (!isDeleting) {
      setStep('choose')
      setConfirmStageName('')
      setUnderstandPermanent(false)
      setUnderstandNoRecover(false)
      onOpenChange(false)
    }
  }

  const handleSoftDelete = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/artists/${artistId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: 'Subscription cancelled',
          description:
            'Your freelancer/creator subscription has been cancelled. You can reactivate anytime.',
        })
        router.push('/artists/register')
        router.refresh()
      } else {
        throw new Error(result.error || 'Failed to cancel subscription')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to cancel subscription',
        variant: 'destructive',
      })
      setIsDeleting(false)
    }
  }

  const handleHardDelete = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/artists/${artistId}?permanent=true`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: 'Freelancer/Creator profile deleted',
          description: 'Your freelancer/creator profile has been permanently deleted.',
        })
        router.push('/artists/register')
        router.refresh()
      } else {
        throw new Error(result.error || 'Failed to delete profile')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete profile',
        variant: 'destructive',
      })
      setIsDeleting(false)
    }
  }

  const canConfirmHardDelete =
    confirmStageName === stageName && understandPermanent && understandNoRecover

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        {step === 'choose' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Delete Freelancer/Creator Profile
              </DialogTitle>
              <DialogDescription>
                Choose how you want to remove your freelancer/creator profile
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Cancel Subscription Option */}
              <div className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold">Cancel Subscription</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pause your freelancer/creator profile without losing data
                    </p>
                  </div>
                </div>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground ml-8">
                  <li>Your profile will be hidden from search</li>
                  <li>All your data remains saved</li>
                  <li>You can reactivate anytime</li>
                  <li>Events and bookings history preserved</li>
                </ul>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setStep('confirm-soft')}
                >
                  Cancel Subscription
                </Button>
              </div>

              {/* Permanent Delete Option */}
              <div className="border border-destructive/30 rounded-lg p-4 space-y-3 hover:bg-destructive/5 transition-colors">
                <div className="flex items-start gap-3">
                  <Trash2 className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-destructive">Delete Permanently</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Completely remove your freelancer/creator profile forever
                    </p>
                  </div>
                </div>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground ml-8">
                  <li>Your freelancer/creator profile will be deleted</li>
                  <li>All events and bookings will be removed</li>
                  <li>This action cannot be undone</li>
                  <li>Your user account remains intact</li>
                </ul>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setStep('confirm-hard')}
                >
                  Delete Permanently
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'confirm-soft' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-orange-600" />
                Cancel Freelancer/Creator Subscription
              </DialogTitle>
              <DialogDescription>
                Your profile will be paused but all data will be preserved
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-orange-900">What will happen:</p>
                <ul className="text-sm space-y-1 list-disc list-inside text-orange-800">
                  <li>Your subscription status will be set to cancelled</li>
                  <li>Your profile will be hidden from public search</li>
                  <li>All your data (events, bookings) remains saved</li>
                  <li>You can reactivate your profile anytime</li>
                </ul>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep('choose')} disabled={isDeleting}>
                Back
              </Button>
              <Button
                variant="default"
                onClick={handleSoftDelete}
                disabled={isDeleting}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cancel Subscription
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'confirm-hard' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Delete Profile Permanently
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. Your freelancer/creator profile will be permanently
                deleted.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Warning Message */}
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-destructive">What will be deleted:</p>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Your entire artist profile and stage name</li>
                  <li>All events you created</li>
                  <li>All booking history</li>
                  <li>Portfolio images and media</li>
                  <li>Subscription and payment history</li>
                </ul>
                <p className="text-sm font-medium text-green-700 mt-3">What will be kept:</p>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Your main user account (you can still use the platform)</li>
                  <li>Your posts and comments on forums</li>
                </ul>
              </div>

              {/* Confirmations */}
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="understand_permanent"
                    checked={understandPermanent}
                    onChange={(e) => setUnderstandPermanent(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 mt-0.5"
                    aria-label="I understand this will permanently delete my artist profile"
                  />
                  <Label
                    htmlFor="understand_permanent"
                    className="font-normal cursor-pointer text-sm"
                  >
                    I understand my freelancer/creator profile, events, and bookings will be
                    permanently deleted
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="understand_no_recover"
                    checked={understandNoRecover}
                    onChange={(e) => setUnderstandNoRecover(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 mt-0.5"
                    aria-label="I understand this action cannot be undone"
                  />
                  <Label
                    htmlFor="understand_no_recover"
                    className="font-normal cursor-pointer text-sm"
                  >
                    I understand this action cannot be undone and I cannot recover my data
                  </Label>
                </div>
              </div>

              {/* Stage Name Confirmation */}
              <div className="space-y-2">
                <Label htmlFor="confirm_stage_name">
                  Type your stage name <span className="font-mono font-bold">{stageName}</span> to
                  confirm
                </Label>
                <Input
                  id="confirm_stage_name"
                  value={confirmStageName}
                  onChange={(e) => setConfirmStageName(e.target.value)}
                  placeholder={stageName}
                  className="font-mono"
                  disabled={isDeleting}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep('choose')} disabled={isDeleting}>
                Back
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleHardDelete}
                disabled={!canConfirmHardDelete || isDeleting}
              >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Profile Forever
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
