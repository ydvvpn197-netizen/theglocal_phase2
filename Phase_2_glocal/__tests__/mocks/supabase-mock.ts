/**
 * Type-safe Supabase client mocks for testing
 * Addresses critical TypeScript issues in test files
 */

import { jest } from '@jest/globals'

export interface MockSupabaseResponse<T = unknown> {
  data: T | null
  error: Error | null
}

export interface MockSupabaseQueryBuilder<T = unknown> {
  select: jest.MockedFunction<(columns?: string) => MockSupabaseQueryBuilder<T>>
  insert: jest.MockedFunction<(data: unknown) => Promise<MockSupabaseResponse<T>>>
  update: jest.MockedFunction<(data: unknown) => MockSupabaseQueryBuilder<T>>
  delete: jest.MockedFunction<() => MockSupabaseQueryBuilder<T>>
  eq: jest.MockedFunction<(column: string, value: unknown) => MockSupabaseQueryBuilder<T>>
  neq: jest.MockedFunction<(column: string, value: unknown) => MockSupabaseQueryBuilder<T>>
  gt: jest.MockedFunction<(column: string, value: unknown) => MockSupabaseQueryBuilder<T>>
  gte: jest.MockedFunction<(column: string, value: unknown) => MockSupabaseQueryBuilder<T>>
  lt: jest.MockedFunction<(column: string, value: unknown) => MockSupabaseQueryBuilder<T>>
  lte: jest.MockedFunction<(column: string, value: unknown) => MockSupabaseQueryBuilder<T>>
  like: jest.MockedFunction<(column: string, value: unknown) => MockSupabaseQueryBuilder<T>>
  ilike: jest.MockedFunction<(column: string, value: unknown) => MockSupabaseQueryBuilder<T>>
  in: jest.MockedFunction<(column: string, values: unknown[]) => MockSupabaseQueryBuilder<T>>
  contains: jest.MockedFunction<(column: string, value: unknown) => MockSupabaseQueryBuilder<T>>
  order: jest.MockedFunction<
    (column: string, options?: { ascending?: boolean }) => MockSupabaseQueryBuilder<T>
  >
  limit: jest.MockedFunction<(count: number) => MockSupabaseQueryBuilder<T>>
  range: jest.MockedFunction<(from: number, to: number) => MockSupabaseQueryBuilder<T>>
  single: jest.MockedFunction<() => Promise<MockSupabaseResponse<T>>>
  maybeSingle: jest.MockedFunction<() => Promise<MockSupabaseResponse<T>>>
}

export interface MockSupabaseClient {
  from: jest.MockedFunction<(table: string) => MockSupabaseQueryBuilder>
  rpc: jest.MockedFunction<
    (fn: string, args?: Record<string, unknown>) => Promise<MockSupabaseResponse>
  >
  auth: {
    getUser: jest.MockedFunction<() => Promise<MockSupabaseResponse<{ user: { id: string } }>>>
    signUp: jest.MockedFunction<
      (credentials: unknown) => Promise<MockSupabaseResponse<{ user: unknown; session: unknown }>>
    >
    signIn: jest.MockedFunction<
      (credentials: unknown) => Promise<MockSupabaseResponse<{ user: unknown; session: unknown }>>
    >
    signOut: jest.MockedFunction<() => Promise<MockSupabaseResponse<void>>>
    getSession: jest.MockedFunction<() => Promise<MockSupabaseResponse<{ session: unknown }>>>
    onAuthStateChange: jest.MockedFunction<
      (callback: unknown) => { data: { subscription: { unsubscribe: jest.Mock } } }
    >
  }
  storage: {
    from: jest.MockedFunction<
      (bucket: string) => {
        upload: jest.MockedFunction<(path: string, file: File) => Promise<MockSupabaseResponse>>
        download: jest.MockedFunction<(path: string) => Promise<MockSupabaseResponse>>
        remove: jest.MockedFunction<(paths: string[]) => Promise<MockSupabaseResponse>>
        list: jest.MockedFunction<(path?: string) => Promise<MockSupabaseResponse>>
      }
    >
  }
}

/**
 * Create a properly typed Supabase client mock
 */
