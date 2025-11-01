'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ConversationList } from './conversation-list'
import { MessageThread } from './message-thread'
import { UserSearchDialog } from './user-search-dialog'
import { useConversationsRealtime } from '@/lib/hooks/use-conversations-realtime'
import { useMessages } from '@/lib/context/messages-context'
import { Conversation } from '@/lib/types/messages.types'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface MessagesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialConversationId?: string
}

export function MessagesModal({ open, onOpenChange, initialConversationId }: MessagesModalProps) {
  const [showSearch, setShowSearch] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const { activeConversationId, openConversation, closeConversation } = useMessages()
  const { conversations } = useConversationsRealtime()

  const handleSelectConversation = useCallback((conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId)
    if (conversation) {
      setSelectedConversation(conversation)
      openConversation(conversationId)
    }
  }, [conversations, setSelectedConversation, openConversation])

  // Handle initial conversation selection
  useEffect(() => {
    if (open && initialConversationId) {
      handleSelectConversation(initialConversationId)
    }
  }, [open, initialConversationId, handleSelectConversation])

  const handleCreateConversation = () => {
    setShowSearch(true)
  }

  const handleUserSelect = (conversation: Conversation) => {
    setShowSearch(false)
    // Automatically open the newly created conversation
    setSelectedConversation(conversation)
    openConversation(conversation.id)
  }

  const handleBackToList = () => {
    setSelectedConversation(null)
    closeConversation()
  }

  const handleClose = () => {
    onOpenChange(false)
    setSelectedConversation(null)
    setShowSearch(false)
    closeConversation()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="h-[80vh] w-[90vw] max-w-6xl p-0">
          <div className="flex h-full">
            {/* Desktop: Two-column layout */}
            <div className="hidden md:flex flex-1">
              {/* Conversations list */}
              <div className="w-80 border-r">
                <ConversationList
                  conversations={conversations}
                  activeConversationId={activeConversationId}
                  onSelectConversation={handleSelectConversation}
                  onCreateConversation={handleCreateConversation}
                />
              </div>

              {/* Message thread */}
              <div className="flex-1">
                <MessageThread
                  conversationId={activeConversationId}
                  conversation={selectedConversation || undefined}
                />
              </div>
            </div>

            {/* Mobile: Single column with navigation */}
            <div className="md:hidden flex flex-col w-full">
              {!selectedConversation ? (
                /* Conversations list on mobile */
                <ConversationList
                  conversations={conversations}
                  activeConversationId={activeConversationId}
                  onSelectConversation={handleSelectConversation}
                  onCreateConversation={handleCreateConversation}
                />
              ) : (
                /* Message thread on mobile */
                <div className="flex flex-col h-full">
                  {/* Mobile header */}
                  <div className="flex items-center gap-3 p-4 border-b">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBackToList}
                      className="flex-shrink-0"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {selectedConversation.participant_1?.anonymous_handle || 
                         selectedConversation.participant_2?.anonymous_handle || 
                         'Unknown User'}
                      </h3>
                    </div>
                  </div>

                  {/* Message thread */}
                  <div className="flex-1 min-h-0">
                    <MessageThread
                      conversationId={selectedConversation.id}
                      conversation={selectedConversation}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User search dialog */}
      <UserSearchDialog
        open={showSearch}
        onOpenChange={setShowSearch}
        onUserSelect={handleUserSelect}
      />
    </>
  )
}
