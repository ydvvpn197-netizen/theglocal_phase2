import { logger } from '@/lib/utils/logger'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Conversation } from '@/lib/types/messages.types'
import {
  realtimeConnectionManager,
  generateSubscriptionKey,
} from '@/lib/utils/realtime-connection-manager'
import { getUserFriendlyMessage } from '@/lib/utils/error-handler'
import { MessageRow, ConversationReadRow } from '@/lib/types/realtime.types'
import { isMessagePayload, isConversationReadPayload } from '@/lib/types/type-guards'

interface UseConversationsRealtimeOptions {
  userId: string | null
  enabled?: boolean
}

export function useConversationsRealtime({
  userId: currentUserId,
  enabled = true,
}: UseConversationsRealtimeOptions) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const refreshTimeoutRef = useRef<number | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const conversationIdsRef = useRef<Set<string>>(new Set())
  // Lock to prevent refresh conflicts
  const refreshLockRef = useRef<boolean>(false)

  // Load conversations with debouncing support
  const loadConversations = useCallback(
    async (skipLoading = false) => {
      if (!enabled) {
        setIsLoading(false)
        return
      }

      if (!currentUserId) {
        setError('Not authenticated')
        setIsLoading(false)
        return
      }

      try {
        if (!skipLoading) {
          setIsLoading(true)
        }
        setError(null)

        // Use API route for proper data fetching with unread counts
        const response = await fetch('/api/messages/conversations')

        if (!response.ok) {
          const errorData = (await response.json()) as { error?: string }
          throw new Error(errorData.error || 'Failed to load conversations')
        }

        const result = (await response.json()) as {
          success: boolean
          error?: string
          data?: Conversation[]
        }

        if (!result.success) {
          throw new Error(result.error || 'Failed to load conversations')
        }

        const data = result.data || []

        setConversations(data)

        // Update conversation IDs ref for filtering message events
        conversationIdsRef.current = new Set(data.map((conv: Conversation) => conv.id))
      } catch (err) {
        logger.error('Error loading conversations:', err)
        setError(getUserFriendlyMessage(err))
      } finally {
        if (!skipLoading) {
          setIsLoading(false)
        }
      }
    },
    [currentUserId, enabled]
  )

  // Debounced refresh function for realtime updates
  // Prevents multiple refreshes from stacking and conflicts with optimistic updates
  const debouncedRefresh = useCallback(() => {
    // Clear existing timeout to prevent stacking
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }

    // Schedule debounced refresh
    refreshTimeoutRef.current = window.setTimeout(() => {
      // Check lock before executing - if locked, skip this refresh
      // (optimistic updates are handling the state, so we don't need to refresh)
      if (refreshLockRef.current) {
        return
      }

      // Set lock during refresh
      refreshLockRef.current = true

      loadConversations(true).finally(() => {
        // Release lock after refresh completes
        setTimeout(() => {
          refreshLockRef.current = false
        }, 100)
      })
    }, 300) // 300ms debounce
  }, [loadConversations])

  // Create conversation
  const createConversation = useCallback(
    async (targetUserId: string): Promise<Conversation> => {
      if (!currentUserId) {
        throw new Error('Not authenticated')
      }

      if (targetUserId === currentUserId) {
        throw new Error('Cannot create conversation with yourself')
      }

      // Use the API route instead of direct Supabase calls
      const response = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: targetUserId }),
      })

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string }
        throw new Error(getUserFriendlyMessage(errorData.error || 'Failed to create conversation'))
      }

      const result = (await response.json()) as {
        success: boolean
        error?: string
        data?: Conversation[]
      }

      if (!result.success || !result.data || result.data.length === 0) {
        throw new Error(getUserFriendlyMessage('Failed to create conversation'))
      }

      const conversation = result.data[0]
      if (!conversation) {
        throw new Error(getUserFriendlyMessage('Failed to create conversation'))
      }

      // Optimistically add to local state immediately
      setConversations((prev) => {
        const exists = prev.some((conv) => conv.id === conversation.id)
        if (!exists) {
          // Add new conversation at the beginning of the list
          conversationIdsRef.current.add(conversation.id)
          return [conversation, ...prev]
        }
        // If it exists, update it
        return prev.map((conv) => (conv.id === conversation.id ? conversation : conv))
      })

      // Immediately refresh conversations list to ensure we have the latest data
      // This ensures unread counts and other computed fields are correct
      setTimeout(() => {
        loadConversations()
      }, 100)

      return conversation
    },
    [currentUserId, loadConversations]
  )

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Set up realtime subscriptions for conversations and messages
  useEffect(() => {
    if (!enabled || !currentUserId) {
      return
    }

    let mounted = true
    const subscriptionKey = generateSubscriptionKey('conversations', currentUserId)

    logger.info(`💬 Setting up conversations realtime for user: ${currentUserId}`)

    try {
      // Create channel using connection manager
      const channel = realtimeConnectionManager.getChannel(subscriptionKey, () => {
        return supabase.channel(subscriptionKey)
      })

      channelRef.current = channel

      // Listen to conversation table changes
      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversations',
            filter: `participant_1_id=eq.${currentUserId}`,
          },
          (payload) => {
            logger.info('💬 Conversation updated (participant_1):', payload)
            if (mounted) debouncedRefresh()
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversations',
            filter: `participant_2_id=eq.${currentUserId}`,
          },
          (payload) => {
            logger.info('💬 Conversation updated (participant_2):', payload)
            if (mounted) debouncedRefresh()
          }
        )
        // Listen to messages table INSERT/UPDATE events
        // When new messages arrive, refresh conversations to update unread counts and last_message_at
        // Only refresh if the message belongs to one of the user's conversations
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          async (payload) => {
            if (!isMessagePayload(payload) || !payload.new) {
              return
            }
            const message: MessageRow = payload.new
            const conversationId = message.conversation_id

            if (!conversationId) return

            // Check if this message belongs to one of the user's conversations
            // We check both the ref (fast) and verify with a quick query if needed
            const belongsToUser =
              conversationIdsRef.current.has(conversationId) ||
              (await (async () => {
                // Quick verification: check if user is participant
                const { data: conv } = await supabase
                  .from('conversations')
                  .select('id')
                  .eq('id', conversationId)
                  .or(`participant_1_id.eq.${currentUserId},participant_2_id.eq.${currentUserId}`)
                  .single()

                if (conv) {
                  conversationIdsRef.current.add(conversationId)
                  return true
                }
                return false
              })())

            if (belongsToUser && mounted) {
              logger.info('💬 New message inserted for user conversation, refreshing', {
                messageId: message.id,
                conversationId,
              })
              debouncedRefresh()
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
          },
          async (payload) => {
            if (!isMessagePayload(payload) || !payload.new) {
              return
            }
            const message: MessageRow = payload.new
            const conversationId = message.conversation_id

            if (!conversationId) return

            // Check if this message belongs to one of the user's conversations
            if (conversationIdsRef.current.has(conversationId) && mounted) {
              logger.info('💬 Message updated for user conversation, refreshing:', message.id)
              debouncedRefresh()
            }
          }
        )
        // Listen to message_reads table changes to update unread counts
        // Only refresh if the read belongs to a message in one of the user's conversations
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'message_reads',
          },
          async (payload) => {
            if (!isConversationReadPayload(payload) || !payload.new) {
              return
            }
            const read: ConversationReadRow = payload.new
            const messageId = read.message_id || read.last_read_message_id

            if (!messageId) return

            // Get the message to find its conversation
            const { data: message } = await supabase
              .from('messages')
              .select('conversation_id')
              .eq('id', messageId)
              .single()

            if (
              message?.conversation_id &&
              conversationIdsRef.current.has(message.conversation_id) &&
              mounted
            ) {
              logger.info('💬 Message marked as read in user conversation, refreshing:', messageId)
              debouncedRefresh()
            }
          }
        )
        .subscribe((status) => {
          logger.info(`💬 Conversations realtime status:`, status)
          if (status === 'SUBSCRIBED') {
            logger.info('✅ Successfully subscribed to conversations realtime')
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            logger.warn('💬 Conversations realtime subscription error:', status)
          }
        })
    } catch (err) {
      logger.error('Error setting up conversations realtime subscription:', err)
      setError(getUserFriendlyMessage(err))
    }

    return () => {
      logger.info(`🔌 Cleaning up conversations realtime for user: ${currentUserId}`)
      mounted = false
      // Clear debounce timeout
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
      // Reset refresh lock
      refreshLockRef.current = false
      if (channelRef.current) {
        realtimeConnectionManager.releaseChannel(subscriptionKey, channelRef.current)
        channelRef.current = null
      }
    }
  }, [currentUserId, enabled, debouncedRefresh, supabase])

  return {
    conversations,
    isLoading,
    error,
    createConversation,
    refetch: loadConversations,
  }
}
