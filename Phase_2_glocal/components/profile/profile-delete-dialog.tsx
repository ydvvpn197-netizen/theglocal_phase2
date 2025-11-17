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
import { Loader2, AlertTriangle } from 'lucide-react'
import { useToast } from '@/lib/hooks/use-toast'

interface ProfileDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  anonymousHandle: string
}

export function ProfileDeleteDialog({
  open,
  onOpenChange,
  anonymousHandle,
}: ProfileDeleteDialogProps) {
  const [confirmHandle, setConfirmHandle] = useState('')
  const [understandAnonymize, setUnderstandAnonymize] = useState(false)
  const [understandContent, setUnderstandContent] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const canDelete = confirmHandle === anonymousHandle && understandAnonymize && understandContent

  const handleDelete = async () => {
    if (!canDelete) return

    setIsDeleting(true)

    try {
      const response = await fetch('/api/profile/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation_handle: confirmHandle,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: 'Account deleted',
          description: 'Your account has been deleted and anonymized.',
        })
        // Redirect to home page
        router.push('/')
      } else {
        throw new Error(result.error || 'Failed to delete account')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete account',
        variant: 'destructive',
      })
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Account
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. Your account will be permanently anonymized.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Message */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">What will happen:</p>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>Your username will be replaced with a random deleted user ID</li>
              <li>Your account data will be permanently removed</li>
              <li>Your bio and location will be cleared</li>
              <li>All your posts and comments will remain visible</li>
              <li>You will be signed out and cannot log back in</li>
            </ul>
          </div>

          {/* Confirmations */}
          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="understand_anonymize"
                checked={understandAnonymize}
                onChange={(e) => setUnderstandAnonymize(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 mt-0.5"
                aria-label="I understand my account will be anonymized"
              />
              <Label htmlFor="understand_anonymize" className="font-normal cursor-pointer text-sm">
                I understand my account will be anonymized and this action cannot be reversed
              </Label>
            </div>

            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="understand_content"
                checked={understandContent}
                onChange={(e) => setUnderstandContent(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 mt-0.5"
                aria-label="I understand my posts and comments will remain visible"
              />
              <Label htmlFor="understand_content" className="font-normal cursor-pointer text-sm">
                I understand my posts and comments will remain visible with a deleted user tag
              </Label>
            </div>
          </div>

          {/* Handle Confirmation */}
          <div className="space-y-2">
            <Label htmlFor="confirm_handle">
              Type your username <span className="font-mono font-bold">{anonymousHandle}</span> to
              confirm
            </Label>
            <Input
              id="confirm_handle"
              value={confirmHandle}
              onChange={(e) => setConfirmHandle(e.target.value)}
              placeholder={anonymousHandle}
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Account Forever
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
