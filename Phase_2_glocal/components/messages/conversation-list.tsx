'use client'

import { Conversation } from '@/lib/types/messages.types'
import {
  getConversationTitle,
  getLastMessagePreview,
  getUnreadCount,
  getAvatarUrl,
  formatMessageTime,
} from '@/lib/utils/message-helpers'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OnlineStatusBadge } from './online-status-badge'
import { useMessages } from '@/lib/context/messages-context'
import { useAuth } from '@/lib/context/auth-context'

interface ConversationListProps {
  conversations: Conversation[]
  activeConversationId: string | null
  onSelectConversation: (conversationId: string) => void
  onCreateConversation: () => void
  className?: string
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
  className,
}: ConversationListProps) {
  const { presenceMap } = useMessages()
  const { user } = useAuth()
  const currentUserId = user?.id || ''

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Messages</h2>
        <Button onClick={onCreateConversation} size="sm">
          New Chat
        </Button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
            <p className="text-muted-foreground mb-4">
              Start a conversation with someone to begin messaging
            </p>
            <Button onClick={onCreateConversation}>Start a conversation</Button>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId
              const title = getConversationTitle(conversation, currentUserId)
              const lastMessage = getLastMessagePreview(conversation)
              const unreadCount = getUnreadCount(conversation, currentUserId)
              const partner = conversation.participant_1 || conversation.participant_2
              const presence = partner?.id
                ? (
                    presenceMap as Record<string, import('@/lib/types/messages.types').UserPresence>
                  )[partner.id] || null
                : null

              return (
                <button
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-muted/50',
                    isActive && 'bg-muted'
                  )}
                >
                  {/* Avatar with online status */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={getAvatarUrl(partner?.avatar_seed || 'default')} />
                      <AvatarFallback>
                        {partner?.anonymous_handle?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <OnlineStatusBadge
                      presence={presence || null}
                      size="sm"
                      className="absolute -bottom-1 -right-1"
                    />
                  </div>

                  {/* Conversation info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium truncate">{title}</h3>
                      {conversation.last_message_at && (
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {formatMessageTime(conversation.last_message_at)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">{lastMessage}</p>
                      {unreadCount > 0 && (
                        <Badge variant="default" className="ml-2 flex-shrink-0">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
