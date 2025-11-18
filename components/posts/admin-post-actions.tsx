'use client'

import { useState } from 'react'
import { MoreVertical, Pin, PinOff, Trash2, Megaphone, MegaphoneOff } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useToast } from '@/lib/hooks/use-toast'

interface AdminPostActionsProps {
  postId: string
  isPinned: boolean
  isAnnouncement: boolean
  onUpdate?: () => void
}

export function AdminPostActions({
  postId,
  isPinned,
  isAnnouncement,
  onUpdate,
}: AdminPostActionsProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handlePinToggle = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/posts/${postId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !isPinned }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update post')
      }

      toast({
        title: 'Success',
        description: isPinned ? 'Post unpinned' : 'Post pinned',
      })

      onUpdate?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update post',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnnouncementToggle = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/posts/${postId}/announcement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcement: !isAnnouncement }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update post')
      }

      toast({
        title: 'Success',
        description: isAnnouncement
          ? 'Post unmarked as announcement'
          : 'Post marked as announcement',
      })

      onUpdate?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update post',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete post')
      }

      toast({
        title: 'Success',
        description: 'Post deleted successfully',
      })

      onUpdate?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete post',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isLoading}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handlePinToggle} disabled={isLoading}>
          {isPinned ? (
            <>
              <PinOff className="mr-2 h-4 w-4" />
              Unpin Post
            </>
          ) : (
            <>
              <Pin className="mr-2 h-4 w-4" />
              Pin Post
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleAnnouncementToggle} disabled={isLoading}>
          {isAnnouncement ? (
            <>
              <MegaphoneOff className="mr-2 h-4 w-4" />
              Remove Announcement
            </>
          ) : (
            <>
              <Megaphone className="mr-2 h-4 w-4" />
              Mark as Announcement
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} disabled={isLoading} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Post
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
