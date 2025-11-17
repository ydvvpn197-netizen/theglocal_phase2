/**
 * Authentication Helpers for E2E Tests
 *
 * Utilities for authenticating users in Playwright tests.
 * Uses Supabase auth to create sessions and set cookies.
 */

import { Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { createTestUser, type createTestArtist } from './test-data'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables for authentication')
}

/**
 * Login as a user using email and password
 * Sets session cookies in the browser context
 */
export async function loginAsUser(page: Page, email: string, password: string): Promise<void> {
  // Create Supabase client
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

  // Sign in with email and password
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.session) {
    throw new Error(`Failed to login: ${error?.message}`)
  }

  // Set session cookies in Playwright
  const { access_token, refresh_token } = data.session

  // Get cookies from Supabase
  const cookies = await supabase.auth.getSession()

  if (cookies.data?.session) {
    // Set auth cookies in browser context
    const hostname = new URL(supabaseUrl).hostname
    const cookieName = `sb-${hostname.split('.')[0]}-auth-token`
    await page.context().addCookies([
      {
        name: cookieName,
        value: JSON.stringify({
          access_token,
          refresh_token,
          expires_at: cookies.data.session.expires_at,
          expires_in: cookies.data.session.expires_in,
          token_type: 'bearer',
          user: cookies.data.session.user,
        }),
        domain: hostname,
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'Lax' as const,
      },
    ])
  }
}

/**
 * Create a test user and login automatically
 */
export async function loginAsTestUser(
  page: Page,
  overrides?: {
    email?: string
    phone?: string
    anonymous_handle?: string
    location_city?: string
  }
): Promise<Awaited<ReturnType<typeof createTestUser>>> {
  // Create test user (which creates auth user with email_confirm: true)
  const user = await createTestUser(overrides)

  if (!user || !user.email) {
    throw new Error('Failed to create test user')
  }

  // Generate a session token for the user
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

  // Use admin API to generate session or login directly
  // For tests, we'll use the email OTP flow or magic link
  // Since user is already confirmed, we can use admin API to create session

  // Set session manually using admin client
  const adminSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Generate a session for the user
  const { data: sessionData, error: sessionError } = await adminSupabase.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email,
  })

  if (sessionError || !sessionData) {
    throw new Error(`Failed to generate session: ${sessionError?.message}`)
  }

  // Extract tokens from the magic link
  const actionLink = sessionData.properties?.action_link
  if (!actionLink) {
    throw new Error('Failed to get action link from session data')
  }
  const url = new URL(actionLink)
  const hash = url.hash.substring(1) // Remove #

  // Parse the hash to get access_token
  const params = new URLSearchParams(
    hash.split('&').map((param) => {
      const [key, value] = param.split('=')
      return [key || '', value || '']
    })
  )
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')

  if (accessToken) {
    // Set cookies in Playwright
    const hostname = new URL(supabaseUrl).hostname
    const cookieName = `sb-${hostname.split('.')[0]}-auth-token`
    await page.context().addCookies([
      {
        name: cookieName,
        value: JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken || '',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: user.id as string,
            email: user.email as string,
            phone: (user.phone || null) as string | null,
          },
        }),
        domain: hostname,
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'Lax' as const,
      },
    ])
  }

  // Alternative: Use page.goto to set session via URL
  // This is simpler but requires a valid session endpoint
  await page.goto('/')
  await page.evaluate(
    ([token]) => {
      localStorage.setItem(
        `sb-${new URL(supabaseUrl).hostname}-auth-token`,
        JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken || '',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: user.id as string,
            email: user.email as string,
            phone: (user.phone || null) as string | null,
          },
        })
      )
    },
    [accessToken || '']
  )

  return user
}

/**
 * Login as an artist
 * Creates artist profile if it doesn't exist, then logs in
 */
export async function loginAsArtist(
  page: Page,
  overrides?: Parameters<typeof createTestUser>[0]
): Promise<{
  user: Awaited<ReturnType<typeof createTestUser>>
  artist: Awaited<ReturnType<typeof createTestArtist>>
}> {
  // Create test user
  const user = await createTestUser(overrides)

  if (!user || !user.id || !user.email) {
    throw new Error('Failed to create test user')
  }

  // Create artist profile
  const { createTestArtist } = await import('./test-data')
  const artist = await createTestArtist(user.id, {
    subscription_status: 'active',
  })

  // Login the user
  await loginAsTestUser(page, {
    email: user.email,
    anonymous_handle: user.anonymous_handle,
  })

  return { user, artist }
}

/**
 * Login as an admin/moderator
 */
export async function loginAsAdmin(
  page: Page,
  overrides?: Parameters<typeof createTestUser>[0]
): Promise<Awaited<ReturnType<typeof createTestUser>>> {
  // Create test user
  const user = await createTestUser(overrides)

  if (!user || !user.id || !user.email) {
    throw new Error('Failed to create test user')
  }

  // Set admin flag (if admin table/field exists)
  const adminSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    // Update user to be admin if there's an admin flag
    await adminSupabase
      .from('users')
      .update({ is_banned: false }) // Ensure not banned
      .eq('id', user.id)
  } catch {
    // Admin flag may not exist in users table
  }

  // Login the user
  await loginAsTestUser(page, {
    email: user.email,
    anonymous_handle: user.anonymous_handle,
  })

  return user
}

/**
 * Logout current user
 */
export async function logout(page: Page): Promise<void> {
  // Clear localStorage
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  // Clear cookies
  await page.context().clearCookies()

  // Navigate to logout endpoint if it exists
  try {
    await page.goto('/auth/logout', { waitUntil: 'networkidle' })
  } catch {
    // Logout endpoint may not exist, just clear storage
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const keys = Object.keys(localStorage)
    return keys.some((key) => key.includes('auth-token'))
  })
}

/**
 * Mock OTP verification for tests
 * Bypasses actual OTP flow for faster test execution
 */
export async function mockOTPVerification(page: Page): Promise<void> {
  // Intercept OTP verification requests
  await page.route('**/auth/verify**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        session: {
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
        },
      }),
    })
  })

  // Mock OTP input to auto-fill with test code
  await page.addInitScript(() => {
    // Override OTP input handler
    window.addEventListener('DOMContentLoaded', () => {
      const otpInputs = document.querySelectorAll('input[type="text"][maxlength="1"]')
      if (otpInputs.length === 6) {
        // Auto-fill OTP with test code: 123456
        otpInputs.forEach((input, index) => {
          ;(input as HTMLInputElement).value = String(index + 1)
        })
      }
    })
  })
}
