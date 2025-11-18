/**
 * Helper utilities for the messaging system
 */

import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns'
import {
  Message,
  MessageWithSender,
  Conversation,
  User,
  UserPresence,
} from '../types/messages.types'
import { TIME_CONSTANTS } from './constants'

/**
 * Format message timestamp with smart formatting
 */
export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp)

  if (isToday(date)) {
    return format(date, 'h:mm a')
  } else if (isYesterday(date)) {
    return 'Yesterday'
  } else if (isThisWeek(date)) {
    return format(date, 'EEEE')
  } else if (isThisYear(date)) {
    return format(date, 'MMM d')
  } else {
    return format(date, 'MMM d, yyyy')
  }
}

/**
 * Format relative time (e?.g., "2 minutes ago")
 */
export function formatRelativeTime(timestamp: string): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
}

/**
 * Get the other participant in a conversation
 */
export function getConversationPartner(
  conversation: Conversation,
  currentUserId: string
): User | null {
  if (conversation?.participant_1_id === currentUserId) {
    return conversation?.participant_2 || null
  } else if (conversation?.participant_2_id === currentUserId) {
    return conversation?.participant_1 || null
  }
  return null
}

/**
 * Group messages by date for display
 */
export function groupMessagesByDate(
  messages: MessageWithSender[]
): Record<string, MessageWithSender[]> {
  const groups: Record<string, MessageWithSender[]> = {}

  messages?.forEach((message) => {
    const date = new Date(message?.created_at)
    const dateKey = format(date, 'yyyy-MM-dd')

    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(message)
  })

  return groups
}

/**
 * Check if a message can be edited (within time window)
 */
export function canEditMessage(message: Message | MessageWithSender): boolean {
  if (message?.is_deleted) return false

  const messageTime = new Date(message?.created_at)
  const now = new Date()
  const diffMinutes = (now?.getTime() - messageTime?.getTime()) / (1000 * 60)

  return diffMinutes <= TIME_CONSTANTS?.MESSAGE_EDIT_WINDOW_MINUTES
}

/**
 * Check if a message can be deleted (only sender, not too old)
 *
 * Note: Messages use sender_id instead of author_id, so they follow a similar pattern
 * to the generic permission system but with a different field name.
 */
export function canDeleteMessage(
  message: Message | MessageWithSender,
  currentUserId: string
): boolean {
  // Only the sender can delete their own message (and it must not be already deleted)
  return message?.sender_id === currentUserId && !message?.is_deleted
}

/**
 * Get unread message count for a conversation
 */
export function getUnreadCount(conversation: Conversation, _currentUserId: string): number {
  return conversation?.unread_count || 0
}

/**
 * Check if a message has been read by a specific user
 */
export function isMessageReadByUser(message: Message | MessageWithSender, userId: string): boolean {
  return (
    message?.reads?.some((read: unknown) => {
      if (read && typeof read === 'object' && 'user_id' in read) {
        return (read as { user_id: string }).user_id === userId
      }
      return false
    }) || false
  )
}

/**
 * Get read status for a message (sent, delivered, read)
 */
export function getMessageStatus(
  message: Message | MessageWithSender,
  currentUserId: string,
  otherUserId: string
): 'sending' | 'sent' | 'delivered' | 'read' {
  if (message?.sender_id !== currentUserId) {
    return 'sent' // Not our message
  }

  const isReadByOther = isMessageReadByUser(message, otherUserId)
  if (isReadByOther) {
    return 'read'
  }

  // For now, assume delivered if not read (in real implementation, you'd track delivery)
  return 'delivered'
}

/**
 * Get the most recent message preview for a conversation
 */
export function getLastMessagePreview(conversation: Conversation): string {
  if (!conversation?.last_message) {
    return 'No messages yet'
  }

  const message = conversation?.last_message
  if (message?.is_deleted) {
    return 'Message deleted'
  }

  if (message?.attachment_url) {
    const attachmentType = message?.attachment_type || 'file'
    return `📎 ${attachmentType === 'image' ? 'Photo' : 'File'}`
  }

  return message?.content.length > 50 ? message?.content.substring(0, 50) + '...' : message?.content
}

/**
 * Get user's online status with last seen info
 */
