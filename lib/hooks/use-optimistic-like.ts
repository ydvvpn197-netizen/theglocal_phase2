/**
 * Optimistic Like Hook
 *
 * Implements optimistic updates for liking posts, comments, and other content.
 * Updates UI immediately before server confirms.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/lib/hooks/use-toast'

interface LikeParams {
  contentId: string
  contentType: 'post' | 'comment' | 'event'
  isLiked: boolean // Current state
}

interface LikeData {
  likeCount: number
  isLiked: boolean
}

export function useOptimisticLike() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ contentId, contentType, isLiked }: LikeParams) => {
      const endpoint = getLikeEndpoint(contentType, contentId)
      const method = isLiked ? 'DELETE' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const error = (await response.json()) as { message?: string }
        throw new Error(error.message || 'Failed to like')
      }

      return response.json()
    },

    // Optimistic update
    onMutate: async ({ contentId, contentType, isLiked }: LikeParams) => {
      const queryKey = getQueryKey(contentType, contentId)

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey })

      // Snapshot previous value
      const previousData = queryClient.getQueryData<LikeData>(queryKey)

      // Optimistically update
      queryClient.setQueryData<LikeData>(queryKey, (old) => {
        if (!old) return old

        return {
          likeCount: isLiked ? Math.max(0, old.likeCount - 1) : old.likeCount + 1,
          isLiked: !isLiked,
        }
      })

      return { previousData, queryKey }
    },

    // Rollback on error
    onError: (error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData)
      }

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to like',
        variant: 'destructive',
      })
    },

    // Refetch on success
    onSuccess: (_data, { contentType, contentId }) => {
      const queryKey = getQueryKey(contentType, contentId)
      queryClient.invalidateQueries({ queryKey })
    },
  })
}

function getLikeEndpoint(contentType: string, contentId: string): string {
  switch (contentType) {
    case 'post':
      return `/api/posts/${contentId}/like`
    case 'comment':
      return `/api/comments/${contentId}/like`
    case 'event':
      return `/api/events/${contentId}/like`
    default:
      throw new Error(`Unknown content type: ${contentType}`)
  }
}

function getQueryKey(contentType: string, contentId: string): string[] {
  return [contentType, contentId, 'likes']
}
