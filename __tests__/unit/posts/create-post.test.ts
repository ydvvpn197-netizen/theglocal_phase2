import type { SupabaseClient } from '@supabase/supabase-js'
import { createPost } from '@/lib/server/posts/create-post'

jest.mock('@/lib/utils/permissions', () => ({
  isSuperAdmin: jest.fn(),
}))

const { isSuperAdmin } = jest.requireMock('@/lib/utils/permissions') as {
  isSuperAdmin: jest.MockedFunction<(userId: string, supabase?: SupabaseClient) => Promise<boolean>>
}

function createSupabaseMock({
  membershipData,
  membershipError,
}: {
  membershipData?: unknown
  membershipError?: unknown
} = {}) {
  const single = jest.fn().mockResolvedValue({ data: membershipData, error: membershipError })
  const secondEq = jest.fn().mockReturnValue({ single })
  const firstEq = jest.fn().mockReturnValue({ eq: secondEq })
  const select = jest.fn().mockReturnValue({ eq: firstEq })
  const from = jest.fn((source: string) => {
    if (source === 'community_members') {
      return { select }
    }

    return {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }
  })

  const storageFrom = jest.fn().mockReturnValue({
    remove: jest.fn().mockResolvedValue({ error: null }),
    list: jest.fn().mockResolvedValue({ error: null }),
  })

  const supabase = {
    from,
    rpc: jest.fn(),
    storage: { from: storageFrom },
  } as unknown as SupabaseClient

  return supabase
}

describe('createPost service', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('throws 403 when user is not a community member', async () => {
    const supabase = createSupabaseMock({ membershipData: null })
    isSuperAdmin.mockResolvedValue(false)

    await expect(
      createPost({
        supabase,
        userId: 'user-1',
        payload: {
          community_id: 'community-1',
          title: 'Test Post',
          body: 'Hello world',
          external_url: undefined,
          media_items: [],
        },
      })
    ).rejects.toMatchObject({
      status: 403,
      message: 'You must be a member of this community to post',
      name: 'PostServiceError',
    })
  })

  it('rejects unsupported external URL protocols', async () => {
    const supabase = createSupabaseMock({ membershipData: { id: 'member' } })
    isSuperAdmin.mockResolvedValue(true)

    await expect(
      createPost({
        supabase,
        userId: 'user-1',
        payload: {
          community_id: 'community-1',
          title: 'Test Post',
          body: 'Hello world',
          external_url: 'ftp://example.com/resource',
          media_items: [],
        },
      })
    ).rejects.toMatchObject({
      status: 400,
      message: 'External URL must use HTTP or HTTPS protocol',
      name: 'PostServiceError',
    })
  })
})
