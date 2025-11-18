/**
 * Admin and Moderator Verification Utilities
 * Provides functions for verifying admin/moderator access in API routes
 */

import { isSuperAdmin, getUserCommunityRole } from './permissions'

/**
 * Error thrown when user lacks admin/moderator access
 */
export class AdminAccessDeniedError extends Error {
  constructor(message = 'Admin or moderator access required') {
    super(message)
    this.name = 'AdminAccessDeniedError'
  }
}

/**
 * Check if user is admin or moderator of a community
 * Returns true if user is admin or moderator, false otherwise
 */
export async function isAdminOrModerator(
  userId: string,
  communityId: string | null
): Promise<boolean> {
  // If no community, check only super admin
  if (!communityId) {
    return await isSuperAdmin(userId)
  }

  // Check super admin first (super admins have access to all communities)
  const superAdmin = await isSuperAdmin(userId)
  if (superAdmin) {
    return true
  }

  // Check community role
  const role = await getUserCommunityRole(userId, communityId)
  return role === 'admin' || role === 'moderator'
}

/**
 * Require that user is admin or moderator of a community
 * Throws AdminAccessDeniedError if user lacks access
 */
export async function requireAdminOrModerator(
  userId: string,
  communityId: string | null
): Promise<void> {
  const hasAccess = await isAdminOrModerator(userId, communityId)
  if (!hasAccess) {
    throw new AdminAccessDeniedError('Admin or moderator access required')
  }
}

/**
 * Require that user is super admin OR admin/moderator of a community
 * This is the main function for moderation and report endpoints
 * Throws AdminAccessDeniedError if user lacks access
 */
export async function requireSuperAdminOrCommunityAdminModerator(
  userId: string,
  communityId: string | null
): Promise<void> {
  const hasAccess = await isAdminOrModerator(userId, communityId)
  if (!hasAccess) {
    throw new AdminAccessDeniedError('Super admin or community admin/moderator access required')
  }
}
