'use client'

import { useEffect, useRef, useState } from 'react'
import { useMessagesRealtime } from '@/lib/hooks/use-messages-realtime'
import { useTypingIndicator } from '@/lib/hooks/use-typing-indicator'
import { TypingUser, Conversation } from '@/lib/types/messages.types'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'
import { TypingIndicator } from './typing-indicator'
import { groupMessagesByDate, getConversationPartner } from '@/lib/utils/message-helpers'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { format } from 'date-fns'
import { useAuth } from '@/lib/context/auth-context'

interface MessageThreadProps {
  conversationId: string | null
  conversation?: {
    participant_1?: { id: string }
    participant_2?: { id: string }
  }
  className?: string
}

export function MessageThread({ conversationId, conversation, className }: MessageThreadProps) {
  const { user } = useAuth()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [_editingMessage, setEditingMessage] = useState<string | null>(null)

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    markAsRead,
  } = useMessagesRealtime(conversationId || '')

  // Use the destructured variables to avoid unused warnings
  void isLoading
  void error
  void sendMessage
  void editMessage
  void deleteMessage
  void addReaction
  void removeReaction
  void markAsRead

  const {
    isTyping: _isTyping,
    startTyping: _startTyping,
    stopTyping: _stopTyping,
  } = useTypingIndicator({
    conversationId,
    enabled: !!conversationId,
  })

  // Add missing state for typing
  const [typingUsers, _setTypingUsers] = useState<TypingUser[]>([])
  const setTyping = (_isTyping: boolean) => {
    // Implementation for setTyping
  }

  // Get the other participant
  const otherUser = conversation
    ? getConversationPartner(conversation as unknown as Conversation, user?.id || '')
    : null
  const otherUserId = otherUser?.id || ''

  // Group messages by date
  const groupedMessages = groupMessagesByDate(messages)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Mark messages as read when conversation is active
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      const lastMessage = messages[messages.length - 1] // Messages are sorted oldest first

      // Ensure lastMessage exists and is not from current user
      if (lastMessage && lastMessage.sender_id !== user?.id) {
        markAsRead(lastMessage.id)
      }
    }
  }, [conversationId, messages, user?.id, markAsRead])

  const handleSendMessage = async (
    content: string,
    attachmentUrl?: string,
    attachmentType?: string
  ) => {
    if (!conversationId) return
    await sendMessage(
      content,
      attachmentUrl ? { url: attachmentUrl, mimeType: attachmentType || '', name: '' } : undefined
    )
  }

  const handleEditMessage = async (messageId: string, content: string) => {
    await editMessage(messageId, content)
    setEditingMessage(null)
  }

  const handleDeleteMessage = async (messageId: string) => {
    await deleteMessage(messageId)
  }

  const handleAddReaction = async (messageId: string, emoji: string) => {
    await addReaction(messageId, emoji)
  }

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    await removeReaction(messageId, emoji)
  }

  const handleTypingChange = (isTyping: boolean) => {
    setTyping(isTyping)
  }

  const handleLoadMore = () => {
    // Load more functionality can be added later
  }

  if (!conversationId) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 mx-auto">
            <span className="text-2xl">💬</span>
          </div>
          <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
          <p className="text-muted-foreground">
            Choose a conversation from the list to start messaging
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="flex-1">
          <h3 className="font-semibold">{otherUser?.anonymous_handle || 'Unknown User'}</h3>
          <p className="text-sm text-muted-foreground">
            {otherUser?.location_city || 'Unknown location'}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 flex flex-col min-h-0">
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="p-4 space-y-4">
            {/* Load more button - disabled for now */}
            {false && (
              <div className="flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isLoading ? 'Loading...' : 'Load more messages'}
                </button>
              </div>
            )}

            {/* Messages grouped by date */}
            {Object.entries(groupedMessages).map(([date, messages]) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex items-center gap-4 my-4">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground bg-background px-2">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </span>
                  <Separator className="flex-1" />
                </div>

                {/* Messages for this date */}
                <div className="space-y-4">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.sender_id === user?.id}
                      otherUserId={otherUserId}
                      onEdit={handleEditMessage}
                      onDelete={handleDeleteMessage}
                      onAddReaction={handleAddReaction}
                      onRemoveReaction={handleRemoveReaction}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Empty state */}
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                  <span className="text-xl">💬</span>
                </div>
                <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
              </div>
            )}

            {/* Loading state */}
            {isLoading && messages.length === 0 && (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="text-center text-destructive">
                <p>{error}</p>
              </div>
            )}

            {/* Typing indicator */}
            <TypingIndicator typingUsers={typingUsers} />

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message input */}
        <div className="p-4 border-t">
          <MessageInput
            onSendMessage={handleSendMessage}
            onTypingChange={handleTypingChange}
            placeholder={`Message ${otherUser?.anonymous_handle || 'user'}...`}
          />
        </div>
      </div>
    </div>
  )
}
