'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
interface UseTypingIndicatorProps {
  conversationId: string | null
  enabled?: boolean
}

export function useTypingIndicator({ conversationId, enabled = true }: UseTypingIndicatorProps) {
  const [isTyping, setIsTyping] = useState(false)
  const supabase = createClient()

  // Debounced stop typing function
  const debouncedStopTyping = useCallback(() => {
    const timeout = setTimeout(() => setIsTyping(false), 1000)
    return () => clearTimeout(timeout)
  }, [])

  // Start typing function
  const startTyping = useCallback(() => {
    if (!conversationId || !enabled) return

    supabase.channel('typing').send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        conversation_id: conversationId,
        is_typing: true,
      },
    })
    setIsTyping(true)
    debouncedStopTyping()
  }, [conversationId, enabled, supabase, debouncedStopTyping])

  // Listen for typing events
  useEffect(() => {
    if (!conversationId || !enabled) return

    const channel = supabase.channel('typing')

    channel.on('broadcast', { event: 'typing' }, (payload) => {
      if (payload.conversation_id === conversationId) {
        // Handle typing events here
      }
    })

    channel.subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [conversationId, enabled, supabase])

  return {
    isTyping,
    startTyping,
    stopTyping: () => {
      setIsTyping(false)
    },
  }
}
