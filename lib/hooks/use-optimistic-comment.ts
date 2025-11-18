/**
 * Optimistic Comment Hook
 *
 * Implements optimistic updates for adding comments.
 * Shows comment immediately in UI while sending to server.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/lib/hooks/use-toast'
import { useAuth } from '@/lib/context/auth-context'

interface CommentParams {
  postId: string
  text: string
  parentId?: string
}

interface Comment {
  id: string
  text: string
  author_id: string
  author: {
    anonymous_handle: string
    avatar_seed: string
  }
  created_at: string
  upvotes: number
  downvotes: number
  replies?: Comment[]
}

export function useOptimisticComment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user, profile } = useAuth()

  return useMutation({
    mutationFn: async ({ postId, text, parentId }: CommentParams) => {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, parent_id: parentId }),
      })

      if (!response.ok) {
        const error = (await response.json()) as { message?: string }
        throw new Error(error.message || 'Failed to post comment')
      }

      return response.json()
    },

    // Optimistic update
    onMutate: async ({ postId, text, parentId }: CommentParams) => {
      const queryKey = ['post', postId, 'comments']

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey })

      // Snapshot previous value
      const previousComments = queryClient.getQueryData<Comment[]>(queryKey)

      // Create optimistic comment
      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`, // Temporary ID
        text,
        author_id: user?.id || 'unknown',
        author: {
          anonymous_handle: profile?.anonymous_handle || 'You',
          avatar_seed: profile?.avatar_seed || 'default',
        },
        created_at: new Date().toISOString(),
        upvotes: 0,
        downvotes: 0,
        replies: [],
      }

      // Optimistically add comment
      queryClient.setQueryData<Comment[]>(queryKey, (old) => {
        if (!old) return [optimisticComment]

        if (parentId) {
          // Add as reply to parent comment
          return old.map((comment) => {
            if (comment.id === parentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), optimisticComment],
              }
            }
            return comment
          })
        }

        // Add as top-level comment
        return [optimisticComment, ...old]
      })

      return { previousComments, queryKey }
    },

    // Rollback on error
    onError: (error, _variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(context.queryKey, context.previousComments)
      }

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to post comment',
        variant: 'destructive',
      })
    },

    // Replace optimistic comment with real data on success
    onSuccess: (_data, { postId }) => {
      const queryKey = ['post', postId, 'comments']

      // Invalidate to refetch with real data from server
      queryClient.invalidateQueries({ queryKey })

      toast({
        title: 'Success',
        description: 'Comment posted successfully',
      })
    },
  })
}
