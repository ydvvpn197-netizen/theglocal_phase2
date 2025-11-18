import { logger } from '@/lib/utils/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function getUnreadMessageCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select('id')
    .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)

  if (conversationsError || !conversations || conversations.length === 0) {
    return 0
  }

  const conversationIds = conversations.map((conversation) => conversation.id)

  const { data: unreadMessages, error: unreadError } = await supabase
    .from('messages')
    .select('id, message_reads!left(user_id)')
    .in('conversation_id', conversationIds)
    .neq('sender_id', userId)
    .eq('is_deleted', false)
    .filter('message_reads.user_id', 'is', 'null')

  if (unreadError) {
    logger.error('Failed to load unread message count:', unreadError)
    return 0
  }

  return unreadMessages?.length ?? 0
}
