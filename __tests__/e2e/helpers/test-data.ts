/**
 * Test Data Helpers
 *
 * Factory functions and utilities for creating test data in E2E tests.
 * Uses Supabase admin client to bypass RLS for test data creation.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables for test data creation')
}

// Create admin client with service role key for test data creation
const adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * Generate unique test identifier
 */
export function generateTestId(prefix = 'e2e'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`
}

/**
 * Create a test user
 */
export async function createTestUser(overrides?: {
  email?: string
  phone?: string
  anonymous_handle?: string
  location_city?: string
}) {
  const testId = generateTestId()
  const email = overrides?.email || `test-${testId}@example.com`
  const phone = overrides?.phone || null
  const anonymous_handle = overrides?.anonymous_handle || `test_user_${testId}`
  const location_city = overrides?.location_city || 'Mumbai'

  // Create auth user
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    phone: phone || undefined,
    email_confirm: true,
    phone_confirm: true,
  })

  if (authError || !authData.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`)
  }

  const userId = authData.user.id

  // Create user profile
  const avatar_seed = `seed_${testId}`
  const insertData = {
    id: userId,
    email,
    phone: phone || null,
    anonymous_handle,
    avatar_seed,
    location_city,
    join_date: new Date().toISOString(),
  }

  const { data: userData, error: userError } = await (adminClient.from('users') as any)
    .insert(insertData)
    .select()
    .single()

  if (userError || !userData) {
    // Cleanup auth user if profile creation fails
    await adminClient.auth.admin.deleteUser(userId)
    throw new Error(`Failed to create user profile: ${userError?.message}`)
  }

  return {
    ...userData,
    password: 'test_password_123', // For tests that need password auth
    testId,
  } as Database['public']['Tables']['users']['Row'] & { password: string; testId: string }
}

/**
 * Create a test artist
 */
export async function createTestArtist(
  userId: string,
  overrides?: {
    stage_name?: string
    service_category?: string
    location_city?: string
    rate_min?: number
    rate_max?: number
    subscription_status?: string
  }
) {
  const testId = generateTestId()
  const stage_name = overrides?.stage_name || `Test Artist ${testId}`
  const service_category = overrides?.service_category || 'Musician'
  const location_city = overrides?.location_city || 'Mumbai'
  const rate_min = overrides?.rate_min || 10000
  const rate_max = overrides?.rate_max || 50000
  const subscription_status = overrides?.subscription_status || 'trial'

  // Set trial end date to 30 days from now if trial
  const trial_ends_at =
    subscription_status === 'trial'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null

  const insertData = {
    id: userId,
    stage_name,
    service_category,
    description: `Test artist description for ${stage_name}`,
    location_city,
    rate_min,
    rate_max,
    subscription_status,
    trial_ends_at,
    profile_views: 0,
    rating_avg: 0,
    rating_count: 0,
  }

  const { data, error } = await (adminClient.from('artists') as any)
    .insert(insertData)
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to create test artist: ${error?.message}`)
  }

  return { ...data, testId } as Database['public']['Tables']['artists']['Row'] & { testId: string }
}

/**
 * Create a test community
 */
export async function createTestCommunity(
  createdBy: string,
  overrides?: {
    name?: string
    slug?: string
    location_city?: string
    is_private?: boolean
  }
) {
  const testId = generateTestId()
  const name = overrides?.name || `Test Community ${testId}`
  const slug = overrides?.slug || `test-community-${testId}`
  const location_city = overrides?.location_city || 'Mumbai'
  const is_private = overrides?.is_private || false

  const insertData = {
    name,
    slug,
    description: `Test community description for ${name}`,
    location_city,
    created_by: createdBy,
    member_count: 0,
    post_count: 0,
    is_private,
    is_featured: false,
  }

  const { data, error } = await (adminClient.from('communities') as any)
    .insert(insertData)
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to create test community: ${error?.message}`)
  }

  return { ...data, testId } as Database['public']['Tables']['communities']['Row'] & {
    testId: string
  }
}

/**
 * Create a test post
 */
