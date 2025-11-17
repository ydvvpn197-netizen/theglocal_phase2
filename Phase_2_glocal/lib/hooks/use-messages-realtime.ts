import { logger } from '@/lib/utils/logger'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageWithSender } from '@/lib/types/messages.types'
import {
  realtimeConnectionManager,
  generateSubscriptionKey,
  retryWithBackoff,
} from '@/lib/utils/realtime-connection-manager'
import { createDuplicatePrevention } from '@/lib/utils/duplicate-prevention'
import {
  retryWithBackoff as retryWithErrorHandler,
  getUserFriendlyMessage,
  isOnline,
  DEFAULT_RETRY_CONFIG,
} from '@/lib/utils/error-handler'
import { MessageRow } from '@/lib/types/realtime.types'
import { isMessagePayload } from '@/lib/types/type-guards'

export function useMessagesRealtime(conversationId: string) {
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected')

  // Essential refs only
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const duplicatePreventionRef = useRef(createDuplicatePrevention(5 * 60 * 1000, 1000))
  const lastSendTimeRef = useRef<number>(0)

  // Debug logging for state changes
  useEffect(() => {
    logger.info('🔍 Messages Hook State:', {
      conversationId,
      connectionStatus,
      messagesCount: messages.length,
      isLoading,
      hasError: !!error,
      timestamp: new Date().toISOString(),
    })
  }, [conversationId, connectionStatus, messages.length, isLoading, error])

  // Load messages for conversation
  const loadMessages = useCallback(
    async (skipLoadingState = false) => {
      if (!conversationId) return

      try {
        if (!skipLoadingState) {
          setIsLoading(true)
        }
        setError(null)

        const response = await fetch(`/api/messages/conversations/${conversationId}/messages`)

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(errorData.error || 'Failed to load messages')
        }

        const result = (await response.json()) as {
          success: boolean
          error?: string
          data?: MessageWithSender[]
        }

        if (!result.success) {
          throw new Error(result.error || 'Failed to load messages')
        }

        // Messages come sorted newest first from API, but we need oldest first for display
        const loadedMessages = (result.data || []).reverse() as MessageWithSender[]

        // Simple deduplication: merge with current state (newer data wins)
        setMessages((prev) => {
          const messageMap = new Map<string, MessageWithSender>()

          // Add current messages
          prev.forEach((msg) => {
            messageMap.set(msg.id, msg)
          })

          // Add loaded messages (newer data wins)
          loadedMessages.forEach((msg) => {
            messageMap.set(msg.id, msg)
          })

          // Convert to array and sort by created_at
          return Array.from(messageMap.values()).sort((a, b) => {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          })
        })
      } catch (err) {
        logger.error('Error loading messages:', err)
        const errorMessage = getUserFriendlyMessage(err)
        setError(errorMessage)

        // Retry with exponential backoff for retryable errors
        if (!skipLoadingState) {
          retryWithErrorHandler(
            () => loadMessages(true),
            DEFAULT_RETRY_CONFIG,
            (attempt, error) => {
              logger.warn(`[Messages] Retry loading (attempt ${attempt})`, error)
            }
          ).catch(() => {
            // Final failure - error already set
          })
        }
      } finally {
        if (!skipLoadingState) {
          setIsLoading(false)
        }
      }
    },
    [conversationId]
  )

  // Send message with retry logic and debouncing
  const sendMessage = useCallback(
    async (content: string, attachment?: { url: string; mimeType: string; name: string }) => {
      if (!conversationId) {
        throw new Error('No conversation selected')
      }

      // Debounce rapid sends (prevent spam)
      const now = Date.now()
      const timeSinceLastSend = now - lastSendTimeRef.current
      if (timeSinceLastSend < 100) {
        await new Promise((resolve) => setTimeout(resolve, 100 - timeSinceLastSend))
      }
      lastSendTimeRef.current = Date.now()

      // Validate content
      if (!content || content.trim().length === 0) {
        throw new Error('Message content cannot be empty')
      }

      // Check network status
      if (!isOnline()) {
        throw new Error('No internet connection. Please check your network and try again.')
      }

      // Send with retry logic
      return retryWithErrorHandler(
        async () => {
          const response = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: content.trim(),
              attachment_url: attachment?.url,
              attachment_type: attachment?.mimeType,
            }),
          })

          if (!response.ok) {
            const errorData = (await response.json().catch(() => ({}))) as { error?: string }
            throw new Error(errorData.error || `Failed to send message (${response.status})`)
          }

          const result = (await response.json()) as {
            success: boolean
            error?: string
            data?: MessageWithSender
          }

          if (!result.success) {
            throw new Error(result.error || 'Failed to send message')
          }

          if (!result.data || !result.data.id) {
            throw new Error('Invalid response from server')
          }

          // Optimistically add message - realtime will update it with full data
          const newMessage = result.data

          logger.info('💬 Message sent successfully:', {
            messageId: newMessage.id,
            conversationId: conversationId,
            timestamp: new Date().toISOString(),
          })

          setMessages((prev) => {
            // Simple duplicate check
            if (prev.some((m) => m.id === newMessage.id)) {
              logger.info('ℹ️ Message already in state (probably from realtime):', newMessage.id)
              return prev
            }
            // Add and sort by created_at
            logger.info('✅ Optimistically adding message to state:', newMessage.id)
            return [...prev, newMessage].sort((a, b) => {
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            })
          })

          // Force refetch after 1 second to ensure message appears for recipient
          // This is a safety net in case realtime doesn't deliver immediately
          setTimeout(() => {
            logger.info('🔄 Force refetch after send to ensure delivery')
            loadMessages(true)
          }, 1000)

          return result.data
        },
        DEFAULT_RETRY_CONFIG,
        (attempt, error) => {
          logger.warn(`[Messages] Retry send (attempt ${attempt})`, error)
        }
      ).catch((err) => {
        throw new Error(getUserFriendlyMessage(err))
      })
    },
    [conversationId, loadMessages]
  )

  // Set up realtime subscription for new messages
  useEffect(() => {
    if (!conversationId) {
      setIsLoading(false)
      setConnectionStatus('disconnected')
      return
    }

    let mounted = true
    const supabase = createClient()

    logger.info(`💬 Setting up message realtime for conversation: ${conversationId}`)

    setConnectionStatus('connecting')

    const subscriptionKey = generateSubscriptionKey('messages', conversationId)
    const filter = `conversation_id=eq.${conversationId}`

    const setupSubscription = () => {
      try {
        const channel = realtimeConnectionManager.getChannel(subscriptionKey, () =>
          supabase.channel(subscriptionKey)
        )

        channelRef.current = channel

        // Subscribe to INSERT events (new messages)
        channel
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter,
            },
            async (payload) => {
              if (!mounted) {
                logger.info('❌ Component unmounted, ignoring message')
                return
              }

              try {
                if (!isMessagePayload(payload) || !payload.new) {
                  logger.warn('❌ Invalid message payload received')
                  return
                }
                const newMessage: MessageRow = payload.new

                logger.info('🔥 REALTIME INSERT EVENT RECEIVED:', {
                  messageId: newMessage.id,
                  conversationId: newMessage.conversation_id,
                  expectedConversationId: conversationId,
                  senderId: newMessage.sender_id,
                  timestamp: new Date().toISOString(),
                })
                if (!newMessage.id || newMessage.conversation_id !== conversationId) {
                  logger.info('❌ Message rejected:', {
                    reason: !newMessage?.id ? 'No message ID' : 'Wrong conversation ID',
                    messageId: newMessage?.id,
                    messageConvId: newMessage?.conversation_id,
                    expectedConvId: conversationId,
                  })
                  return
                }

                // Use duplicate prevention utility
                if (duplicatePreventionRef.current.checkAndMark(newMessage.id)) {
                  return
                }

                // Fetch complete message data with sender info
                const { data: messageWithSender, error: fetchError } = await supabase
                  .from('messages')
                  .select(
                    `
                    *,
                    sender:users!messages_sender_id_fkey(
                      id,
                      anonymous_handle,
                      avatar_seed
                    ),
                    reads:message_reads(
                      id,
                      user_id,
                      read_at,
                      user:users!message_reads_user_id_fkey(
                        id,
                        anonymous_handle
                      )
                    ),
                    reactions:message_reactions(
                      id,
                      user_id,
                      emoji,
                      created_at,
                      user:users!message_reactions_user_id_fkey(
                        id,
                        anonymous_handle
                      )
                    )
                  `
                  )
                  .eq('id', newMessage.id)
                  .single()

                if (fetchError || !messageWithSender) {
                  logger.error('Error fetching new message data:', fetchError)
                  duplicatePreventionRef.current.remove(newMessage.id)
                  // Retry loading messages
                  if (mounted) {
                    setTimeout(() => loadMessages(true), 2000)
                  }
                  return
                }

                // Validate message data
                if (
                  !messageWithSender.id ||
                  !messageWithSender.conversation_id ||
                  !messageWithSender.sender_id
                ) {
                  logger.warn('Invalid message data received:', messageWithSender)
                  duplicatePreventionRef.current.remove(newMessage.id)
                  return
                }

                if (messageWithSender.is_deleted) {
                  duplicatePreventionRef.current.remove(newMessage.id)
                  return
                }

                // Simple append with deduplication
                setMessages((prev) => {
                  if (prev.some((m) => m.id === messageWithSender.id)) {
                    // Update existing message
                    logger.info('✅ Updating existing message via realtime:', messageWithSender.id)
                    return prev.map((msg) =>
                      msg.id === messageWithSender.id
                        ? (messageWithSender as MessageWithSender)
                        : msg
                    )
                  }

                  // Add new message and sort
                  logger.info('✅ Adding new message via realtime:', messageWithSender.id)
                  const updated = [...prev, messageWithSender as MessageWithSender].sort((a, b) => {
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                  })
                  logger.info(`📊 Total messages after realtime update: ${updated.length}`)
                  return updated
                })
              } catch (err) {
                logger.error('Error processing new message:', err)
                if (isMessagePayload(payload) && payload.new?.id) {
                  duplicatePreventionRef.current.remove(payload.new.id)
                }
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'messages',
              filter,
            },
            (payload) => {
              if (!mounted) return

              try {
                if (!isMessagePayload(payload) || !payload.new) {
                  return
                }
                const updatedMessage = payload.new as MessageRow
                if (updatedMessage?.id) {
                  // For UPDATE events, we need to fetch the full message with sender info
                  // For now, just update the existing message with the new data
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === updatedMessage.id
                        ? ({ ...msg, ...updatedMessage } as MessageWithSender)
                        : msg
                    )
                  )
                }
              } catch (err) {
                logger.error('Error processing message update:', err)
                if (mounted) loadMessages(true)
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'messages',
              filter,
            },
            (payload) => {
              if (!mounted) return

              try {
                if (!isMessagePayload(payload) || !payload.old) {
                  return
                }
                const deletedMessageId = payload.old.id
                if (deletedMessageId) {
                  setMessages((prev) => prev.filter((msg) => msg.id !== deletedMessageId))
                  duplicatePreventionRef.current.remove(deletedMessageId)
                }
              } catch (err) {
                logger.error('Error processing message deletion:', err)
                if (mounted) loadMessages(true)
              }
            }
          )

        const attemptSubscribe = () =>
          new Promise<void>((resolve, reject) => {
            let resolved = false
            const timeout = setTimeout(() => {
              if (!resolved) {
                resolved = true
                // Don't reject on timeout - polling will handle it
              }
            }, 10000)

            channel.subscribe((status) => {
              logger.info(`💬 Messages realtime status for ${conversationId}:`, status)

              if (status === 'SUBSCRIBED') {
                clearTimeout(timeout)
                logger.info(
                  `✅ Successfully subscribed to messages for conversation ${conversationId}`
                )
                setConnectionStatus('connected')
                setError(null)
                if (!resolved) {
                  resolved = true
                  resolve()
                }
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                clearTimeout(timeout)
                logger.error('💬 Realtime subscription error:', status)
                setConnectionStatus('error')
                setError('Realtime connection issue. Messages may not update in real-time.')
                if (!resolved) {
                  resolved = true
                  reject(new Error(`Realtime channel ${status}`))
                }
              } else if (status === 'CLOSED') {
                setConnectionStatus('disconnected')
              }
            })
          })

        retryWithBackoff(attemptSubscribe, undefined, (attempt, error) => {
          logger.warn(`[Messages] realtime subscribe retry ${attempt}`, error)
        }).catch((error) => {
          logger.error('Failed to subscribe to messages realtime channel:', error)
          setConnectionStatus('error')
          setError('Failed to connect to realtime. Messages may not update in real-time.')
          if (mounted) setIsLoading(false)
        })
      } catch (err) {
        logger.error('Error setting up message realtime subscription:', err)
        setConnectionStatus('error')
        setError(err instanceof Error ? err.message : 'Failed to set up realtime subscription')
        if (mounted) setIsLoading(false)
      }
    }

    setupSubscription()

    // Capture ref values for cleanup
    const duplicatePrevention = duplicatePreventionRef.current
    const channel = channelRef.current
    const pollingInterval = pollingIntervalRef.current

    return () => {
      logger.info(`🔌 Cleaning up message realtime for conversation: ${conversationId}`)
      mounted = false
      setConnectionStatus('disconnected')
      duplicatePrevention.clear()

      if (channel) {
        realtimeConnectionManager.releaseChannel(subscriptionKey, channel)
        channelRef.current = null
      }
      if (pollingInterval) {
        clearInterval(pollingInterval)
        pollingIntervalRef.current = null
      }
    }
  }, [conversationId, loadMessages])

  // Polling fallback when realtime is not connected
  useEffect(() => {
    if (!conversationId) return

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
      logger.info(
        `🔄 Starting enhanced polling fallback (2s interval) for conversation ${conversationId}`
      )
      pollingIntervalRef.current = setInterval(() => {
        if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
          logger.info('🔄 Polling for new messages (realtime unavailable)')
          loadMessages(true)
        }
      }, 2000) // Reduced from 5000ms to 2000ms for faster updates when realtime fails
    } else if (connectionStatus === 'connected') {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [conversationId, connectionStatus, loadMessages])

  // Load messages when conversationId changes
  useEffect(() => {
    if (conversationId) {
      duplicatePreventionRef.current.clear()
      loadMessages(false)
    }
  }, [conversationId, loadMessages])

  // Edit message
  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    const response = await fetch(`/api/messages/${messageId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: newContent }),
    })

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { error?: string }
      throw new Error(getUserFriendlyMessage(errorData.error || 'Failed to edit message'))
    }

    const result = (await response.json()) as {
      success: boolean
      error?: string
      data?: MessageWithSender
    }

    if (!result.success) {
      throw new Error(getUserFriendlyMessage(result.error || 'Failed to edit message'))
    }

    // Update local state
    if (result.data) {
      setMessages((prev) => prev.map((msg) => (msg.id === messageId ? result.data! : msg)))
    }
    return result.data
  }, [])

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    const response = await fetch(`/api/messages/${messageId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { error?: string }
      throw new Error(getUserFriendlyMessage(errorData.error || 'Failed to delete message'))
    }

    // Remove from local state
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
    duplicatePreventionRef.current.remove(messageId)
  }, [])

  // Add reaction
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    const response = await fetch(`/api/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emoji }),
    })

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { error?: string }
      throw new Error(getUserFriendlyMessage(errorData.error || 'Failed to add reaction'))
    }
  }, [])

  // Remove reaction
  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    const response = await fetch(`/api/messages/${messageId}/reactions`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emoji }),
    })

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { error?: string }
      throw new Error(getUserFriendlyMessage(errorData.error || 'Failed to remove reaction'))
    }
  }, [])

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    const response = await fetch(`/api/messages/${messageId}/read`, {
      method: 'POST',
    })

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { error?: string }
      throw new Error(getUserFriendlyMessage(errorData.error || 'Failed to mark message as read'))
    }
  }, [])

  return {
    messages,
    isLoading,
    error,
    connectionStatus,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    markAsRead,
    refetch: loadMessages,
  }
}
