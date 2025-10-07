import { generateAnonymousHandle, generateAvatarSeed, isValidAnonymousHandle } from './anonymous-id'

describe('generateAnonymousHandle', () => {
  it('generates handle in correct format', () => {
    const handle = generateAnonymousHandle()
    expect(handle).toMatch(/^Local[A-Z][a-z]+[A-Z][a-z]+\d{3}$/)
  })

  it('generates unique handles', () => {
    const handles = new Set()
    for (let i = 0; i < 100; i++) {
      handles.add(generateAnonymousHandle())
    }
    // Should have high uniqueness
    expect(handles.size).toBeGreaterThan(90)
  })

  it('starts with "Local"', () => {
    const handle = generateAnonymousHandle()
    expect(handle).toMatch(/^Local/)
  })

  it('ends with 3 digits', () => {
    const handle = generateAnonymousHandle()
    expect(handle).toMatch(/\d{3}$/)
  })
})

describe('generateAvatarSeed', () => {
  it('generates deterministic seed from user ID', () => {
    const userId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    const seed1 = generateAvatarSeed(userId)
    const seed2 = generateAvatarSeed(userId)
    expect(seed1).toBe(seed2)
  })

  it('returns first 16 characters', () => {
    const userId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    const seed = generateAvatarSeed(userId)
    expect(seed).toHaveLength(16)
    expect(seed).toBe('a1b2c3d4-e5f6-78')
  })
})

describe('isValidAnonymousHandle', () => {
  it('validates correct format', () => {
    expect(isValidAnonymousHandle('LocalHappyPanda547')).toBe(true)
    expect(isValidAnonymousHandle('LocalBrightEagle123')).toBe(true)
  })

  it('rejects invalid formats', () => {
    expect(isValidAnonymousHandle('InvalidHandle')).toBe(false)
    expect(isValidAnonymousHandle('LocalTest1')).toBe(false) // Missing second word
    expect(isValidAnonymousHandle('localhappypanda547')).toBe(false) // Wrong case
    expect(isValidAnonymousHandle('LocalHappyPanda54')).toBe(false) // Only 2 digits
  })
})
