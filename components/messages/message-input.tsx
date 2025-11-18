'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { CONTENT_LIMITS } from '@/lib/utils/constants'
import {
  validateMessageContent,
  validateAttachment,
  getAttachmentType,
} from '@/lib/utils/message-helpers'
import { Send, Paperclip, X } from 'lucide-react'
import { useToast } from '@/lib/hooks/use-toast'

interface MessageInputProps {
  onSendMessage: (content: string, attachmentUrl?: string, attachmentType?: string) => void
  onTypingChange?: (isTyping: boolean) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function MessageInput({
  onSendMessage,
  onTypingChange,
  disabled = false,
  placeholder = 'Type a message...',
  className,
}: MessageInputProps) {
  const [content, setContent] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleContentChange = (value: string) => {
    setContent(value)

    // Handle typing indicator
    if (onTypingChange) {
      if (!isTyping && value.trim().length > 0) {
        setIsTyping(true)
        onTypingChange(true)
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
        onTypingChange(false)
      }, 3000)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validation = validateAttachment(file)
    if (!validation.isValid) {
      toast({
        title: 'Invalid file',
        description: validation.error,
        variant: 'destructive',
      })
      return
    }

    setAttachment(file)
  }

  const removeAttachment = () => {
    setAttachment(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadAttachment = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload/message-attachment', {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to upload attachment')
    }

    return result.data.url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (disabled || !content.trim()) return

    // Validate content
    const validation = validateMessageContent(content)
    if (!validation.isValid) {
      toast({
        title: 'Invalid message',
        description: validation.error,
        variant: 'destructive',
      })
      return
    }

    try {
      setIsUploading(true)

      let attachmentUrl: string | undefined
      let attachmentType: string | undefined

      // Upload attachment if present
      if (attachment) {
        attachmentUrl = await uploadAttachment(attachment)
        attachmentType = getAttachmentType(attachment)
      }

      // Send message
      onSendMessage(content.trim(), attachmentUrl, attachmentType)

      // Reset form
      setContent('')
      setAttachment(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Stop typing
      if (isTyping) {
        setIsTyping(false)
        onTypingChange?.(false)
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    } catch (error) {
      logger.error('Error sending message:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const canSend = content.trim().length > 0 && !isUploading && !disabled
  const remainingChars = CONTENT_LIMITS.MESSAGE_MAX - content.length

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-2', className)}>
      {/* Attachment preview */}
      {attachment && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm flex-1 truncate">{attachment.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={removeAttachment}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isUploading}
            className="min-h-[40px] max-h-32 resize-none pr-12"
            rows={1}
          />

          {/* File input button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        </div>

        <Button type="submit" disabled={!canSend} size="sm" className="px-3">
          {isUploading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept="image/*,.pdf,.txt,.doc,.docx"
        className="hidden"
      />

      {/* Character counter */}
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>
          {remainingChars < 50 && (
            <span className={cn(remainingChars < 0 ? 'text-destructive' : 'text-yellow-600')}>
              {remainingChars} characters remaining
            </span>
          )}
        </span>
        <span>
          {content.length}/{CONTENT_LIMITS.MESSAGE_MAX}
        </span>
      </div>
    </form>
  )
}
