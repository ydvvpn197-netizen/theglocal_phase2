/**
 * Admin Authentication Utilities
 *
 * Provides utilities for requiring admin authentication in API routes.
 * Returns proper NextResponse errors (401 for unauthenticated, 403 for unauthorized).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/utils/permissions'
import { APIErrors } from '@/lib/utils/api-response'

/**
 * Require admin authentication and return user if authenticated and authorized.
 * Returns NextResponse error if user is not authenticated (401) or not authorized (403).
 *
 * @returns Object with user and supabase client, or NextResponse error
 *
 * @example
 * ```ts
 * const adminCheck = await requireAdmin()
 * if (adminCheck instanceof NextResponse) {
 *   return adminCheck // Error response
 * }
 * const { user, supabase } = adminCheck
 * // Continue with admin logic
 * ```
 */
export async function requireAdmin(): Promise<
  { user: { id: string }; supabase: Awaited<ReturnType<typeof createClient>> } | NextResponse
> {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Check if user is super admin
  const isAdmin = await isSuperAdmin(user.id)
  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  return { user, supabase }
}

/**
 * Require admin authentication and throw APIError if not authorized.
 * Use this when you want to use try/catch error handling instead of checking for NextResponse.
 *
 * @throws APIError if user is not authenticated or not authorized
 *
 * @example
 * ```ts
 * try {
 *   const { user, supabase } = await requireAdminOrThrow()
 *   // Continue with admin logic
 * } catch (error) {
 *   return handleAPIError(error, { method: 'GET', path: '/api/admin/stats' })
 * }
 * ```
 */
export async function requireAdminOrThrow(): Promise<{
  user: { id: string }
  supabase: Awaited<ReturnType<typeof createClient>>
}> {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw APIErrors.unauthorized()
  }

  // Check if user is super admin
  const isAdmin = await isSuperAdmin(user.id)
  if (!isAdmin) {
    throw APIErrors.forbidden()
  }

  return { user, supabase }
}
