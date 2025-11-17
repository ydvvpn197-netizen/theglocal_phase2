'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useEffect, useCallback, useRef } from 'react'
import { PollCard } from './poll-card'
import { Loader2 } from 'lucide-react'
import { usePollFeedRealtime } from '@/lib/hooks/use-poll-feed-realtime'
import { RealtimeStatus } from '@/components/ui/realtime-status'
import { Poll } from '@/lib/types/poll.types'

interface PollFeedProps {
  communityId?: string
  initialPolls?: Poll[]
}

export function PollFeed({ communityId, initialPolls = [] }: PollFeedProps) {
  const [polls, setPolls] = useState<Poll[]>(initialPolls)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Real-time subscription for polls feed
  const { isConnected: isRealtimeConnected, error: realtimeError } = usePollFeedRealtime({
    communityId,
    onNewPoll: (newPoll: Poll) => {
      logger.info('🆕 New poll received via realtime:', newPoll.id)
      setPolls((prev) => {
        // Check if poll already exists (prevent duplicates)
        if (prev.some((p) => p.id === newPoll.id)) {
          return prev
        }
        // Add new poll to the top of the feed
        return [newPoll, ...prev]
      })
    },
    onPollUpdate: (pollId: string, updates: Partial<Poll>) => {
      logger.info('🔄 Poll updated via realtime', { pollId, updates })
      setPolls((prev) => prev.map((poll) => (poll.id === pollId ? { ...poll, ...updates } : poll)))
    },
    onPollDelete: (pollId: string) => {
      logger.info('🗑️ Poll deleted via realtime:', pollId)
      setPolls((prev) => prev.filter((poll) => poll.id !== pollId))
      // Also update hasMore if we removed the last poll
      if (polls.length === 1) {
        setHasMore(false)
      }
    },
  })

  const fetchPolls = useCallback(
    async (offset: number = 0) => {
      if (isLoading || (!hasMore && offset > 0)) return

      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          limit: '20',
          offset: offset.toString(),
        })

        const endpoint = '/api/polls'

        if (communityId) {
          params.append('community_id', communityId)
        }

        const response = await fetch(`${endpoint}?${params}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch polls')
        }

        const newPolls = result.data || []

        if (offset === 0) {
          setPolls(newPolls)
        } else {
          setPolls((prev) => [...prev, ...newPolls])
        }

        // If we got fewer polls than requested, we've reached the end
        setHasMore(newPolls.length === 20)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load polls')
      } finally {
        setIsLoading(false)
      }
    },
    [communityId, isLoading, hasMore]
  )

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoading) {
          fetchPolls(polls.length)
        }
      },
      { threshold: 0.1 }
    )

    observerRef.current.observe(loadMoreRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [fetchPolls, hasMore, isLoading, polls.length])

  // Load initial polls
  useEffect(() => {
    if (initialPolls.length === 0) {
      fetchPolls(0)
    }
  }, [fetchPolls, initialPolls.length])

  const handlePollUpdate = (updatedPoll: Poll): void => {
    setPolls((prev) => prev.map((poll) => (poll.id === updatedPoll.id ? updatedPoll : poll)))
  }

  const handlePollDelete = (pollId: string) => {
    setPolls((prev) => {
      const filtered = prev.filter((poll) => poll.id !== pollId)
      // Update hasMore if we removed the last poll
      if (prev.length === 1 && filtered.length === 0) {
        setHasMore(false)
      }
      return filtered
    })
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">{error}</p>
        <button
          onClick={() => fetchPolls(0)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Realtime status indicator */}
      <div className="flex items-center justify-end gap-2">
        <RealtimeStatus
          isConnected={isRealtimeConnected}
          error={realtimeError}
          showText={true}
          size="sm"
        />
      </div>

      {polls.map((poll) => (
        <PollCard
          key={poll.id}
          poll={poll}
          showCommunity={!communityId}
          onUpdate={handlePollUpdate}
          onDelete={handlePollDelete}
        />
      ))}

      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {!hasMore && polls.length > 0 && (
        <div className="text-center py-4 text-muted-foreground">You've reached the end!</div>
      )}

      <div ref={loadMoreRef} />
    </div>
  )
}
