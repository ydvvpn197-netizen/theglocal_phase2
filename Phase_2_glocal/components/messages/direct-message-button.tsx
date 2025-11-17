'use client'

import { logger } from '@/lib/utils/logger'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle, Loader2 } from 'lucide-react'
import { useMessages } from '@/lib/context/messages-context'
import { useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'

interface DirectMessageButtonProps {
  userId: string
  userHandle: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'sm' | 'default' | 'lg'
  className?: string
  showIcon?: boolean
  children?: React.ReactNode
}

export function DirectMessageButton({
  userId,
  userHandle: _userHandle,
  variant = 'outline',
  size = 'sm',
  className,
  showIcon = true,
  children,
}: DirectMessageButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { createConversationAndOpen, createConversation, openModalWithConversation } = useMessages()
  const { toast } = useToast()

  const handleDirectMessage = async () => {
    if (isLoading) return

    try {
      setIsLoading(true)

      // Use createConversationAndOpen if available, otherwise fallback to createConversation
      if (createConversationAndOpen) {
        await createConversationAndOpen(userId)
        // Modal will open automatically via context
      } else {
        // Fallback: create conversation and manually open modal
        const conversation = await createConversation(userId)
        // Try to open modal if method exists
        if (openModalWithConversation) {
          openModalWithConversation(conversation.id)
        }
      }

      // Don't show toast if modal opens automatically - the modal opening is feedback enough
    } catch (error) {
      logger.error('Error creating conversation:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to start conversation. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDirectMessage}
      disabled={isLoading}
      className={cn(className)}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        showIcon && <MessageCircle className="h-4 w-4" />
      )}
      {children || 'Message'}
    </Button>
  )
}
