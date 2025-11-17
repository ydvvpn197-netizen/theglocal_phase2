/**
 * Optimistic Follow Hook
 *
 * Implements optimistic updates for following/unfollowing users, artists, communities.
 * Updates UI immediately before server confirms.
 */

import { useMutation, useQueryClient, QueryClient } from '@tanstack/react-query'
import { useToast } from '@/lib/hooks/use-toast'

interface FollowParams {
  targetId: string
  targetType: 'user' | 'artist' | 'community'
  isFollowing: boolean // Current state
}

interface FollowData {
  followerCount: number
  isFollowing: boolean
}

export function useOptimisticFollow() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ targetId, targetType, isFollowing }: FollowParams) => {
      const endpoint = getFollowEndpoint(targetType, targetId)
      const method = isFollowing ? 'DELETE' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const error = (await response.json()) as { message?: string }
        throw new Error(error.message || 'Failed to follow')
      }

      return response.json()
    },

    // Optimistic update
    onMutate: async ({ targetId, targetType, isFollowing }: FollowParams) => {
      const queryKey = getQueryKey(targetType, targetId)

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey })

      // Snapshot previous value
      const previousData = queryClient.getQueryData<FollowData>(queryKey)

      // Optimistically update
      queryClient.setQueryData<FollowData>(queryKey, (old) => {
        if (!old) return old

        return {
          followerCount: isFollowing ? Math.max(0, old.followerCount - 1) : old.followerCount + 1,
          isFollowing: !isFollowing,
        }
      })

      // Also update list queries (e.g., followers list, following list)
      updateFollowLists(queryClient, targetId, targetType, !isFollowing)

      return { previousData, queryKey }
    },

    // Rollback on error
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData)
      }

      // Rollback list updates
      updateFollowLists(
        queryClient,
        variables.targetId,
        variables.targetType,
        variables.isFollowing
      )

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to follow',
        variant: 'destructive',
      })
    },

    // Refetch on success
    onSuccess: (_data, { targetType, targetId, isFollowing }) => {
      const queryKey = getQueryKey(targetType, targetId)
      queryClient.invalidateQueries({ queryKey })

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [targetType, 'followers'] })
      queryClient.invalidateQueries({ queryKey: ['user', 'following'] })

      toast({
        title: 'Success',
        description: isFollowing ? 'Unfollowed successfully' : 'Following successfully',
      })
    },
  })
}

/**
 * Update follow lists optimistically
 */
function updateFollowLists(
  queryClient: QueryClient,
  targetId: string,
  targetType: string,
  isFollowing: boolean
) {
  // Update followers list
  const followersKey = [targetType, targetId, 'followers']
  queryClient.setQueryData(followersKey, (old: unknown) => {
    if (!old || typeof old !== 'object') return old
    const oldData = old as { count?: number }
    return {
      ...oldData,
      count: isFollowing ? (oldData.count ?? 0) + 1 : Math.max(0, (oldData.count ?? 0) - 1),
    }
  })

  // Update following list
  const followingKey = ['user', 'following', targetType]
  queryClient.setQueryData(followingKey, (old: unknown) => {
    if (!Array.isArray(old)) return old

    if (isFollowing) {
      // Add to list
      return [...old, { id: targetId, type: targetType }]
    } else {
      // Remove from list
      return old.filter((item: { id?: string }) => item.id !== targetId)
    }
  })
}

function getFollowEndpoint(targetType: string, targetId: string): string {
  switch (targetType) {
    case 'user':
      return `/api/users/${targetId}/follow`
    case 'artist':
      return `/api/artists/${targetId}/follow`
    case 'community':
      return `/api/communities/${targetId}/follow`
    default:
      throw new Error(`Unknown target type: ${targetType}`)
  }
}

function getQueryKey(targetType: string, targetId: string): string[] {
  return [targetType, targetId, 'follow']
}
