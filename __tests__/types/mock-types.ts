// Common TypeScript interfaces for test mocks to replace 'as any' assertions

export interface MockRouter {
  push: jest.MockedFunction<(url: string) => void>
  replace: jest.MockedFunction<(url: string) => void>
  prefetch: jest.MockedFunction<(url: string) => Promise<void>>
  back: jest.MockedFunction<() => void>
  forward: jest.MockedFunction<() => void>
  refresh: jest.MockedFunction<() => void>
}

export interface MockUser {
  id: string
  email: string
  app_metadata: Record<string, unknown>
  user_metadata: Record<string, unknown>
  aud: string
  created_at: string
  [key: string]: unknown
}

export interface MockProfile {
  id: string
  email: string
  phone: string | null
  anonymous_handle: string
  avatar_seed: string
  location_coordinates: string | null
  location_city: string | null
  is_banned: boolean
  created_at: string
  [key: string]: unknown
}

export interface MockAuthContext {
  user: MockUser | null
  profile: MockProfile | null
  session: unknown | null
  isLoading: boolean
  signOut: jest.MockedFunction<() => Promise<void>>
  refreshProfile: jest.MockedFunction<() => Promise<void>>
  updateUserLocation: jest.MockedFunction<
    (
      coordinates: { latitude: number; longitude: number },
      city?: string
    ) => Promise<{ success: boolean; error?: string }>
  >
}

export interface MockFetchResponse {
  ok: boolean
  status?: number
  json: jest.MockedFunction<() => Promise<unknown>>
  text?: jest.MockedFunction<() => Promise<string>>
  [key: string]: unknown
}

export interface MockNextImage {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
  unoptimized?: boolean
  onError?: (e: unknown) => void
  [key: string]: unknown
}

// Helper function to create typed mock router
export const createMockRouter = (overrides: Partial<MockRouter> = {}): MockRouter => ({
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  ...overrides,
})

// Helper function to create typed mock user
export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  ...overrides,
})

// Helper function to create typed mock profile
export const createMockProfile = (overrides: Partial<MockProfile> = {}): MockProfile => ({
  id: 'test-profile-id',
  email: 'test@example.com',
  phone: null,
  anonymous_handle: 'testuser',
  avatar_seed: 'test-seed',
  location_coordinates: '19.0760,72.8777',
  location_city: 'Mumbai',
  is_banned: false,
  created_at: new Date().toISOString(),
  ...overrides,
})

// Helper function to create typed mock auth context
export const createMockAuthContext = (
  overrides: Partial<MockAuthContext> = {}
): MockAuthContext => ({
  user: createMockUser(),
  profile: createMockProfile(),
  session: null,
  isLoading: false,
  signOut: jest.fn().mockResolvedValue(undefined),
  refreshProfile: jest.fn().mockResolvedValue(undefined),
  updateUserLocation: jest.fn().mockResolvedValue({ success: true }),
  ...overrides,
})

// Helper function to create typed mock fetch response
export const createMockFetchResponse = (
  data: unknown,
  overrides: Partial<MockFetchResponse> = {}
): MockFetchResponse => ({
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue(data),
  text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  ...overrides,
})

describe('mock type helpers', () => {
  it('creates a mock router with jest functions', () => {
    const router = createMockRouter()
    expect(typeof router.push).toBe('function')
  })
})
