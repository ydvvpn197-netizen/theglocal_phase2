import { logger } from '@/lib/utils/logger'
import { SupabaseClient } from '@supabase/supabase-js'

interface NotificationSummary {
  unreadCount: number
  latestNotification: { id: string; created_at: string } | null
}

export async function getNotificationSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationSummary> {
  const [{ count, error: countError }, { data: latestNotification, error: latestError }] =
    await Promise.all([
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null),
      supabase
        .from('notifications')
        .select('id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  if (countError) {
    throw countError
  }

  if (latestError) {
    logger.error('Error fetching latest notification metadata:', latestError)
  }

  return {
    unreadCount: count ?? 0,
    latestNotification: latestNotification
      ? {
          id: latestNotification.id,
          created_at: latestNotification.created_at,
        }
      : null,
  }
}
