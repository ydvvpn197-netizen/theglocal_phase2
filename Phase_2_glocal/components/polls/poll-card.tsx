'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { CheckCircle2, Clock, Building2 } from 'lucide-react'
import { generateGeometricAvatar } from '@/lib/utils/avatar-generator'
import { isPollActive } from '@/lib/utils/poll-anonymity'
import { PollResults } from './poll-results'
import { useAuth } from '@/lib/context/auth-context'
import { useToast } from '@/hooks/use-toast'

interface PollOption {
  id: string
  text: string
  vote_count: number
}

interface Poll {
  id: string
  community_id: string
  author_id: string
  question: string
  category: string
  expires_at: string | null
  tagged_authority: string | null
  total_votes: number
  created_at: string
  author?: {
    anonymous_handle: string
    avatar_seed: string
  }
  community?: {
    name: string
    slug: string
  }
  options: PollOption[]
  user_voted?: boolean
  user_selected_option?: string
}

interface PollCardProps {
  poll: Poll
  showCommunity?: boolean
}

export function PollCard({ poll, showCommunity = true }: PollCardProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [selectedOption, setSelectedOption] = useState<string | null>(
    poll.user_selected_option || null
  )
  const [hasVoted, setHasVoted] = useState(poll.user_voted || false)
  const [isVoting, setIsVoting] = useState(false)
  const [options, setOptions] = useState(poll.options)
  const [totalVotes, setTotalVotes] = useState(poll.total_votes)

  const isActive = isPollActive(poll.expires_at)
  const avatarSvg = poll.author?.avatar_seed
    ? generateGeometricAvatar(poll.author.avatar_seed)
    : null
  const timeAgo = getTimeAgo(poll.created_at)

  const handleVote = async () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to vote',
        variant: 'destructive',
      })
      return
    }

    if (!selectedOption) {
      toast({
        title: 'Select an option',
        description: 'Please choose an option before voting',
        variant: 'destructive',
      })
      return
    }

    setIsVoting(true)

    try {
      const response = await fetch(`/api/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_id: selectedOption }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to vote')
      }

      // Update local state with new results
      setHasVoted(true)
      setOptions(data.data.options)
      setTotalVotes(data.data.total_votes)

      toast({
        title: 'Vote recorded',
        description: 'Your vote has been counted anonymously',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to vote',
        variant: 'destructive',
      })
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            {avatarSvg && (
              <Avatar className="h-10 w-10">
                <div dangerouslySetInnerHTML={{ __html: avatarSvg }} />
              </Avatar>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-semibold">
                  {poll.author?.anonymous_handle || 'Anonymous'}
                </span>
                <Badge variant="secondary">{poll.category}</Badge>
                {!isActive && <Badge variant="destructive">Closed</Badge>}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                {showCommunity && poll.community && (
                  <>
                    <Link
                      href={`/communities/${poll.community.slug}`}
                      className="hover:text-brand-primary"
                    >
                      c/{poll.community.slug}
                    </Link>
                    <span>•</span>
                  </>
                )}
                <span>{timeAgo}</span>
                {poll.expires_at && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Expires {new Date(poll.expires_at).toLocaleDateString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Poll Question */}
        <h3 className="text-lg font-semibold">{poll.question}</h3>

        {/* Tagged Authority */}
        {poll.tagged_authority && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>Tagged: {poll.tagged_authority}</span>
          </div>
        )}

        {/* Voting or Results */}
        {hasVoted || !isActive ? (
          <PollResults options={options} totalVotes={totalVotes} />
        ) : (
          <div className="space-y-3">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedOption(option.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  selectedOption === option.id
                    ? 'border-brand-primary bg-brand-primary/5'
                    : 'border-muted hover:border-brand-primary/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {selectedOption === option.id && (
                    <CheckCircle2 className="h-5 w-5 text-brand-primary" />
                  )}
                  <span>{option.text}</span>
                </div>
              </button>
            ))}

            <Button onClick={handleVote} disabled={!selectedOption || isVoting} className="w-full">
              {isVoting ? 'Submitting...' : 'Vote'}
            </Button>
          </div>
        )}

        {/* Vote Count */}
        <div className="text-sm text-muted-foreground">
          {totalVotes.toLocaleString()} {totalVotes === 1 ? 'vote' : 'votes'}
        </div>
      </CardContent>
    </Card>
  )
}

function getTimeAgo(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return then.toLocaleDateString()
}
