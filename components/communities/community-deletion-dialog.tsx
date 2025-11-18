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
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useToast } from '@/lib/hooks/use-toast'

interface CommunityDeletionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  community: {
    id: string
    name: string
    slug: string
  }
}

export function CommunityDeletionDialog({
  open,
  onOpenChange,
  community,
}: CommunityDeletionDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [communityName, setCommunityName] = useState('')
  const [isConfirmed, setIsConfirmed] = useState(false)

  const handleNameChange = (value: string) => {
    setCommunityName(value)
    setIsConfirmed(value.trim() === community.name)
  }

  const handleDelete = async () => {
    if (!isConfirmed) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/communities/${community.slug}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityName: community.name }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete community')
      }

      toast({
        title: 'Community Deleted',
        description:
          'Your community has been scheduled for deletion. You have 24 hours to restore it.',
        variant: 'destructive',
      })

      // Close dialog and redirect to communities page
      onOpenChange(false)
      router.push('/communities')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete community',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setCommunityName('')
    setIsConfirmed(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Community
          </DialogTitle>
          <DialogDescription>
            This action will permanently delete your community and all its content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <h4 className="font-medium text-destructive mb-2">What happens when you delete:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Community will be hidden from all listings</li>
              <li>• All posts will be moved to &quot;Archived Communities&quot;</li>
              <li>• Community members will be removed</li>
              <li>• You have 24 hours to restore the community</li>
              <li>• After 24 hours, the community will be permanently deleted</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="community-name">
              Type <span className="font-medium">{community.name}</span> to confirm deletion:
            </Label>
            <Input
              id="community-name"
              value={communityName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={community.name}
              disabled={isLoading}
              className={!isConfirmed && communityName ? 'border-destructive' : ''}
            />
            {communityName && !isConfirmed && (
              <p className="text-sm text-destructive">
                Community name does not match. Please type the exact name.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={!isConfirmed || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Community'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
