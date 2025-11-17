/**
 * Poll Permission Utilities
 * Check if users can perform actions on polls
 *
 * Uses the generic permission system from permissions/base.ts
 */

import type { Poll, PollPermissions } from '@/lib/types/poll.types'
import { createResourcePermissions, isResourceCreator } from './permissions/base'

export interface CommunityRole {
  role: 'admin' | 'moderator' | 'member' | null
}

/**
 * Create poll-specific permissions using the generic factory
 */
const pollPermissions = createResourcePermissions<Poll>((_userId, _poll, context) => {
  // Check if user has elevated role in community
  const communityRole = context as CommunityRole | null
  return communityRole?.role === 'admin' || communityRole?.role === 'moderator'
})

/**
 * Check if user can delete a poll
 * Allow: poll creator OR community admin/moderator
 */
export function canDeletePoll(
  userId: string | null,
  poll: Poll,
  communityRole: CommunityRole | null
): boolean {
  return pollPermissions.canDelete(userId, poll, communityRole)
}

/**
 * Check if user can edit a poll
 * Allow: poll creator OR community admin/moderator
 */
export function canEditPoll(
  userId: string | null,
  poll: Poll,
  communityRole: CommunityRole | null
): boolean {
  return pollPermissions.canEdit(userId, poll, communityRole)
}

/**
 * Check if user is the poll creator
 */
export function isPollCreator(userId: string | null, poll: Poll): boolean {
  return isResourceCreator(userId, poll)
}

/**
 * Check if user is a community admin or moderator
 */
export function isCommunityAdmin(communityRole: CommunityRole | null): boolean {
  return communityRole?.role === 'admin' || communityRole?.role === 'moderator'
}

/**
 * Get all permissions for a user on a poll
 */
export function getPollPermissions(
  userId: string | null,
  poll: Poll,
  communityRole: CommunityRole | null
): PollPermissions {
  return {
    canDelete: canDeletePoll(userId, poll, communityRole),
    canEdit: canEditPoll(userId, poll, communityRole),
    canVote: !poll.user_voted, // Simple check, can be enhanced
    isCreator: isPollCreator(userId, poll),
    isAdmin: isCommunityAdmin(communityRole),
  }
}
