'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { MessagesContextType, Conversation, TypingUser } from '@/lib/types/messages.types'
import { useConversationsRealtime } from '@/lib/hooks/use-conversations-realtime'
import { useUserPresence } from '@/lib/hooks/use-user-presence'

const MessagesContext = createContext<MessagesContextType | undefined>(undefined)

interface MessagesProviderProps {
  children: React.ReactNode
}

export function MessagesProvider({ children }: MessagesProviderProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingUser[]>>({})
  const [isReady, setIsReady] = useState(false)

  const { conversations, createConversation: createConversationHook } = useConversationsRealtime()
  const { presenceMap, updatePresence } = useUserPresence()

  // Calculate unread count from conversations with enhanced validation
  useEffect(() => {
    if (!Array.isArray(conversations)) {
      console.warn('Invalid conversations array in context:', conversations)
      setUnreadCount(0)
      setIsReady(true) // Mark as ready even with invalid data
      return
    }

    const totalUnread = conversations.reduce((sum, conv) => {
      if (!conv || typeof conv !== 'object') {
        console.warn('Invalid conversation object:', conv)
        return sum
      }
      
      const unreadCount = conv.unread_count
      if (typeof unreadCount === 'number' && unreadCount >= 0) {
        return sum + unreadCount
      }
      
      return sum
    }, 0)
    
    setUnreadCount(Math.max(0, totalUnread)) // Ensure non-negative
    setIsReady(true) // Mark as ready after processing conversations
  }, [conversations])

  // Ensure context is ready even when conversations are empty
  useEffect(() => {
    if (conversations === undefined || conversations === null) {
      setIsReady(false)
    }
  }, [conversations])

  // Open conversation
  const openConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId)
  }, [])

  // Close conversation
  const closeConversation = useCallback(() => {
    setActiveConversationId(null)
  }, [])

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/read`, {
        method: 'POST'
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to mark message as read')
      }
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  }, [])

  // Set typing status for a conversation
  const setTyping = useCallback((conversationId: string, isTyping: boolean) => {
    // Enhanced validation for conversation ID
    if (!conversationId || typeof conversationId !== 'string') {
      console.warn('Invalid conversationId for typing status:', conversationId)
      return
    }

    setTypingUsers(prev => {
      const current = Array.isArray(prev[conversationId]) ? prev[conversationId] : []
      
      if (isTyping) {
        // Check if user is already typing
        const existingTypingUser = current.find(u => u.user_id === 'current_user')
        if (existingTypingUser) {
          // Update timestamp if already typing
          return {
            ...prev,
            [conversationId]: current.map(u => 
              u.user_id === 'current_user' 
                ? { ...u, timestamp: Date.now() }
                : u
            )
          }
        }

        // Add current user to typing list with validation
        const newTypingUser: TypingUser = {
          user_id: 'current_user', // This would be replaced with actual user ID
          user_handle: 'You',
          conversation_id: conversationId,
          is_typing: true,
          timestamp: Date.now()
        }
        
        return {
          ...prev,
          [conversationId]: [...current, newTypingUser]
        }
      } else {
        // Remove current user from typing list
        const filtered = current.filter(u => u && u.user_id !== 'current_user')
        return {
          ...prev,
          [conversationId]: filtered
        }
      }
    })
  }, [])

  // Create conversation with another user
  const createConversation = useCallback(async (userId: string): Promise<Conversation> => {
    return await createConversationHook(userId)
  }, [createConversationHook])

  const value: MessagesContextType = {
    unreadCount,
    activeConversationId,
    presenceMap,
    typingUsers,
    isReady,
    openConversation,
    closeConversation,
    markAsRead,
    updatePresence,
    setTyping,
    createConversation
  }

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  )
}

export function useMessages() {
  const context = useContext(MessagesContext)
  if (context === undefined) {
    // Return safe defaults instead of throwing
    console.warn('useMessages called outside MessagesProvider')
    return {
      unreadCount: 0,
      activeConversationId: null,
      presenceMap: {},
      typingUsers: {},
      isReady: false,
      openConversation: () => {},
      closeConversation: () => {},
      markAsRead: async () => {},
      updatePresence: () => {},
      setTyping: () => {},
      createConversation: async () => ({ id: '', created_at: '', updated_at: '', participant_1_id: '', participant_2_id: '', last_message_at: null, unread_count: 0 })
    }
  }
  return context
}
