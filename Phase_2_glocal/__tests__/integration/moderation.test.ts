import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { POST } from '@/app/api/moderation/route'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/utils/permissions', () => ({
  isSuperAdmin: jest.fn(),
}))

const { createClient, createAdminClient } = jest.requireMock('@/lib/supabase/server')
const { isSuperAdmin } = jest.requireMock('@/lib/utils/permissions')

const mockedCreateClient = createClient as jest.Mock
const mockedCreateAdminClient = createAdminClient as jest.Mock
const mockedIsSuperAdmin = isSuperAdmin as jest.Mock

function buildUserClient(userId: string, membershipRole: 'admin' | 'moderator' | null) {
  const maybeSingle = jest.fn().mockResolvedValue({
    data: membershipRole ? { role: membershipRole } : null,
    error: null,
  })

  const secondEq = jest.fn().mockReturnValue({
    maybeSingle,
  })

  const firstEq = jest.fn().mockReturnValue({
    eq: secondEq,
    maybeSingle,
  })

  const select = jest.fn().mockReturnValue({
    eq: firstEq,
    maybeSingle,
  })

  const from = jest.fn((table: string) => {
    if (table === 'community_members') {
      return { select }
    }

    return {
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
    }
  })

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
    from,
  }
}

function buildAdminClient({
  communityId = 'community-123',
  removalError = null,
  logError = null,
  reportError = null,
}: {
  communityId?: string
  removalError?: { message: string } | null
  logError?: { message: string } | null
  reportError?: { message: string } | null
}) {
  const postsSelectSingle = jest.fn().mockResolvedValue({
    data: { community_id: communityId },
    error: null,
  })

  const postsSelectEq = jest.fn().mockReturnValue({
    single: postsSelectSingle,
  })

  const postsSelect = jest.fn().mockReturnValue({
    eq: postsSelectEq,
  })

  const postsUpdateEq = jest.fn().mockResolvedValue({
    data: null,
    error: removalError,
  })

  const postsUpdate = jest.fn().mockReturnValue({
    eq: postsUpdateEq,
  })

  const moderationSingle = jest.fn().mockResolvedValue({
    data: { id: 'log-1' },
    error: logError,
  })

  const moderationSelect = jest.fn().mockReturnValue({
    single: moderationSingle,
  })

  const moderationInsert = jest.fn().mockReturnValue({
    select: moderationSelect,
  })

  const reportsEq = jest.fn().mockResolvedValue({
    data: null,
    error: reportError,
  })

  const reportsUpdate = jest.fn().mockReturnValue({
    eq: reportsEq,
  })

  const adminClient = {
    from: jest.fn((table: string) => {
      if (table === 'posts') {
        return {
          select: postsSelect,
          update: postsUpdate,
        }
      }

      if (table === 'comments') {
        return {
          select: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: { posts: { community_id: communityId } }, error: null }),
          }),
        }
      }

      if (table === 'polls') {
        return {
          select: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: { community_id: communityId }, error: null }),
          }),
        }
      }

      if (table === 'moderation_log') {
        return {
          insert: moderationInsert,
        }
      }

      if (table === 'reports') {
        return {
          update: reportsUpdate,
        }
      }

      return {
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }
    }),
    __postsUpdateEq: postsUpdateEq,
    __moderationInsert: moderationInsert,
    __reportsEq: reportsEq,
    __postsSelectSingle: postsSelectSingle,
  }

  return adminClient
}

describe('POST /api/moderation', () => {
  let nextResponseSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    nextResponseSpy = jest.spyOn(NextResponse, 'json').mockImplementation(
      (body: any, init?: ResponseInit) =>
        ({
          status: init?.status ?? 200,
          json: () => Promise.resolve(body),
        }) as unknown as NextResponse
    )
  })

  afterEach(() => {
    nextResponseSpy.mockRestore()
  })

  it('allows super admins to remove posts via service-role client', async () => {
    const userClient = buildUserClient('super-admin', null)
    const adminClient = buildAdminClient({})

    mockedCreateClient.mockResolvedValueOnce(userClient)
    mockedCreateAdminClient.mockReturnValueOnce(adminClient)
    mockedIsSuperAdmin.mockResolvedValueOnce(true)

    const request = {
      json: jest.fn().mockResolvedValue({
        content_type: 'post',
        content_id: 'post-123',
        action: 'removed',
        reason: 'spam',
        report_id: 'report-123',
      }),
    } as unknown as NextRequest

    const response = (await POST(request)) as NextResponse
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.success).toBe(true)
    expect(adminClient.__postsUpdateEq).toHaveBeenCalledWith('id', 'post-123')
    expect(adminClient.__moderationInsert).toHaveBeenCalled()
    expect(adminClient.__reportsEq).toHaveBeenCalledWith('id', 'report-123')
  })

  it('rejects non-admin users attempting moderation', async () => {
    const userClient = buildUserClient('regular-user', null)
    const adminClient = buildAdminClient({})

    mockedCreateClient.mockResolvedValueOnce(userClient)
    mockedCreateAdminClient.mockReturnValueOnce(adminClient)
    mockedIsSuperAdmin.mockResolvedValueOnce(false)

    const request = {
      json: jest.fn().mockResolvedValue({
        content_type: 'post',
        content_id: 'post-456',
        action: 'removed',
        reason: 'spam',
      }),
    } as unknown as NextRequest

    const response = (await POST(request)) as NextResponse
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json.error).toBe('Access denied')
    expect(adminClient.__postsUpdateEq).not.toHaveBeenCalled()
    expect(adminClient.__moderationInsert).not.toHaveBeenCalled()
  })

  it('allows community admins to moderate content', async () => {
    const userClient = buildUserClient('community-admin', 'admin')
    const adminClient = buildAdminClient({})

    mockedCreateClient.mockResolvedValueOnce(userClient)
    mockedCreateAdminClient.mockReturnValueOnce(adminClient)
    mockedIsSuperAdmin.mockResolvedValueOnce(false)

    const request = {
      json: jest.fn().mockResolvedValue({
        content_type: 'post',
        content_id: 'post-789',
        action: 'removed',
        reason: 'harassment',
      }),
    } as unknown as NextRequest

    const response = (await POST(request)) as NextResponse
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.success).toBe(true)
    expect(adminClient.__postsUpdateEq).toHaveBeenCalledWith('id', 'post-789')
  })

  it('propagates removal failures back to the client', async () => {
    const userClient = buildUserClient('super-admin', null)
    const adminClient = buildAdminClient({
      removalError: { message: 'RLS violation' },
    })

    mockedCreateClient.mockResolvedValueOnce(userClient)
    mockedCreateAdminClient.mockReturnValueOnce(adminClient)
    mockedIsSuperAdmin.mockResolvedValueOnce(true)

    const request = {
      json: jest.fn().mockResolvedValue({
        content_type: 'post',
        content_id: 'post-999',
        action: 'removed',
        reason: 'nsfw',
      }),
    } as unknown as NextRequest

    const response = (await POST(request)) as NextResponse
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe('Failed to remove content')
    expect(json.details).toBe('RLS violation')
    expect(adminClient.__moderationInsert).not.toHaveBeenCalled()
  })
})
