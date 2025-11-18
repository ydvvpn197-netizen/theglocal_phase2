import { NotificationWithActor } from '@/lib/types/notifications'
import {
  NotificationFilter,
  NotificationListResponse,
  NotificationSummaryResponse,
} from '@/lib/queries/notifications'

interface FetchNotificationsParams {
  filter: NotificationFilter
  cursor?: string | null
  limit?: number
  signal?: AbortSignal
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(
      `Request failed (${response.status} ${response.statusText})${
        errorText ? `: ${errorText}` : ''
      }`
    )
  }
  return (await response.json()) as T
}

export async function fetchNotifications({
  filter,
  cursor,
  limit,
  signal,
}: FetchNotificationsParams): Promise<NotificationListResponse> {
  const params = new URLSearchParams()
  params.set('filter', filter)
  if (typeof limit === 'number') {
    params.set('limit', String(limit))
  }
  if (cursor) {
    params.set('cursor', cursor)
  }

  const response = await fetch(`/api/notifications?${params.toString()}`, {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  return handleResponse<NotificationListResponse>(response)
}

export async function fetchNotificationSummary(
  signal?: AbortSignal
): Promise<NotificationSummaryResponse> {
  const response = await fetch('/api/notifications/summary', {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  return handleResponse<NotificationSummaryResponse>(response)
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const response = await fetch(`/api/notifications/${notificationId}`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(
      `Failed to mark notification as read (${response.status}): ${errorText || 'Unknown error'}`
    )
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const response = await fetch('/api/notifications', {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(
      `Failed to mark all notifications as read (${
        response.status
      }): ${errorText || 'Unknown error'}`
    )
  }
}

export async function deleteNotificationById(notificationId: string): Promise<void> {
  const response = await fetch(`/api/notifications/${notificationId}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(
      `Failed to delete notification (${response.status}): ${errorText || 'Unknown error'}`
    )
  }
}

export function mergeNotificationPages(
  pages: NotificationListResponse[] | undefined
): NotificationWithActor[] {
  if (!pages) return []
  const seen = new Set<string>()
  const merged: NotificationWithActor[] = []

  for (const page of pages) {
    for (const notification of page.notifications) {
      if (!seen.has(notification.id)) {
        seen.add(notification.id)
        merged.push(notification)
      }
    }
  }

  return merged
}
