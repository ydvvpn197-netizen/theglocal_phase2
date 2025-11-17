/**
 * Optimistic Voting Hook
 *
 * Implements optimistic updates for voting (upvote/downvote) on posts, comments, polls.
 * Updates UI immediately before server confirms, providing instant feedback.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/lib/hooks/use-toast'

interface VoteParams {
  contentId: string
  contentType: 'post' | 'comment' | 'poll'
  voteType: 'upvote' | 'downvote' | null // null = remove vote
}

interface VoteData {
  upvotes: number
  downvotes: number
  userVote?: 'upvote' | 'downvote' | null
}

export function useOptimisticVote() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ contentId, contentType, voteType }: VoteParams) => {
      const endpoint = getVoteEndpoint(contentType, contentId)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote_type: voteType }),
      })

      if (!response.ok) {
        const error = (await response.json()) as { message?: string }
        throw new Error(error.message || 'Failed to vote')
      }

      return response.json()
    },

    // Optimistic update
    onMutate: async ({ contentId, contentType, voteType }: VoteParams) => {
      const queryKey = getQueryKey(contentType, contentId)

      // Cancel outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<VoteData>(queryKey)

      // Optimistically update to the new value
      if (previousData) {
        queryClient.setQueryData<VoteData>(queryKey, (old) => {
          if (!old) return old

          const newData = { ...old }
          const oldVote = old.userVote

          // Remove old vote counts
          if (oldVote === 'upvote') {
            newData.upvotes = Math.max(0, newData.upvotes - 1)
          } else if (oldVote === 'downvote') {
            newData.downvotes = Math.max(0, newData.downvotes - 1)
          }

          // Add new vote counts
          if (voteType === 'upvote') {
            newData.upvotes += 1
          } else if (voteType === 'downvote') {
            newData.downvotes += 1
          }

          newData.userVote = voteType

          return newData
        })
      }

      // Return context with previous data for rollback
      return { previousData, queryKey }
    },

    // Rollback on error
    onError: (error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData)
      }

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to vote',
        variant: 'destructive',
      })
    },

    // Refetch after success to ensure data consistency
    onSuccess: (_data, { contentType, contentId }) => {
      const queryKey = getQueryKey(contentType, contentId)
      queryClient.invalidateQueries({ queryKey })
    },
  })
}

/**
 * Get vote API endpoint for content type
 */
function getVoteEndpoint(contentType: string, contentId: string): string {
  switch (contentType) {
    case 'post':
      return `/api/posts/${contentId}/vote`
    case 'comment':
      return `/api/comments/${contentId}/vote`
    case 'poll':
      return `/api/polls/${contentId}/vote`
    default:
      throw new Error(`Unknown content type: ${contentType}`)
  }
}

/**
 * Get React Query key for content type
 */
function getQueryKey(contentType: string, contentId: string): string[] {
  return [contentType, contentId, 'votes']
}
