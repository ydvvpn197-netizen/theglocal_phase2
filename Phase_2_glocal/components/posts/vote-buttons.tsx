'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { useAuth } from '@/lib/context/auth-context'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface VoteButtonsProps {
  contentType: 'post' | 'comment'
  contentId: string
  upvotes: number
  downvotes: number
  userVote?: 'upvote' | 'downvote' | null
}

export function VoteButtons({
  contentType,
  contentId,
  upvotes: initialUpvotes,
  downvotes: initialDownvotes,
  userVote: initialUserVote = null,
}: VoteButtonsProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [upvotes, setUpvotes] = useState(initialUpvotes)
  const [downvotes, setDownvotes] = useState(initialDownvotes)
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(initialUserVote)
  const [isVoting, setIsVoting] = useState(false)

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to vote',
        variant: 'destructive',
      })
      router.push('/auth/signup')
      return
    }

    setIsVoting(true)

    // Optimistic update
    const previousUpvotes = upvotes
    const previousDownvotes = downvotes
    const previousUserVote = userVote

    if (userVote === voteType) {
      // Remove vote
      setUserVote(null)
      if (voteType === 'upvote') {
        setUpvotes(upvotes - 1)
      } else {
        setDownvotes(downvotes - 1)
      }
    } else if (userVote) {
      // Change vote
      setUserVote(voteType)
      if (voteType === 'upvote') {
        setUpvotes(upvotes + 1)
        setDownvotes(downvotes - 1)
      } else {
        setUpvotes(upvotes - 1)
        setDownvotes(downvotes + 1)
      }
    } else {
      // New vote
      setUserVote(voteType)
      if (voteType === 'upvote') {
        setUpvotes(upvotes + 1)
      } else {
        setDownvotes(downvotes + 1)
      }
    }

    try {
      const endpoint =
        contentType === 'post' ? `/api/posts/${contentId}/vote` : `/api/comments/${contentId}/vote`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote_type: voteType }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to vote')
      }

      // Update with actual values from server
      setUpvotes(result.data.upvotes)
      setDownvotes(result.data.downvotes)
      setUserVote(result.data.userVote)
    } catch (error) {
      // Revert optimistic update
      setUpvotes(previousUpvotes)
      setDownvotes(previousDownvotes)
      setUserVote(previousUserVote)

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to vote',
        variant: 'destructive',
      })
    } finally {
      setIsVoting(false)
    }
  }

  const score = upvotes - downvotes

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote('upvote')}
        disabled={isVoting}
        className={cn(
          'h-8 w-8 p-0',
          userVote === 'upvote' && 'text-brand-accent bg-brand-accent/10'
        )}
      >
        <ArrowUp className="h-4 w-4" />
      </Button>

      <span
        className={cn(
          'text-sm font-semibold w-12 text-center',
          score > 0 && 'text-brand-accent',
          score < 0 && 'text-destructive'
        )}
      >
        {score > 0 ? `+${score}` : score}
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote('downvote')}
        disabled={isVoting}
        className={cn(
          'h-8 w-8 p-0',
          userVote === 'downvote' && 'text-destructive bg-destructive/10'
        )}
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
    </div>
  )
}