export function getUserPresenceInfo(presence: UserPresence | null): {
  status: 'online' | 'away' | 'offline'
  lastSeen: string | null
  isOnline: boolean
} {
  if (!presence) {
    return {
      status: 'offline',
      lastSeen: null,
      isOnline: false,
    }
  }

  const isOnline = presence?.status === 'online'
  const lastSeen = isOnline ? null : formatRelativeTime(presence?.last_seen_at)

  return {
    status: presence?.status,
    lastSeen,
    isOnline,
  }
}

/**
 * Get typing indicator text
 */
export function getTypingIndicatorText(typingUsers: Array<{ user_handle: string }>): string {
  if (typingUsers?.length === 0) return ''

  if (typingUsers?.length === 1) {
    const firstUser = typingUsers[0]
    return firstUser ? `${firstUser?.user_handle} is typing...` : ''
  } else if (typingUsers?.length === 2) {
    const firstUser = typingUsers[0]
    const secondUser = typingUsers[1]
    return firstUser && secondUser
      ? `${firstUser?.user_handle} and ${secondUser?.user_handle} are typing...`
      : `${typingUsers?.length} people are typing...`
  } else {
    return `${typingUsers?.length} people are typing...`
  }
}

/**
 * Sanitize message content to prevent XSS
 */
export function sanitizeMessageContent(content: string): string {
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate message content
 */
export function validateMessageContent(content: string): { isValid: boolean; error?: string } {
  if (!content || content?.trim().length === 0) {
    return { isValid: false, error: 'Message cannot be empty' }
  }

  if (content?.length > 2000) {
    return { isValid: false, error: 'Message is too long (max 2000 characters)' }
  }

  return { isValid: true }
}

/**
 * Validate file attachment
 */
export function validateAttachment(file: File): { isValid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const allowedFileTypes = [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd?.openxmlformats-officedocument?.wordprocessingml.document',
  ]

  if (file?.size > maxSize) {
    return { isValid: false, error: 'File is too large (max 10MB)' }
  }

  const isImage = allowedImageTypes?.includes(file?.type)
  const isFile = allowedFileTypes?.includes(file?.type)

  if (!isImage && !isFile) {
    return { isValid: false, error: 'File type not supported' }
  }

  return { isValid: true }
}

/**
 * Get attachment type from file
 */
export function getAttachmentType(file: File): 'image' | 'file' {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  return imageTypes?.includes(file?.type) ? 'image' : 'file'
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math?.floor(Math?.log(bytes) / Math?.log(k))

  return parseFloat((bytes / Math?.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Generate conversation title for display
 */
export function getConversationTitle(conversation: Conversation, currentUserId: string): string {
  const partner = getConversationPartner(conversation, currentUserId)
  return partner?.anonymous_handle || 'Unknown User'
}

/**
 * Check if user is typing in a conversation
 */
export function isUserTyping(
  conversationId: string,
  userId: string,
  typingUsers: Array<{ conversation_id: string; user_id: string }>
): boolean {
  return typingUsers?.some(
    (user) => user?.conversation_id === conversationId && user?.user_id === userId
  )
}

/**
 * Debounce function for typing indicators
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * Generate avatar URL from seed (using existing avatar system)
 */
export function getAvatarUrl(seed: string, size: number = 40): string {
  return `https://api?.dicebear.com/7?.x/avataaars/svg?seed=${seed}&size=${size}`
}

/**
 * Check if message contains only emojis
 */
export function isOnlyEmojis(text: string): boolean {
  // Simple emoji detection - check if text contains only emoji characters
  const trimmed = text?.trim()
  if (trimmed?.length === 0) return false

  // Check if all characters are emojis or whitespace
  for (let i = 0; i < trimmed?.length; i++) {
    const char = trimmed[i]
    const code = char?.codePointAt(0)
    if (!code) return false

    // Check if it's an emoji (simplified check)
    if (code < 0x1f600 || code > 0x1f9ff) {
      if (code < 0x2600 || code > 0x27bf) {
        if (code < 0x1f300 || code > 0x1f5ff) {
          if (code < 0x1f680 || code > 0x1f6ff) {
            if (code < 0x1f1e0 || code > 0x1f1ff) {
              return false
            }
          }
        }
      }
    }
  }

  return true
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text?.length <= maxLength) return text
  return text?.substring(0, maxLength) + '...'
}
