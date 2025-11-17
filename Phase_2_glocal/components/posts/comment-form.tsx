'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/context/auth-context'
import { Button } from '@/components/ui/button'
import { useToast } from '@/lib/hooks/use-toast'
import { useDraft } from '@/lib/hooks/use-draft'
import { DraftIndicator } from '@/components/posts/draft-indicator'

interface CommentFormProps {
  postId: string
  parentId?: string
  onSuccess?: () => void
  onCancel?: () => void
  placeholder?: string
  isPollComment?: boolean
}

export function CommentForm({
  postId,
  parentId,
  onSuccess,
  onCancel,
  placeholder = 'Add a comment...',
  isPollComment: _isPollComment = false,
}: CommentFormProps) {
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  // Initialize draft hook for comment
  const {
    draft,
    updateDraft,
    deleteDraft: clearDraft,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    error: draftError,
  } = useDraft({
    type: 'comment',
    initialData: {
      post_id: postId,
      parent_id: parentId,
      body: '',
    },
    enabled: !!user,
  })

  // Restore draft on mount
  useEffect(() => {
    if (draft && draft.body) {
      setText(draft.body)
    }
  }, [draft])

  // Update draft when text changes
  useEffect(() => {
    if (!user || !text.trim()) return

    updateDraft({
      body: text,
      post_id: postId,
      parent_id: parentId,
    })
  }, [text, postId, parentId, user, updateDraft])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to comment',
        variant: 'destructive',
      })
      return
    }

    if (!text.trim()) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          parent_id: parentId || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to post comment')
      }

      toast({
        title: 'Comment posted',
        description: 'Your comment has been added',
      })

      // Clear draft on successful comment submission
      if (draft) {
        await clearDraft().catch((err) => {
          // Log but don't block on draft deletion failure
          console.error('Failed to clear draft:', err)
        })
      }

      setText('')
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to post comment',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const textareaId = `comment-textarea-${postId}${parentId ? `-${parentId}` : ''}`
  const helpTextId = `${textareaId}-help`

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2"
      aria-label={parentId ? 'Reply form' : 'Comment form'}
    >
      {/* Draft Indicator */}
      {user && text && (
        <div className="flex items-center justify-end">
          <DraftIndicator
            isSaving={isSaving}
            lastSaved={lastSaved}
            hasUnsavedChanges={hasUnsavedChanges}
            error={draftError}
            variant="compact"
          />
        </div>
      )}

      <label htmlFor={textareaId} className="sr-only">
        {placeholder}
      </label>
      <textarea
        id={textareaId}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          // Trigger immediate save on blur
          if (text.trim()) {
            updateDraft({
              body: text,
              post_id: postId,
              parent_id: parentId,
            })
          }
        }}
        placeholder={placeholder}
        disabled={isSubmitting}
        className="min-h-[80px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        maxLength={500}
        aria-describedby={helpTextId}
        aria-required="true"
      />

      <div className="flex justify-between text-xs text-muted-foreground">
        <span id={helpTextId} aria-live="polite">
          {text.length}/500 characters
        </span>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting || !text.trim()} size="sm">
          {isSubmitting ? 'Posting...' : parentId ? 'Reply' : 'Comment'}
        </Button>

        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
