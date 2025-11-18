'use client'

import { useState, useEffect, memo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessagesModal } from './messages-modal'
import { useMessages } from '@/lib/context/messages-context'
import { MessageCircle } from 'lucide-react'
import { NavbarIconSkeleton } from '@/components/layout/navbar-icons-skeleton'

function MessagesIconComponent() {
  const [localModalOpen, setLocalModalOpen] = useState(false)
  const {
    unreadCount,
    isReady,
    isModalOpen: contextModalOpen,
    openModal,
    closeModal,
    pendingConversationId,
  } = useMessages()
  const searchParams = useSearchParams()
  const router = useRouter()
  const conversationId = searchParams.get('conversation')

  // Determine if modal should be open (context state takes precedence)
  const isModalOpen = contextModalOpen !== undefined ? contextModalOpen : localModalOpen

  // Sync with context state
  useEffect(() => {
    if (contextModalOpen !== undefined) {
      setLocalModalOpen(contextModalOpen)
    }
  }, [contextModalOpen])

  // Handle conversation ID from URL params
  useEffect(() => {
    if (conversationId && isReady) {
      setLocalModalOpen(true)
      if (openModal) {
        openModal()
      }
      // Clear the search param after opening
      const currentPath = window.location.pathname
      router.replace(currentPath, { scroll: false })
    }
  }, [conversationId, router, isReady, openModal])

  const handleOpenModal = () => {
    setLocalModalOpen(true)
    if (openModal) {
      openModal()
    }
  }

  const handleCloseModal = (open: boolean) => {
    setLocalModalOpen(open)
    if (!open && closeModal) {
      closeModal()
    }
  }

  // Show loading state while context is initializing
  if (!isReady) {
    return <NavbarIconSkeleton />
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpenModal}
        className="relative"
        aria-label={`Messages${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <MessageCircle className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            aria-hidden="true"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      <MessagesModal
        open={isModalOpen}
        onOpenChange={handleCloseModal}
        initialConversationId={conversationId || pendingConversationId || undefined}
      />
    </>
  )
}

export const MessagesIcon = memo(MessagesIconComponent)
