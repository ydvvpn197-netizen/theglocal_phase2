/**
 * Anonymous Avatar Generator
 * Generates deterministic geometric patterns based on user ID
 * Similar to GitHub identicons but with modern geometric designs
 */

/**
 * Generate SVG geometric avatar from seed
 * @param seed User ID or avatar seed (16 chars)
 * @returns SVG string
 */
export function generateGeometricAvatar(seed: string): string {
  // Convert seed to numbers for deterministic pattern
  const hash = hashCode(seed)

  // Generate colors from hash
  const hue = Math.abs(hash) % 360
  const color1 = `hsl(${hue}, 70%, 60%)`
  const color2 = `hsl(${(hue + 30) % 360}, 70%, 50%)`
  const bgColor = `hsl(${hue}, 30%, 95%)`

  // Choose pattern type (0-5)
  const patternType = Math.abs(hash) % 6

  const svg = `
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="${bgColor}"/>
      ${getPattern(patternType, color1, color2, hash)}
    </svg>
  `

  return svg.trim()
}

/**
 * Generate pattern based on type
 */
function getPattern(type: number, color1: string, color2: string, hash: number): string {
  const rotation = (Math.abs(hash) % 4) * 90

  switch (type) {
    case 0: // Circles
      return `
        <circle cx="30" cy="30" r="20" fill="${color1}"/>
        <circle cx="70" cy="70" r="20" fill="${color2}"/>
        <circle cx="50" cy="50" r="15" fill="${color1}" opacity="0.7"/>
      `
    case 1: // Squares
      return `
        <rect x="20" y="20" width="30" height="30" fill="${color1}" transform="rotate(${rotation} 35 35)"/>
        <rect x="50" y="50" width="30" height="30" fill="${color2}" transform="rotate(${rotation} 65 65)"/>
      `
    case 2: // Triangles
      return `
        <polygon points="50,20 80,70 20,70" fill="${color1}" transform="rotate(${rotation} 50 50)"/>
        <polygon points="50,30 70,60 30,60" fill="${color2}" opacity="0.8"/>
      `
    case 3: // Diamonds
      return `
        <polygon points="50,10 90,50 50,90 10,50" fill="${color1}" opacity="0.7"/>
        <polygon points="50,30 70,50 50,70 30,50" fill="${color2}"/>
      `
    case 4: // Rings
      return `
        <circle cx="50" cy="50" r="35" fill="none" stroke="${color1}" stroke-width="8"/>
        <circle cx="50" cy="50" r="20" fill="${color2}"/>
      `
    case 5: // Grid pattern
      return `
        <rect x="10" y="10" width="20" height="20" fill="${color1}"/>
        <rect x="40" y="10" width="20" height="20" fill="${color2}"/>
        <rect x="70" y="10" width="20" height="20" fill="${color1}"/>
        <rect x="10" y="40" width="20" height="20" fill="${color2}"/>
        <rect x="40" y="40" width="20" height="20" fill="${color1}"/>
        <rect x="70" y="40" width="20" height="20" fill="${color2}"/>
        <rect x="10" y="70" width="20" height="20" fill="${color1}"/>
        <rect x="40" y="70" width="20" height="20" fill="${color2}"/>
        <rect x="70" y="70" width="20" height="20" fill="${color1}"/>
      `
    default:
      return `<circle cx="50" cy="50" r="30" fill="${color1}"/>`
  }
}

/**
 * Simple hash function for strings
 */
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash
}

/**
 * Convert SVG string to data URL
 */
export function avatarToDataUrl(svg: string): string {
  const base64 = Buffer.from(svg).toString('base64')
  return `data:image/svg+xml;base64,${base64}`
}

/**
 * Generate avatar as data URL (ready for img src)
 */
export function generateAvatarDataUrl(seed: string): string {
  const svg = generateGeometricAvatar(seed)
  return avatarToDataUrl(svg)
}
