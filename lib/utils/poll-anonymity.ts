/**
 * Poll Anonymity Utilities
 * Generates anonymous voting hashes to ensure:
 * 1. One vote per user per poll
 * 2. Complete anonymity (no user-vote association stored)
 * 3. Unlinkable votes across different polls
 */

import crypto from 'crypto'

/**
 * Generate anonymous voting hash for a user and poll
 * This hash is used to prevent duplicate voting while maintaining anonymity
 *
 * The hash is one-way and unlinkable:
 * - Different for each poll (even same user)
 * - Impossible to reverse-engineer the user ID
 * - Deterministic (same user + poll = same hash)
 *
 * @param userId User's UUID
 * @param pollId Poll's UUID
 * @param secret Server-side secret (from env)
 * @returns SHA-256 hash (64 hex chars)
 */
export function generateVotingHash(userId: string, pollId: string, secret: string): string {
  // Combine user ID, poll ID, and secret
  const data = `${userId}:${pollId}:${secret}`

  // Generate SHA-256 hash
  const hash = crypto.createHash('sha256').update(data).digest('hex')

  return hash
}

/**
 * Verify if a voting hash is valid (for potential future verification)
 * @param hash The hash to verify
 * @param userId User's UUID
 * @param pollId Poll's UUID
 * @param secret Server-side secret
 * @returns true if hash matches
 */
export function verifyVotingHash(
  hash: string,
  userId: string,
  pollId: string,
  secret: string
): boolean {
  const expectedHash = generateVotingHash(userId, pollId, secret)
  return hash === expectedHash
}

/**
 * Generate anonymous voter ID for display purposes
 * Shows as "Voter #12345" without revealing identity
 * @param votingHash The voting hash
 * @returns Numeric ID derived from hash
 */
export function getAnonymousVoterId(votingHash: string): number {
  // Take first 8 characters of hash and convert to number
  const hexSlice = votingHash.slice(0, 8)
  const numericId = parseInt(hexSlice, 16) % 1000000
  return numericId
}

/**
 * Validate poll voting eligibility
 * @param pollExpiresAt Poll expiry timestamp
 * @returns true if poll is still accepting votes
 */
export function isPollActive(pollExpiresAt: string | null): boolean {
  if (!pollExpiresAt) return true // No expiry = always active

  const expiryDate = new Date(pollExpiresAt)
  const now = new Date()

  return now < expiryDate
}

/**
 * Calculate poll results percentages
 * @param options Array of poll options with vote counts
 * @returns Options with percentage calculated
 */
export function calculatePollResults(
  options: Array<{ id: string; text: string; vote_count: number }>
): Array<{ id: string; text: string; vote_count: number; percentage: number }> {
  const totalVotes = options.reduce((sum, option) => sum + option.vote_count, 0)

  if (totalVotes === 0) {
    return options.map((option) => ({ ...option, percentage: 0 }))
  }

  return options.map((option) => ({
    ...option,
    percentage: Math.round((option.vote_count / totalVotes) * 100),
  }))
}
