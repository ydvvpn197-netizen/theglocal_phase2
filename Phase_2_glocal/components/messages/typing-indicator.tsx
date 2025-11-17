'use client'

import { TypingUser } from '@/lib/types/messages.types'
import { getTypingIndicatorText } from '@/lib/utils/message-helpers'
import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  typingUsers: TypingUser[]
  className?: string
}

export function TypingIndicator({ typingUsers, className }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null

  const text = getTypingIndicatorText(typingUsers)

  return (
    <div
      className={cn('flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground', className)}
    >
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
      </div>
      <span className="italic">{text}</span>
    </div>
  )
}
