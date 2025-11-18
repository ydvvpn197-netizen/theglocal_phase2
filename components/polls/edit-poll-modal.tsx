'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { X, Plus, Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/lib/hooks/use-toast'
import type { Poll } from '@/lib/types/poll.types'

interface EditPollModalProps {
  poll: Poll
  communityRole?: { role: 'admin' | 'moderator' | 'member' | null } | null
}

export function EditPollModal({ poll, communityRole: _communityRole }: EditPollModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [question, setQuestion] = useState(poll.question)
  const [description, setDescription] = useState('')
  const [options, setOptions] = useState(poll.options.map((opt) => opt.text))
  const [category, setCategory] = useState(poll.category)
  const [expiresAt, setExpiresAt] = useState(
    poll.expires_at ? new Date(poll.expires_at).toISOString().slice(0, 16) : ''
  )
  const [taggedAuthority, setTaggedAuthority] = useState(poll.tagged_authority || '')

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setQuestion(poll.question)
      setDescription('')
      setOptions(poll.options.map((opt) => opt.text))
      setCategory(poll.category)
      setExpiresAt(poll.expires_at ? new Date(poll.expires_at).toISOString().slice(0, 16) : '')
      setTaggedAuthority(poll.tagged_authority || '')
    }
  }, [open, poll])

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ''])
    }
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    const filledOptions = options.filter((opt) => opt.trim().length > 0)
    if (filledOptions.length < 2) {
      toast({
        title: 'Invalid poll',
        description: 'Please provide at least 2 options',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/polls/${poll.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          question: question.trim(),
          options: filledOptions,
          category,
          expires_at: expiresAt || null,
          tagged_authority: taggedAuthority.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update poll')
      }

      toast({
        title: 'Poll updated',
        description: 'Your changes have been saved',
      })

      setOpen(false)
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update poll',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const hasVotes = poll.total_votes > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Poll</DialogTitle>
          <DialogDescription>
            {hasVotes
              ? 'This poll has votes. You can only edit the description and expiration date.'
              : 'Edit your poll details.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="question">Poll Question</Label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={hasVotes}
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>

          {!hasVotes && (
            <div>
              <Label>Poll Options</Label>
              <div className="space-y-2 mt-1">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeOption(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {options.length < 10 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Option
                  </Button>
                )}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="expiresAt">Expires At (Optional)</Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
