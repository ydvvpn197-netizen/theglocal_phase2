'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MessageWithSender } from '@/lib/types/messages.types'
import {
  formatMessageTime,
  canEditMessage,
  canDeleteMessage,
  getMessageStatus,
  getAvatarUrl,
} from '@/lib/utils/message-helpers'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Check,
  CheckCheck,
  Smile,
  Edit,
  Trash2,
  Copy,
  Download,
} from 'lucide-react'
import { useToast } from '@/lib/hooks/use-toast'

interface MessageBubbleProps {
  message: MessageWithSender
  isOwn: boolean
  otherUserId: string
  onEdit?: (messageId: string, content: string) => void
  onDelete?: (messageId: string) => void
  onAddReaction?: (messageId: string, emoji: string) => void
  onRemoveReaction?: (messageId: string, emoji: string) => void
  className?: string
}

export function MessageBubble({
  message,
  isOwn,
  otherUserId,
  onEdit,
  onDelete,
  onAddReaction,
  onRemoveReaction,
  className,
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false)
  const { toast } = useToast()

  const canEdit = canEditMessage(message)
  const canDelete = canDeleteMessage(message, message.sender_id)
  const messageStatus = getMessageStatus(message, message.sender_id, otherUserId)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      toast({
        title: 'Message copied',
        description: 'Message content copied to clipboard',
      })
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy message to clipboard',
        variant: 'destructive',
      })
    }
  }

  const handleDownload = () => {
    if (message.attachment_url) {
      const link = document.createElement('a')
      link.href = message.attachment_url
      link.download = message.attachment_type || 'download'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleReactionClick = (emoji: string) => {
    if (message.reactions?.some((r) => r.emoji === emoji && r.user_id === message.sender_id)) {
      onRemoveReaction?.(message.id, emoji)
    } else {
      onAddReaction?.(message.id, emoji)
    }
  }

  return (
    <div
      className={cn(
        'flex gap-2 max-w-[80%]',
        isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto',
        className
      )}
    >
      {!isOwn && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={getAvatarUrl(message.sender.avatar_seed)} />
          <AvatarFallback>{message.sender?.anonymous_handle?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
      )}

      <div className={cn('flex flex-col gap-1', isOwn ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'px-3 py-2 rounded-2xl text-sm',
            isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted',
            message.attachment_url && 'p-0 overflow-hidden'
          )}
        >
          {message.attachment_url ? (
            <div className="relative">
              <Image
                src={message.attachment_url}
                alt={message.attachment_type || 'Message attachment'}
                width={200}
                height={200}
                className="rounded-lg"
                sizes="200px"
                loading="lazy"
                quality={80}
              />
              {message.attachment_type && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2">
                  {message.attachment_type}
                </div>
              )}
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        <div
          className={cn(
            'flex items-center gap-1 text-xs text-muted-foreground',
            isOwn ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <span>{formatMessageTime(message.created_at)}</span>

          {isOwn && (
            <div className="flex items-center">
              {messageStatus === 'sent' && <Check className="h-3 w-3" />}
              {messageStatus === 'delivered' && <CheckCheck className="h-3 w-3" />}
              {messageStatus === 'read' && <CheckCheck className="h-3 w-3 text-blue-500" />}
            </div>
          )}
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.reactions?.map((reaction, index) => {
              const count = message.reactions?.filter((r) => r.emoji === reaction.emoji).length || 0
              return (
                <button
                  key={index}
                  onClick={() => handleReactionClick(reaction.emoji)}
                  className={cn(
                    'px-2 py-1 text-xs rounded-full bg-muted hover:bg-muted/80 transition-colors',
                    reaction.user_id === message.sender_id && 'bg-primary/20'
                  )}
                >
                  {reaction.emoji} {count > 1 && count}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isOwn ? 'end' : 'start'}>
          <DropdownMenuItem onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </DropdownMenuItem>

          {message.attachment_url && (
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={() => setShowReactions(!showReactions)}>
            <Smile className="h-4 w-4 mr-2" />
            Add Reaction
          </DropdownMenuItem>

          {canEdit && onEdit && (
            <DropdownMenuItem onClick={() => onEdit(message.id, message.content)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
          )}

          {canDelete && onDelete && (
            <DropdownMenuItem onClick={() => onDelete(message.id)} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
