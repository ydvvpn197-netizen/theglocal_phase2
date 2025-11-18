/**
 * TypeScript types for the messaging system
 */

export interface Conversation {
  id: string
  participant_1_id: string
  participant_2_id: string
  last_message_at: string | null
  created_at: string
  updated_at: string
  // Joined data
  participant_1?: User
  participant_2?: User
  last_message?: Message
  unread_count?: number
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  attachment_url: string | null
  attachment_type: string | null
  is_edited: boolean
  edited_at: string | null
  is_deleted: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
  // Joined data
  sender?: User
  reads?: MessageRead[]
  reactions?: MessageReaction[]
}

export interface MessageWithSender extends Omit<Message, 'sender'> {
  sender: {
    id: string
    anonymous_handle: string
    avatar_seed: string
  }
}

export interface MessageRead {
  id: string
  message_id: string
  user_id: string
  read_at: string
  // Joined data
  user?: User
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
  // Joined data
  user?: User
}

export interface UserPresence {
  user_id: string
  status: 'online' | 'away' | 'offline'
  last_seen_at: string
  updated_at: string
  // Joined data
  user?: User
}

export interface User {
  id: string
  email: string
  phone: string | null
  anonymous_handle: string
  avatar_seed: string
  location_city: string | null
  location_coordinates: string | null
  join_date: string
  is_banned: boolean
  ban_reason: string | null
  banned_until: string | null
  created_at: string
  updated_at: string
}

// API Response types
export interface ConversationsResponse {
  success: boolean
  data: Conversation[]
  meta?: {
    total: number
    has_more: boolean
  }
}

export interface MessagesResponse {
  success: boolean
  data: Message[]
  meta?: {
    total: number
    has_more: boolean
    conversation_id: string
  }
}

export interface MessageResponse {
  success: boolean
  data: Message
}

export interface UserSearchResponse {
  success: boolean
  data: User[]
  meta?: {
    total: number
    query: string
  }
}

export interface PresenceResponse {
  success: boolean
  data: UserPresence[]
}

// Real-time event types
export interface RealtimeMessageEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Message
  old?: Message
}

export interface RealtimeConversationEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Conversation
  old?: Conversation
}

export interface RealtimeReadEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  new: MessageRead
  old?: MessageRead
}

export interface RealtimeReactionEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  new: MessageReaction
  old?: MessageReaction
}

export interface RealtimePresenceEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  new: UserPresence
  old?: UserPresence
}

// Typing indicator types
export interface TypingUser {
  user_id: string
  user_handle: string
  conversation_id: string
  is_typing: boolean
  timestamp: number
}

// Context types
export interface MessagesContextType {
  // State
  unreadCount: number
  activeConversationId: string | null
  presenceMap: Record<string, UserPresence>
  typingUsers: Record<string, TypingUser[]>
  isReady: boolean
  isModalOpen: boolean
  pendingConversationId: string | null

  // Actions
  openConversation: (conversationId: string) => void
  closeConversation: () => void
  markAsRead: (messageId: string) => Promise<void>
  updatePresence: (status: 'online' | 'away' | 'offline') => Promise<void>
  setTyping: (conversationId: string, isTyping: boolean) => void
  createConversation: (userId: string) => Promise<Conversation>
  openModal: () => void
  closeModal: () => void
  openModalWithConversation: (conversationId: string) => void
  createConversationAndOpen: (userId: string) => Promise<Conversation>
}

// Hook return types
export interface UseMessagesRealtimeReturn {
  messages: Message[]
  isLoading: boolean
  error: string | null
  sendMessage: (content: string, attachmentUrl?: string, attachmentType?: string) => Promise<void>
  editMessage: (messageId: string, content: string) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  addReaction: (messageId: string, emoji: string) => Promise<void>
  removeReaction: (messageId: string, emoji: string) => Promise<void>
  markAsRead: (messageId: string) => Promise<void>
  loadMoreMessages: () => Promise<void>
  hasMore: boolean
}

export interface UseConversationsRealtimeReturn {
  conversations: Conversation[]
  isLoading: boolean
  error: string | null
  createConversation: (userId: string) => Promise<Conversation>
  deleteConversation: (conversationId: string) => Promise<void>
  refreshConversations: () => Promise<void>
}

export interface UseTypingIndicatorReturn {
  typingUsers: TypingUser[]
  setTyping: (isTyping: boolean) => void
  isTyping: boolean
}

export interface UseUserPresenceReturn {
  presenceMap: Record<string, UserPresence>
  updatePresence: (status: 'online' | 'away' | 'offline') => Promise<void>
  getPresence: (userId: string) => UserPresence | null
}

// Form types
export interface SendMessageForm {
  content: string
  attachment?: File
}

export interface EditMessageForm {
  content: string
}

export interface UserSearchForm {
  query: string
}

// Constants
export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
} as const

export type MessageStatus = (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS]

export const PRESENCE_STATUS = {
  ONLINE: 'online',
  AWAY: 'away',
  OFFLINE: 'offline',
} as const

export type PresenceStatus = (typeof PRESENCE_STATUS)[keyof typeof PRESENCE_STATUS]

export const ATTACHMENT_TYPES = {
  IMAGE: 'image',
  FILE: 'file',
} as const

export type AttachmentType = (typeof ATTACHMENT_TYPES)[keyof typeof ATTACHMENT_TYPES]

// Error types
export interface MessageError {
  code: string
  message: string
  details?: unknown
}

export interface ConversationError {
  code: string
  message: string
  details?: unknown
}
