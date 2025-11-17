'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ConversationList } from '@/components/messages/conversation-list'
import { MessageThread } from '@/components/messages/message-thread'
import { UserSearchDialog } from '@/components/messages/user-search-dialog'
import { useConversationsRealtime } from '@/lib/hooks/use-conversations-realtime'
import { useMessages } from '@/lib/context/messages-context'
import { useAuth } from '@/lib/context/auth-context'
import { Conversation } from '@/lib/types/messages.types'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus } from 'lucide-react'

export default function MessagesPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [showSearch, setShowSearch] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const { activeConversationId, openConversation, closeConversation } = useMessages()
  const { conversations } = useConversationsRealtime({ userId: user?.id || null })

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  const handleSelectConversation = (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId)
    if (conversation) {
      setSelectedConversation(conversation)
      openConversation(conversationId)
    }
  }

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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return null // Will redirect
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Messages</h1>
            <p className="text-muted-foreground">Connect with other users on the platform</p>
          </div>
          <Button onClick={handleCreateConversation}>
            <Plus className="h-4 w-4 mr-2" />
            New Conversation
          </Button>
        </div>

        {/* Desktop: Two-column layout */}
        <div className="hidden md:flex h-[calc(100vh-200px)] border rounded-lg overflow-hidden">
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
        <div className="md:hidden space-y-4">
          {!selectedConversation ? (
            /* Conversations list on mobile */
            <div className="h-[calc(100vh-200px)] border rounded-lg overflow-hidden">
              <ConversationList
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onCreateConversation={handleCreateConversation}
              />
            </div>
          ) : (
            /* Message thread on mobile */
            <div className="h-[calc(100vh-200px)] border rounded-lg overflow-hidden flex flex-col">
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

      {/* User search dialog */}
      <UserSearchDialog
        open={showSearch}
        onOpenChange={setShowSearch}
        onUserSelect={handleUserSelect}
      />
    </div>
  )
}
