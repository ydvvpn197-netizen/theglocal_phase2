/**
 * Generic Permission System
 *
 * Factory pattern for creating resource-specific permission checkers.
 * Eliminates duplication across different resource types (polls, messages, posts, etc.)
 */

export type RoleChecker<T = unknown> = (
  userId: string | null,
  resource: T,
  context?: unknown
) => boolean

export interface ResourcePermissions<T extends { author_id: string }> {
  canDelete: (userId: string | null, resource: T, context?: unknown) => boolean
  canEdit: (userId: string | null, resource: T, context?: unknown) => boolean
}

/**
 * Create generic permission checkers for a resource type
 *
 * @param checkRole - Function that checks if user has elevated role (admin, moderator, etc.)
 * @param additionalEditCheck - Optional function for additional edit constraints (e.g., time windows)
 * @returns Object with canDelete and canEdit functions
 *
 * @example
 * ```typescript
 * const pollPermissions = createResourcePermissions<Poll>(
 *   (userId, poll, context) => {
 *     const role = context as CommunityRole
 *     return role?.role === 'admin' || role?.role === 'moderator'
 *   }
 * )
 *
 * const canDelete = pollPermissions.canDelete(userId, poll, communityRole)
 * ```
 */
export function createResourcePermissions<T extends { author_id: string }>(
  checkRole: RoleChecker<T> = () => false,
  additionalEditCheck?: (userId: string | null, resource: T, context?: unknown) => boolean
): ResourcePermissions<T> {
  return {
    /**
     * Check if user can delete a resource
     * Rules: User is the creator OR has elevated role
     */
    canDelete: (userId: string | null, resource: T, context?: unknown): boolean => {
      if (!userId) return false

      // Creator can always delete
      if (resource.author_id === userId) return true

      // Check if user has elevated role
      return checkRole(userId, resource, context)
    },

    /**
     * Check if user can edit a resource
     * Rules: User is the creator OR has elevated role (and passes additional checks if provided)
     */
    canEdit: (userId: string | null, resource: T, context?: unknown): boolean => {
      if (!userId) return false

      // Creator can always edit (unless additional checks fail)
      if (resource.author_id === userId) {
        // Apply additional edit checks if provided
        if (additionalEditCheck) {
          return additionalEditCheck(userId, resource, context)
        }
        return true
      }

      // Check if user has elevated role
      return checkRole(userId, resource, context)
    },
  }
}

/**
 * Check if user is the creator/author of a resource
 */
export function isResourceCreator<T extends { author_id: string }>(
  userId: string | null,
  resource: T
): boolean {
  if (!userId) return false
  return resource.author_id === userId
}
