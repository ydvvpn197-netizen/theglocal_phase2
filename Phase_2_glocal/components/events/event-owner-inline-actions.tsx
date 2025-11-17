'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
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
} from '@/components/ui/alert-dialog'
import { useToast } from '@/lib/hooks/use-toast'

interface EventOwnerInlineActionsProps {
  eventId: string
  eventTitle: string
  onDeleted?: () => void
}

export function EventOwnerInlineActions({
  eventId,
  eventTitle,
  onDeleted,
}: EventOwnerInlineActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/events/${eventId}`, { method: 'DELETE' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete event')
      }

      toast({
        title: 'Event deleted',
        description: `"${eventTitle}" has been removed.`,
      })

      setIsDialogOpen(false)
      onDeleted?.()
      router.refresh()
    } catch (error) {
      toast({
        title: 'Failed to delete event',
        description: error instanceof Error ? error.message : 'Unable to delete event',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/events/${eventId}/edit`} className="flex items-center gap-1">
          <Pencil className="h-4 w-4" />
          Edit
        </Link>
      </Button>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => setIsDialogOpen(true)}
          aria-label="Delete event"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              “{eventTitle}” will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
