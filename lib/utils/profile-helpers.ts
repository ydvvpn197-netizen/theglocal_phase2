/**
 * Profile utility functions for user profiles
 */

/**
 * Calculate karma score from upvotes and downvotes
 */
export function calculateKarma(upvotes: number, downvotes: number): number {
  return upvotes - downvotes
}

/**
 * Format join date in Reddit style ("Redditor for X years/months/days")
 */
export function formatJoinDate(joinDate: string | Date): string {
  const now = new Date()
  const joined = new Date(joinDate)
  const diffMs = now.getTime() - joined.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 1) return 'Joined today'
  if (diffDays === 1) return 'Joined 1 day ago'
  if (diffDays < 30) return `Joined ${diffDays} days ago`

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) {
    return diffMonths === 1 ? 'Joined 1 month ago' : `Joined ${diffMonths} months ago`
  }

  const diffYears = Math.floor(diffMonths / 12)
  const remainingMonths = diffMonths % 12

  if (remainingMonths === 0) {
    return diffYears === 1 ? 'Joined 1 year ago' : `Joined ${diffYears} years ago`
  }

  return `Joined ${diffYears}y ${remainingMonths}mo ago`
}

/**
 * Generate a random deleted user handle
 */
export function generateDeletedHandle(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let randomStr = ''
  for (let i = 0; i < 8; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `deleted_user_${randomStr}`
}

/**
 * Validate bio text
 */
export function validateBio(bio: string): { valid: boolean; error?: string } {
  if (!bio) return { valid: true }

  if (bio.length > 500) {
    return {
      valid: false,
      error: 'Bio must be 500 characters or less',
    }
  }

  // Check for excessive newlines
  const newlineCount = (bio.match(/\n/g) || []).length
  if (newlineCount > 10) {
    return {
      valid: false,
      error: 'Bio cannot have more than 10 line breaks',
    }
  }

  return { valid: true }
}

/**
 * Format karma with abbreviations (1.2k, 45.6k, 1.2M)
 */
export function formatKarma(karma: number): string {
  if (karma < 1000) return karma.toString()
  if (karma < 1000000) return `${(karma / 1000).toFixed(1)}k`
  return `${(karma / 1000000).toFixed(1)}M`
}

/**
 * Get badge color based on role
 */
export function getRoleBadgeVariant(
  role: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (role) {
    case 'admin':
      return 'destructive'
    case 'moderator':
      return 'default'
    case 'artist':
      return 'secondary'
    default:
      return 'outline'
  }
}