export function createMockSupabaseClient(): MockSupabaseClient {
  const createQueryBuilder = <T = unknown>(): MockSupabaseQueryBuilder<T> => {
    const mockBuilder = {
      select: jest.fn().mockReturnThis(),
      insert: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ data: null, error: null } as MockSupabaseResponse<T>)
        ),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ data: null, error: null } as MockSupabaseResponse<T>)
        ),
      maybeSingle: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ data: null, error: null } as MockSupabaseResponse<T>)
        ),
    }
    return mockBuilder as MockSupabaseQueryBuilder<T>
  }

  return {
    from: jest.fn().mockImplementation(() => createQueryBuilder()),
    rpc: jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve({ data: null, error: null } as MockSupabaseResponse)
      ),
    auth: {
      getUser: jest.fn().mockImplementation(() =>
        Promise.resolve({ data: { user: null }, error: null } as MockSupabaseResponse<{
          user: { id: string } | null
        }>)
      ),
      signUp: jest.fn().mockImplementation(() =>
        Promise.resolve({
          data: { user: null, session: null },
          error: null,
        } as MockSupabaseResponse<{ user: unknown; session: unknown }>)
      ),
      signIn: jest.fn().mockImplementation(() =>
        Promise.resolve({
          data: { user: null, session: null },
          error: null,
        } as MockSupabaseResponse<{ user: unknown; session: unknown }>)
      ),
      signOut: jest
        .fn()
        .mockImplementation(() => Promise.resolve({ error: null } as MockSupabaseResponse<void>)),
      getSession: jest.fn().mockImplementation(() =>
        Promise.resolve({ data: { session: null }, error: null } as MockSupabaseResponse<{
          session: unknown
        }>)
      ),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest
          .fn()
          .mockImplementation(() =>
            Promise.resolve({ data: null, error: null } as MockSupabaseResponse)
          ),
        download: jest
          .fn()
          .mockImplementation(() =>
            Promise.resolve({ data: null, error: null } as MockSupabaseResponse)
          ),
        remove: jest
          .fn()
          .mockImplementation(() =>
            Promise.resolve({ data: null, error: null } as MockSupabaseResponse)
          ),
        list: jest
          .fn()
          .mockImplementation(() =>
            Promise.resolve({ data: [], error: null } as MockSupabaseResponse)
          ),
      }),
    },
  } as MockSupabaseClient
}

/**
 * Create mock NextRequest for API route testing
 */
export function createMockNextRequest(
  options: {
    method?: string
    url?: string
    headers?: Record<string, string>
    body?: unknown
    searchParams?: Record<string, string>
  } = {}
): Request & { nextUrl: { searchParams: URLSearchParams } } {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    headers = {},
    body,
    searchParams = {},
  } = options

  const searchParamsObj = new URLSearchParams(searchParams)

  const mockRequest = {
    method,
    url,
    headers: new Headers(headers),
    json: jest.fn().mockImplementation(() => Promise.resolve(body || {})),
    text: jest.fn().mockImplementation(() => Promise.resolve(JSON.stringify(body || {}))),
    formData: jest.fn().mockImplementation(() => Promise.resolve(new FormData())),
    arrayBuffer: jest.fn().mockImplementation(() => Promise.resolve(new ArrayBuffer(0))),
    blob: jest.fn().mockImplementation(() => Promise.resolve(new Blob())),
    clone: jest.fn().mockReturnThis(),
    nextUrl: {
      searchParams: searchParamsObj,
      pathname: new URL(url).pathname,
      origin: new URL(url).origin,
    },
    cookies: {
      get: jest.fn().mockReturnValue(undefined),
      set: jest.fn(),
    },
  } as unknown as Request & {
    nextUrl: { searchParams: URLSearchParams; pathname: string; origin: string }
    cookies: { get: jest.Mock; set: jest.Mock }
  }

  return mockRequest
}

export default {
  createMockSupabaseClient,
  createMockNextRequest,
}

describe('createMockSupabaseClient', () => {
  it('returns a mock supabase client with typed methods', async () => {
    const client = createMockSupabaseClient()
    expect(typeof client.from).toBe('function')
    await expect(client.auth.signIn({})).resolves.toEqual({
      data: { user: null, session: null },
      error: null,
    })
  })
})
