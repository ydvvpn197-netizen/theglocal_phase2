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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/context/auth-context'

interface PostActionsProps {
  postId: string
  authorId: string
  title: string
  body: string | null
  createdAt: string
  onUpdate?: () => void
}

export function PostActions({
  postId,
  authorId,
  title,
  body,
  createdAt,
  onUpdate,
}: PostActionsProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(title)
  const [editBody, setEditBody] = useState(body || '')

  // Check if user can edit (within 10 minutes)
  const canEdit = () => {
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
        description: 'Posts can only be edited within 10 minutes of creation',
        variant: 'destructive',
      })
      return
    }

    setIsEditing(true)

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          body: editBody,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update post')
      }

      toast({
        title: 'Success',
        description: 'Post updated successfully',
      })

      setIsEditOpen(false)
      onUpdate?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update post',
        variant: 'destructive',
      })
    } finally {
      setIsEditing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)

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
      setIsDeleting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
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
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Post title"
                maxLength={300}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Body</label>
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                placeholder="What's on your mind?"
                rows={6}
                maxLength={5000}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isEditing}>
              {isEditing ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
