'use client'

import { useState } from 'react'
import { MoreVertical, Edit, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/lib/hooks/use-toast'
import { useAuth } from '@/lib/context/auth-context'

interface CommentActionsProps {
  commentId: string
  authorId: string
  text: string
  createdAt?: string
  onUpdate?: () => void
  currentUserRole?: 'admin' | 'moderator' | 'member' | null
  communityId?: string
}

export function CommentActions({
  commentId,
  authorId,
  text,
  createdAt,
  onUpdate,
}: CommentActionsProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(text)

  // Check if user can edit (within 10 minutes)
  const canEdit = () => {
    if (!createdAt) return false
    const createdDate = new Date(createdAt)
    const now = new Date()
    const diffMinutes = (now.getTime() - createdDate.getTime()) / (1000 * 60)
    return diffMinutes <= 10
  }

  // Only show actions if user is the author
  if (!user || user.id !== authorId) {
    return null
  }

  const handleEdit = async () => {
    if (!canEdit()) {
      toast({
        title: 'Cannot edit',
        description: 'Comments can only be edited within 10 minutes of creation',
        variant: 'destructive',
      })
      return
    }

    setIsEditing(true)

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editText }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update comment')
      }

      toast({
        title: 'Success',
        description: 'Comment updated successfully',
      })

      setIsEditOpen(false)
      onUpdate?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update comment',
        variant: 'destructive',
      })
    } finally {
      setIsEditing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete comment')
      }

      toast({
        title: 'Success',
        description: 'Comment deleted successfully',
      })

      onUpdate?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete comment',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsEditOpen(true)} disabled={!canEdit()}>
            <Edit className="mr-2 h-4 w-4" />
            Edit {!canEdit() && '(expired)'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} disabled={isDeleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Comment</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Edit your comment..."
              rows={4}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground">{editText.length}/500 characters</div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isEditing || !editText.trim()}>
              {isEditing ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