export async function createTestPost(
  communityId: string,
  authorId: string,
  overrides?: {
    title?: string
    body?: string
    image_url?: string
  }
) {
  const testId = generateTestId()
  const title = overrides?.title || `Test Post ${testId}`
  const body = overrides?.body || `Test post content for ${title}`

  const insertData = {
    community_id: communityId,
    author_id: authorId,
    title,
    body,
    image_url: overrides?.image_url || null,
    upvotes: 0,
    downvotes: 0,
    comment_count: 0,
    is_deleted: false,
    is_edited: false,
  }

  const { data, error } = await (adminClient.from('posts') as any)
    .insert(insertData)
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to create test post: ${error?.message}`)
  }

  return { ...data, testId } as Database['public']['Tables']['posts']['Row'] & { testId: string }
}

/**
 * Create a test event
 */
export async function createTestEvent(
  artistId: string,
  overrides?: {
    title?: string
    description?: string
    event_date?: Date
    location_city?: string
    location_address?: string
  }
) {
  const testId = generateTestId()
  const title = overrides?.title || `Test Event ${testId}`
  const event_date = overrides?.event_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  const location_city = overrides?.location_city || 'Mumbai'

  // Note: Events table structure may vary - adjust based on actual schema
  const eventData = {
    artist_id: artistId,
    title,
    description: overrides?.description || `Test event description for ${title}`,
    event_date: event_date.toISOString(),
    event_time: '19:00',
    location_city,
    location_address: overrides?.location_address || 'Test Venue',
    category: 'Music',
    is_public: true,
    max_attendees: 100,
    current_attendees: 0,
    rsvp_count: 0,
    status: 'upcoming',
  }

  // If events table exists, insert it; otherwise return mock data
  try {
    // Type assertion for events table (may not exist in types)
    const { data, error } = await (adminClient.from('events') as any)
      .insert(eventData)
      .select()
      .single()

    if (error) {
      console.warn('Events table may not exist, using mock data:', error.message)
      return { ...eventData, id: generateTestId('event'), testId }
    }

    return { ...data, testId } as typeof data & { testId: string }
  } catch (error) {
    return { ...eventData, id: generateTestId('event'), testId }
  }
}

/**
 * Create a test booking
 */
export async function createTestBooking(
  artistId: string,
  userId: string,
  overrides?: {
    event_date?: Date
    event_type?: string
    location?: string
    budget_range?: string
    status?: string
  }
) {
  const testId = generateTestId()
  const event_date = overrides?.event_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now

  const bookingData = {
    artist_id: artistId,
    user_id: userId,
    event_date: event_date.toISOString(),
    event_time: '18:00',
    event_type: overrides?.event_type || 'Wedding Reception',
    location: overrides?.location || 'Test Venue, Mumbai',
    budget_range: overrides?.budget_range || '₹25,000 - ₹35,000',
    message: `Test booking request ${testId}`,
    status: overrides?.status || 'pending',
  }

  // If bookings table exists, insert it; otherwise return mock data
  try {
    // Type assertion for bookings table (may not exist in types)
    const { data, error } = await (adminClient.from('bookings') as any)
      .insert(bookingData)
      .select()
      .single()

    if (error) {
      console.warn('Bookings table may not exist, using mock data:', error.message)
      return { ...bookingData, id: generateTestId('booking'), testId }
    }

    return { ...data, testId } as typeof data & { testId: string }
  } catch (error) {
    return { ...bookingData, id: generateTestId('booking'), testId }
  }
}

/**
 * Create a test poll
 */
export async function createTestPoll(
  communityId: string,
  authorId: string,
  overrides?: {
    question?: string
    options?: string[]
    expires_at?: Date
    is_anonymous?: boolean
  }
) {
  const testId = generateTestId()
  const question = overrides?.question || `Test Poll ${testId}?`
  const options = overrides?.options || ['Option A', 'Option B', 'Option C']
  const expires_at = overrides?.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now

  const pollData = {
    community_id: communityId,
    author_id: authorId,
    question,
    options: JSON.stringify(options),
    expires_at: expires_at.toISOString(),
    is_anonymous: overrides?.is_anonymous ?? true,
    vote_count: 0,
    total_votes: 0,
  }

  // If polls table exists, insert it; otherwise return mock data
  try {
    // Type assertion for polls table (may not exist in types)
    const { data, error } = await (adminClient.from('polls') as any)
      .insert(pollData)
      .select()
      .single()

    if (error) {
      console.warn('Polls table may not exist, using mock data:', error.message)
      return { ...pollData, id: generateTestId('poll'), testId }
    }

    return { ...data, testId } as typeof data & { testId: string }
  } catch (error) {
    return { ...pollData, id: generateTestId('poll'), testId }
  }
}

/**
 * Clean up test data by prefix
 */
export async function cleanupTestData(prefix = 'e2e'): Promise<void> {
  const testIdPattern = `${prefix}_%`

  try {
    // Clean up test users
    const { data: users } = await (adminClient.from('users') as any)
      .select('id, email')
      .like('email', `%${prefix}%`)

    if (users && users.length > 0) {
      // Delete auth users
      for (const user of users as Array<{ id?: string; email?: string }>) {
        try {
          if (user.id) {
            await adminClient.auth.admin.deleteUser(user.id)
          }
        } catch (error) {
          console.warn(`Failed to delete auth user:`, error)
        }
      }

      // Delete user profiles
      const userIds = (users as Array<{ id?: string }>)
        .map((u) => u.id)
        .filter((id): id is string => !!id)
      if (userIds.length > 0) {
        await (adminClient.from('users') as any).delete().in('id', userIds)
      }
    }

    // Clean up test communities (they should cascade delete posts)
    await adminClient.from('communities').delete().like('slug', `${prefix}%`)

    // Clean up test artists
    await adminClient.from('artists').delete().like('stage_name', `%${prefix}%`)

    // Clean up test events if table exists
    try {
      await adminClient.from('events').delete().like('title', `%${prefix}%`)
    } catch {
      // Table may not exist
    }

    // Clean up test bookings if table exists
    try {
      await adminClient.from('bookings').delete().like('message', `%${prefix}%`)
    } catch {
      // Table may not exist
    }

    // Clean up test polls if table exists
    try {
      await adminClient.from('polls').delete().like('question', `%${prefix}%`)
    } catch {
      // Table may not exist
    }
  } catch (error) {
    console.error('Error during test data cleanup:', error)
    throw error
  }
}

/**
 * Seed initial test data for E2E tests
 */
export async function seedTestData(): Promise<{
  user: Awaited<ReturnType<typeof createTestUser>>
  artist: Awaited<ReturnType<typeof createTestArtist>>
  community: Awaited<ReturnType<typeof createTestCommunity>>
  post: Awaited<ReturnType<typeof createTestPost>>
}> {
  // Create a test user
  const user = await createTestUser()

  // Create an artist for the user
  const artist = await createTestArtist(user.id, {
    subscription_status: 'active',
  })

  // Create a test community
  const community = await createTestCommunity(user.id)

  // Join user to community
  try {
    // Type assertion for community_members table (may not exist in types)
    await (adminClient.from('community_members') as any).insert({
      community_id: community.id,
      user_id: user.id,
      role: 'member',
      joined_at: new Date().toISOString(),
    })
  } catch {
    // Table may not exist or user already a member
  }

  // Create a test post
  const post = await createTestPost(community.id, user.id)

  return { user, artist, community, post }
}
