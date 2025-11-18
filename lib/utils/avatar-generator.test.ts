import { generateGeometricAvatar, generateAvatarDataUrl, avatarToDataUrl } from './avatar-generator'

describe('generateGeometricAvatar', () => {
  it('generates valid SVG', () => {
    const svg = generateGeometricAvatar('test-seed-12345')
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
    expect(svg).toContain('viewBox="0 0 100 100"')
  })

  it('generates deterministic patterns from same seed', () => {
    const seed = 'a1b2c3d4-e5f6-78'
    const svg1 = generateGeometricAvatar(seed)
    const svg2 = generateGeometricAvatar(seed)
    expect(svg1).toBe(svg2)
  })

  it('generates different patterns from different seeds', () => {
    const svg1 = generateGeometricAvatar('seed-12345678')
    const svg2 = generateGeometricAvatar('different-seed')
    expect(svg1).not.toBe(svg2)
  })

  it('includes HSL colors', () => {
    const svg = generateGeometricAvatar('test-seed-12345')
    expect(svg).toMatch(/hsl\(\d+,\s*\d+%,\s*\d+%\)/)
  })
})

describe('avatarToDataUrl', () => {
  it('converts SVG to data URL', () => {
    const svg = '<svg width="100" height="100"></svg>'
    const dataUrl = avatarToDataUrl(svg)
    expect(dataUrl).toMatch(/^data:image\/svg\+xml;base64,/)
  })

  it('generates valid base64', () => {
    const svg = '<svg width="100" height="100"></svg>'
    const dataUrl = avatarToDataUrl(svg)
    const base64Part = dataUrl.split(',')[1]
    expect(base64Part).toBeTruthy()
    expect(base64Part?.length).toBeGreaterThan(0)
  })
})

describe('generateAvatarDataUrl', () => {
  it('generates complete data URL from seed', () => {
    const dataUrl = generateAvatarDataUrl('test-seed-12345')
    expect(dataUrl).toMatch(/^data:image\/svg\+xml;base64,/)
  })

  it('generates deterministic data URL from same seed', () => {
    const seed = 'a1b2c3d4-e5f6-78'
    const url1 = generateAvatarDataUrl(seed)
    const url2 = generateAvatarDataUrl(seed)
    expect(url1).toBe(url2)
  })

  it('can be used as img src', () => {
    const dataUrl = generateAvatarDataUrl('test-seed-12345')
    // Should be a valid data URL format
    expect(() => new URL(dataUrl)).not.toThrow()
  })
})
