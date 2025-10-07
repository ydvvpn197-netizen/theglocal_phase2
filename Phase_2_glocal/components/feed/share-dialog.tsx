'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/context/auth-context'

interface ShareDialogProps {
  isOpen: boolean
  onClose: () => void
  contentType: 'news' | 'reddit' | 'event'
  contentUrl: string
  prefilledTitle?: string
  prefilledDescription?: string
}

export function ShareDialog({
  isOpen,
  onClose,
  contentType,
  contentUrl,
  prefilledTitle = '',
  prefilledDescription = '',
}: ShareDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [title, setTitle] = useState(prefilledTitle)
  const [description, setDescription] = useState(prefilledDescription)
  const [selectedCommunity, setSelectedCommunity] = useState<string>('')
  const [communities, setCommunities] = useState<Array<{ id: string; name: string; slug: string }>>(
    []
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingCommunities, setIsFetchingCommunities] = useState(false)

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTitle(prefilledTitle)
      setDescription(prefilledDescription)
      setSelectedCommunity('')
    }
  }, [isOpen, prefilledTitle, prefilledDescription])

  // Fetch user's communities when dialog opens
  useEffect(() => {
    if (isOpen && user) {
      fetchUserCommunities()
    }
  }, [isOpen, user])

  const fetchUserCommunities = async () => {
    setIsFetchingCommunities(true)

    try {
      const response = await fetch('/api/communities')
      const result = await response.json()

      if (response.ok) {
        // Filter to only communities user is a member of
        setCommunities(result.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch communities:', error)
    } finally {
      setIsFetchingCommunities(false)
    }
  }

  const handleShare = async () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to share content',
        variant: 'destructive',
      })
      return
    }

    if (!selectedCommunity) {
      toast({
        title: 'Select a community',
        description: 'Please choose which community to share this to',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/discover/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          community_id: selectedCommunity,
          title,
          body: `${description}\n\nSource: ${contentUrl}`,
          external_url: contentUrl,
          content_type: contentType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to share content')
      }

      toast({
        title: 'Shared successfully',
        description: 'Content has been posted to the community',
      })

      onClose()
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to share content',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share to Community</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Community Selector */}
          <div>
            <label className="text-sm font-medium">Select Community</label>
            {isFetchingCommunities ? (
              <div className="text-sm text-muted-foreground">Loading communities...</div>
            ) : (
              <select
                value={selectedCommunity}
                onChange={(e) => setSelectedCommunity(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Choose a community...</option>
                {communities.map((community) => (
                  <option key={community.id} value={community.id}>
                    {community.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title"
              maxLength={300}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium">Add Context (Optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why are you sharing this? Add your thoughts..."
              rows={4}
              maxLength={500}
            />
          </div>

          {/* Source URL Preview */}
          <div className="rounded-md bg-muted p-3">
            <div className="text-xs font-medium text-muted-foreground">Source</div>
            <div className="mt-1 truncate text-sm">{contentUrl}</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={isLoading || !selectedCommunity}>
            {isLoading ? 'Sharing...' : 'Share to Community'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
