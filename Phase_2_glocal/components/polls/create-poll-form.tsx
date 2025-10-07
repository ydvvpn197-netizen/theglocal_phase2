'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { X, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/context/auth-context'
import { POLL_CATEGORIES } from '@/lib/utils/constants'

interface CreatePollFormProps {
  communityId?: string
  onSuccess?: () => void
}

export function CreatePollForm({ communityId, onSuccess }: CreatePollFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [category, setCategory] = useState<string>('general')
  const [expiresAt, setExpiresAt] = useState('')
  const [taggedAuthority, setTaggedAuthority] = useState('')
  const [selectedCommunity, setSelectedCommunity] = useState(communityId || '')

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

    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to create a poll',
        variant: 'destructive',
      })
      return
    }

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

    if (!selectedCommunity) {
      toast({
        title: 'Select a community',
        description: 'Please choose which community to post this poll in',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          community_id: selectedCommunity,
          question: question.trim(),
          options: filledOptions,
          category,
          expires_at: expiresAt || null,
          tagged_authority: taggedAuthority.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create poll')
      }

      toast({
        title: 'Poll created',
        description: 'Your poll has been posted to the community',
      })

      // Reset form
      setQuestion('')
      setOptions(['', ''])
      setCategory('general')
      setExpiresAt('')
      setTaggedAuthority('')

      onSuccess?.()
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create poll',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Community Selector (if not pre-selected) */}
      {!communityId && (
        <div>
          <label className="text-sm font-medium">Community</label>
          <select
            value={selectedCommunity}
            onChange={(e) => setSelectedCommunity(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">Select a community...</option>
            {/* This would be populated from user's communities */}
          </select>
        </div>
      )}

      {/* Question */}
      <div>
        <label className="text-sm font-medium">Question</label>
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What would you like to ask your community?"
          rows={3}
          maxLength={300}
          required
        />
        <div className="mt-1 text-xs text-muted-foreground">{question.length}/300</div>
      </div>

      {/* Category */}
      <div>
        <label className="text-sm font-medium">Category</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {POLL_CATEGORIES.map((cat) => (
            <Badge
              key={cat}
              variant={category === cat ? 'default' : 'outline'}
              className="cursor-pointer capitalize"
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {/* Options */}
      <div>
        <label className="text-sm font-medium">Options (2-10)</label>
        <div className="mt-2 space-y-2">
          {options.map((option, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                maxLength={100}
                required
              />
              {options.length > 2 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(index)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {options.length < 10 && (
          <Button type="button" variant="outline" size="sm" onClick={addOption} className="mt-2">
            <Plus className="mr-2 h-4 w-4" />
            Add Option
          </Button>
        )}
      </div>

      {/* Optional: Expiry Date */}
      <div>
        <label className="text-sm font-medium">Expiry Date (Optional)</label>
        <Input
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
        />
        <div className="mt-1 text-xs text-muted-foreground">
          Leave empty for no expiry. Voting will close automatically at this time.
        </div>
      </div>

      {/* Optional: Tag Government Authority */}
      <div>
        <label className="text-sm font-medium">Tag Authority (Optional)</label>
        <Input
          value={taggedAuthority}
          onChange={(e) => setTaggedAuthority(e.target.value)}
          placeholder="e.g., Municipal Corporation, Traffic Police, etc."
          maxLength={100}
        />
        <div className="mt-1 text-xs text-muted-foreground">
          Symbolically tag a government authority related to this poll
        </div>
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Creating Poll...' : 'Create Poll'}
      </Button>
    </form>
  )
}
