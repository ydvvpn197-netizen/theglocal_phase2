/**
 * Supabase Type Definitions
 *
 * Common type definitions for Supabase query results and operations.
 * These types help avoid `any` types when working with Supabase responses.
 *
 * @fileoverview Previously named supabase-helpers.ts, renamed for clarity.
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Type for Supabase client from server
 */
export type SupabaseClient = Awaited<ReturnType<typeof createClient>>

/**
 * Type for Supabase admin client
 */
export type SupabaseAdminClient = ReturnType<typeof createAdminClient>

/**
 * Common Supabase query result shape
 */
export interface SupabaseQueryResult<T = unknown> {
  data: T | null
  error: Error | null
}

/**
 * Common record with ID for database operations
 */
export interface RecordWithId {
  id: string
  [key: string]: unknown
}

/**
 * Common record with city for location-based queries
 */
export interface RecordWithCity {
  location_city: string | null
  [key: string]: unknown
}

/**
 * Common membership record
 */
export interface MembershipRecord {
  community_id: string
  role: string
  [key: string]: unknown
}

/**
 * Common vote record
 */
export interface VoteRecord {
  content_id: string
  vote_type: string
  [key: string]: unknown
}

/**
 * Common media item record
 */
export interface MediaItemRecord {
  owner_id: string
  owner_type: string
  [key: string]: unknown
}
