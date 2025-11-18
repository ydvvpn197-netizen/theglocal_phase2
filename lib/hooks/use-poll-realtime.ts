'use client'

import { logger } from '@/lib/utils/logger'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PollRow, PollOptionRow } from '@/lib/types/realtime.types'
import { isPollPayload, isPollOptionPayload } from '@/lib/types/type-guards'

interface PollOption {
  id: string
  text: string
  vote_count: number
}

interface PollRealtimeData {
  total_votes: number
  upvotes: number
  downvotes: number
  comment_count: number
  options: PollOption[]
}

interface UsePollRealtimeResult {
  data: PollRealtimeData | null
  isLoading: boolean
  error: string | null
}

export function usePollRealtime(
  pollId: string,
  initialData?: Partial<PollRealtimeData>
): UsePollRealtimeResult {
  const [data, setData] = useState<PollRealtimeData | null>(
    initialData
      ? {
          total_votes: initialData.total_votes || 0,
          upvotes: initialData.upvotes || 0,
          downvotes: initialData.downvotes || 0,
          comment_count: initialData.comment_count || 0,
          options: initialData.options || [],
        }
      : null
  )
  const [isLoading, setIsLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Function to fetch fresh poll data
    const fetchFreshData = async () => {
      try {
        const { data: freshPoll, error: pollError } = await supabase
          .from('polls')
          .select('total_votes, upvotes, downvotes, comment_count')
          .eq('id', pollId)
          .single()

        const { data: freshOptions, error: optionsError } = await supabase
          .from('poll_options')
          .select('id, option_text, vote_count')
          .eq('poll_id', pollId)
          .order('display_order')

        if (!pollError && !optionsError) {
          const transformedOptions = (freshOptions || []).map(
            (opt: { id: string; option_text: string; vote_count: number }) => ({
              id: opt.id,
              text: opt.option_text,
              vote_count: opt.vote_count,
            })
          )

          setData({
            total_votes: freshPoll?.total_votes || 0,
            upvotes: freshPoll?.upvotes || 0,
            downvotes: freshPoll?.downvotes || 0,
            comment_count: freshPoll?.comment_count || 0,
            options: transformedOptions,
          })
          logger.info('[Poll Realtime] Fresh data fetched:', {
            pollId,
            total_votes: freshPoll?.total_votes,
            optionsCount: transformedOptions.length,
          })
        } else {
          logger.error('[Poll Realtime] Error fetching fresh data:', pollError || optionsError)
        }
      } catch (error) {
        logger.error('[Poll Realtime] Error fetching fresh data:', error)
        setError('Failed to fetch poll data')
      }
    }

    // Subscribe to poll changes (total_votes)
    const pollChannel = supabase
      .channel(`poll-${pollId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'polls',
          filter: `id=eq.${pollId}`,
        },
        (payload) => {
          if (!isPollPayload(payload) || !payload.new) {
            logger.warn('[Poll Realtime] Invalid poll payload received')
            return
          }
          const newData: PollRow = payload.new
          logger.info('[Poll Realtime] Poll updated:', {
            pollId,
            total_votes: newData.total_votes,
            upvotes: newData.upvotes,
            downvotes: newData.downvotes,
            comment_count: newData.comment_count,
          })
          setData((prev) => ({
            total_votes: newData.total_votes ?? prev?.total_votes ?? 0,
            upvotes: newData.upvotes ?? prev?.upvotes ?? 0,
            downvotes: newData.downvotes ?? prev?.downvotes ?? 0,
            comment_count: newData.comment_count ?? prev?.comment_count ?? 0,
            options: prev?.options || [],
          }))
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('[Poll Realtime] Poll subscription connected, fetching fresh data')
          fetchFreshData()
          setIsLoading(false)
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('[Poll Realtime] Channel error:', status)
          setError('Failed to subscribe to poll updates')
          setIsLoading(false)
        }
      })

    // Subscribe to poll_options changes (individual option vote counts)
    const optionsChannel = supabase
      .channel(`poll-options-${pollId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'poll_options',
          filter: `poll_id=eq.${pollId}`,
        },
        (payload) => {
          if (!isPollOptionPayload(payload) || !payload.new) {
            logger.warn('[Poll Realtime] Invalid poll option payload received')
            return
          }
          const updatedOption: PollOptionRow = payload.new
          logger.info('[Poll Realtime] Option updated:', {
            pollId,
            optionId: updatedOption.id,
            vote_count: updatedOption.vote_count,
          })
          setData((prev) => {
            if (!prev) return prev

            // Update the specific option in the array
            const updatedOptions = prev.options.map((opt) =>
              opt.id === updatedOption.id
                ? {
                    id: updatedOption.id,
                    text: opt.text, // Keep existing text
                    vote_count: updatedOption.vote_count || 0,
                  }
                : opt
            )

            return {
              ...prev,
              options: updatedOptions,
            }
          })
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLoading(false)
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('[Poll Realtime] Options channel error:', status)
          setError('Failed to subscribe to poll options updates')
          setIsLoading(false)
        }
      })

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(pollChannel)
      supabase.removeChannel(optionsChannel)
    }
  }, [pollId])

  return { data, isLoading, error }
}
