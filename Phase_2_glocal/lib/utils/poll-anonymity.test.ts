import {
  generateVotingHash,
  verifyVotingHash,
  getAnonymousVoterId,
  isPollActive,
  calculatePollResults,
} from './poll-anonymity'

describe('Poll Anonymity Utilities', () => {
  const mockUserId = 'user-123-456-789'
  const mockPollId = 'poll-abc-def-ghi'
  const mockSecret = 'test-secret-key'

  describe('generateVotingHash', () => {
    it('should generate a consistent hash for same inputs', () => {
      const hash1 = generateVotingHash(mockUserId, mockPollId, mockSecret)
      const hash2 = generateVotingHash(mockUserId, mockPollId, mockSecret)

      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64) // SHA-256 produces 64 hex chars
    })

    it('should generate different hashes for different users', () => {
      const hash1 = generateVotingHash('user-1', mockPollId, mockSecret)
      const hash2 = generateVotingHash('user-2', mockPollId, mockSecret)

      expect(hash1).not.toBe(hash2)
    })

    it('should generate different hashes for different polls', () => {
      const hash1 = generateVotingHash(mockUserId, 'poll-1', mockSecret)
      const hash2 = generateVotingHash(mockUserId, 'poll-2', mockSecret)

      expect(hash1).not.toBe(hash2)
    })

    it('should be unlinkable across polls', () => {
      // Same user voting on two different polls should have completely different hashes
      const pollAHash = generateVotingHash(mockUserId, 'poll-A', mockSecret)
      const pollBHash = generateVotingHash(mockUserId, 'poll-B', mockSecret)

      // There should be no pattern or similarity
      expect(pollAHash).not.toBe(pollBHash)
      expect(pollAHash.slice(0, 10)).not.toBe(pollBHash.slice(0, 10))
    })
  })

  describe('verifyVotingHash', () => {
    it('should verify correct hash', () => {
      const hash = generateVotingHash(mockUserId, mockPollId, mockSecret)
      const isValid = verifyVotingHash(hash, mockUserId, mockPollId, mockSecret)

      expect(isValid).toBe(true)
    })

    it('should reject incorrect hash', () => {
      const wrongHash = 'incorrect-hash-value'
      const isValid = verifyVotingHash(wrongHash, mockUserId, mockPollId, mockSecret)

      expect(isValid).toBe(false)
    })
  })

  describe('getAnonymousVoterId', () => {
    it('should generate numeric ID from hash', () => {
      const hash = generateVotingHash(mockUserId, mockPollId, mockSecret)
      const voterId = getAnonymousVoterId(hash)

      expect(typeof voterId).toBe('number')
      expect(voterId).toBeGreaterThanOrEqual(0)
      expect(voterId).toBeLessThan(1000000)
    })

    it('should be consistent for same hash', () => {
      const hash = generateVotingHash(mockUserId, mockPollId, mockSecret)
      const id1 = getAnonymousVoterId(hash)
      const id2 = getAnonymousVoterId(hash)

      expect(id1).toBe(id2)
    })
  })

  describe('isPollActive', () => {
    it('should return true for polls with no expiry', () => {
      const isActive = isPollActive(null)

      expect(isActive).toBe(true)
    })

    it('should return true for polls expiring in the future', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const isActive = isPollActive(futureDate)

      expect(isActive).toBe(true)
    })

    it('should return false for expired polls', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const isActive = isPollActive(pastDate)

      expect(isActive).toBe(false)
    })

    it('should handle edge case of poll expiring exactly now', () => {
      const now = new Date().toISOString()
      const isActive = isPollActive(now)

      // Should be inactive (now is not less than now)
      expect(isActive).toBe(false)
    })
  })

  describe('calculatePollResults', () => {
    it('should calculate percentages correctly', () => {
      const options = [
        { id: '1', text: 'Option A', vote_count: 30 },
        { id: '2', text: 'Option B', vote_count: 50 },
        { id: '3', text: 'Option C', vote_count: 20 },
      ]

      const results = calculatePollResults(options)

      expect(results[0].percentage).toBe(30) // 30/100 = 30%
      expect(results[1].percentage).toBe(50) // 50/100 = 50%
      expect(results[2].percentage).toBe(20) // 20/100 = 20%
    })

    it('should handle zero votes', () => {
      const options = [
        { id: '1', text: 'Option A', vote_count: 0 },
        { id: '2', text: 'Option B', vote_count: 0 },
      ]

      const results = calculatePollResults(options)

      expect(results[0].percentage).toBe(0)
      expect(results[1].percentage).toBe(0)
    })

    it('should round percentages', () => {
      const options = [
        { id: '1', text: 'Option A', vote_count: 1 },
        { id: '2', text: 'Option B', vote_count: 2 },
      ]

      const results = calculatePollResults(options)

      // 1/3 = 33.33% -> rounds to 33
      // 2/3 = 66.66% -> rounds to 67
      expect(results[0].percentage).toBe(33)
      expect(results[1].percentage).toBe(67)
    })

    it('should preserve original vote counts', () => {
      const options = [
        { id: '1', text: 'Option A', vote_count: 100 },
        { id: '2', text: 'Option B', vote_count: 200 },
      ]

      const results = calculatePollResults(options)

      expect(results[0].vote_count).toBe(100)
      expect(results[1].vote_count).toBe(200)
    })
  })
})
