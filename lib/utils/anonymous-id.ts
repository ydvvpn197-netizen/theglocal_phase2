/**
 * Anonymous ID Generator
 * Generates anonymous handles in format: LocalAdjective+Noun+3digits
 * Example: "LocalHappyPanda547"
 */

const adjectives = [
  'Happy',
  'Bright',
  'Swift',
  'Clever',
  'Gentle',
  'Bold',
  'Calm',
  'Wise',
  'Brave',
  'Kind',
  'Quick',
  'Smart',
  'Loyal',
  'Noble',
  'Eager',
  'Keen',
  'Proud',
  'Witty',
  'Agile',
  'Vibrant',
  'Curious',
  'Friendly',
  'Peaceful',
  'Cheerful',
  'Graceful',
]

const nouns = [
  'Panda',
  'Tiger',
  'Eagle',
  'Dolphin',
  'Falcon',
  'Phoenix',
  'Dragon',
  'Lion',
  'Wolf',
  'Bear',
  'Hawk',
  'Owl',
  'Fox',
  'Deer',
  'Raven',
  'Swan',
  'Orca',
  'Lynx',
  'Cobra',
  'Cheetah',
  'Jaguar',
  'Penguin',
  'Koala',
  'Otter',
  'Badger',
]

// Profanity filter - block inappropriate combinations
const blockedWords = new Set([
  // Add any inappropriate words to block
  'badword1',
  'badword2',
])

/**
 * Generates a random anonymous handle
 * @returns string in format "LocalAdjectiveNoun###"
 */
export function generateAnonymousHandle(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const digits = Math.floor(Math.random() * 900) + 100 // 100-999

  const handle = `Local${adjective}${noun}${digits}`

  // Check against profanity filter
  if (isHandleInappropriate(handle)) {
    // Recursively try again if blocked
    return generateAnonymousHandle()
  }

  return handle
}

/**
 * Checks if handle contains inappropriate words
 */
function isHandleInappropriate(handle: string): boolean {
  const lowerHandle = handle.toLowerCase()
  return Array.from(blockedWords).some((word) => lowerHandle.includes(word))
}

/**
 * Generates a deterministic avatar seed from user ID
 * Used for consistent geometric patterns
 */
export function generateAvatarSeed(userId: string): string {
  // Use user ID as seed for deterministic avatar generation
  return userId.slice(0, 16)
}

/**
 * Validates anonymous handle format
 */
export function isValidAnonymousHandle(handle: string): boolean {
  // Should start with "Local" and end with 3 digits
  const pattern = /^Local[A-Z][a-z]+[A-Z][a-z]+\d{3}$/
  return pattern.test(handle)
}

/**
 * Generates a unique anonymous handle for a user
 * Checks database to ensure uniqueness
 */
export async function generateUniqueAnonymousHandle(userId: string): Promise<string> {
  // Import here to avoid circular dependencies
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    const handle = generateAnonymousHandle()

    // Check if handle already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('anonymous_handle', handle)
      .single()

    if (!existing) {
      return handle
    }

    attempts++
  }

  // Fallback: use userId-based handle if all attempts fail
  return `LocalUser${userId.slice(0, 8)}${Math.floor(Math.random() * 900) + 100}`
}
