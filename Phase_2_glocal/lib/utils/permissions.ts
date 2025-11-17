/**
 * Permission and Role Management Utilities
 * Handles access control for admin features
 */

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// User roles
export const ROLES = {
  USER: 'user',
  COMMUNITY_ADMIN: 'community_admin',
  SUPER_ADMIN: 'super_admin',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

/**
 * Check if user is super admin
 * Super admins are identified by email domain or explicit flag in database
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient()

  // Check if user has super admin flag
  const { data: user } = await supabase
    .from('users')
    .select('email, is_super_admin')
    .eq('id', userId)
    .single()

  if (!user) return false

  // Check explicit super admin flag (if field exists)
  if (user.is_super_admin) return true

  // Check if email is in super admin list (fallback)
  const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(',') || []
  return superAdminEmails.some((email) => user.email?.toLowerCase() === email.toLowerCase().trim())
}

/**
 * Check if user is admin of a specific community
 */
export async function isCommunityAdmin(userId: string, communityId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from('community_members')
    .select('role')
    .eq('user_id', userId)
    .eq('community_id', communityId)
    .single()

  return membership?.role === 'admin'
}

/**
 * Check if user is admin of any community
 */
export async function isAnyCommunityAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: memberships } = await supabase
    .from('community_members')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')

  return (memberships?.length || 0) > 0
}

/**
 * Get user's role for a community
 */
export async function getUserCommunityRole(
  userId: string,
  communityId: string
): Promise<'admin' | 'moderator' | 'member' | null> {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from('community_members')
    .select('role')
    .eq('user_id', userId)
    .eq('community_id', communityId)
    .single()

  const role = membership?.role
  if (role === 'admin' || role === 'moderator' || role === 'member') {
    return role
  }
  return null
}

/**
 * Require super admin or throw error
 */
export async function requireSuperAdmin(userId: string): Promise<void> {
  const isAdmin = await isSuperAdmin(userId)
  if (!isAdmin) {
    throw new Error('Super admin access required')
  }
}

/**
 * Require community admin or throw error
 */
export async function requireCommunityAdmin(userId: string, communityId: string): Promise<void> {
  const isAdmin = await isCommunityAdmin(userId, communityId)
  if (!isAdmin) {
    throw new Error('Community admin access required')
  }
}

/**
 * Check if user has permission for action
 */
export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  const roleHierarchy = {
    [ROLES.USER]: 0,
    [ROLES.COMMUNITY_ADMIN]: 1,
    [ROLES.SUPER_ADMIN]: 2,
  }

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

/**
 * Count the number of admins in a community
 */
export async function countCommunityAdmins(
  communityId: string,
  supabase: SupabaseClient
): Promise<number> {
  const { count } = await supabase
    .from('community_members')
    .select('*', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('role', 'admin')

  return count || 0
}

/**
 * Check if a role change is allowed (prevent removing last admin)
 */
export async function canChangeRole(
  communityId: string,
  userId: string,
  newRole: string,
  supabase: SupabaseClient
): Promise<boolean> {
  // If changing to admin, always allowed
  if (newRole === 'admin') {
    return true
  }

  // If changing from admin, check if there are other admins
  const adminCount = await countCommunityAdmins(communityId, supabase)

  // Get current role of user
  const { data: membership } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .single()

  // If user is currently admin and there's only one admin, prevent role change
  if (membership?.role === 'admin' && adminCount <= 1) {
    return false
  }

  return true
}
