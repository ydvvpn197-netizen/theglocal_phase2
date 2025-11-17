import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { randomUUID } from 'crypto'
import {
  fetchNotifications,
  fetchNotificationSummary,
  mergeNotificationPages,
} from '@/lib/services/notifications'
import { NotificationListResponse, NotificationSummaryResponse } from '@/lib/queries/notifications'
import { NotificationWithActor, NotificationType } from '@/lib/types/notifications'

const mockNotification = (
  overrides: Partial<NotificationWithActor> = {}
): NotificationWithActor => ({
  id: randomUUID(),
  user_id: 'user-123',
  type: 'comment_on_post' as NotificationType,
  title: 'New comment',
  message: 'Someone replied to your post',
  link: '/posts/post-123',
  actor_id: 'actor-123',
  entity_id: 'post-123',
  entity_type: 'post',
  is_read: false,
  created_at: new Date().toISOString(),
  read_at: null,
  expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
  batch_key: null,
  batch_count: 1,
  data: null,
  actor: {
    anonymous_handle: 'artist',
    avatar_seed: 'seed',
  },
  ...overrides,
})

describe('Notification service helpers', () => {
  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch
  })

  it('merges notification pages without duplicates while preserving order', () => {
    const shared = mockNotification({ id: 'duplicate-id' })
    const firstPage: NotificationListResponse = {
      notifications: [shared, mockNotification({ id: 'first-only' })],
      pageInfo: {
        hasMore: true,
        nextCursor: 'cursor-1',
        limit: 20,
        filter: 'all',
      },
    }

    const secondPage: NotificationListResponse = {
      notifications: [shared, mockNotification({ id: 'second-only' })],
      pageInfo: {
        hasMore: false,
        nextCursor: null,
        limit: 20,
        filter: 'all',
      },
    }

    const merged = mergeNotificationPages([firstPage, secondPage])

    expect(merged).toHaveLength(3)
    expect(merged[0]?.id).toBe('duplicate-id')
    expect(merged[1]?.id).toBe('first-only')
    expect(merged[2]?.id).toBe('second-only')
  })

  it('throws when fetchNotifications receives non-ok response', async () => {
    ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: () => Promise.resolve('Database offline'),
    } as Response)

    await expect(fetchNotifications({ filter: 'all', limit: 20 })).rejects.toThrow(
      /Database offline/
    )
  })

  it('returns parsed notifications payload on success', async () => {
    const payload: NotificationListResponse = {
      notifications: [mockNotification()],
      pageInfo: {
        hasMore: false,
        nextCursor: null,
        limit: 20,
        filter: 'all',
      },
    }

    ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(payload),
    } as Response)

    const result = await fetchNotifications({ filter: 'all', limit: 20 })
    expect(result.notifications).toHaveLength(1)
    expect(result.pageInfo.hasMore).toBe(false)
  })

  it('retrieves notification summary payload', async () => {
    const summary: NotificationSummaryResponse = {
      unreadCount: 3,
      latestNotification: { id: 'notif-123', created_at: new Date().toISOString() },
    }

    ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(summary),
    } as Response)

    const result = await fetchNotificationSummary()
    expect(result.unreadCount).toBe(3)
    expect(result.latestNotification?.id).toBe('notif-123')
  })
})
