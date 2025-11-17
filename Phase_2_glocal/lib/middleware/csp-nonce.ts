/**
 * CSP Nonce Generation for Edge Runtime
 *
 * Generates cryptographically secure nonces for Content Security Policy.
 * Nonces must be unique per request and cannot be guessed by attackers.
 *
 * Uses Web Crypto API which is available in Edge Runtime.
 */

/**
 * Generate a cryptographically secure random nonce
 * @returns Base64URL-encoded nonce string
 */
export function generateNonce(): string {
  // Generate 16 random bytes (128 bits) for sufficient entropy
  const bytes = new Uint8Array(16)

  // Use crypto.getRandomValues which is available in Edge Runtime
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    // Fallback for environments without crypto (shouldn't happen in Edge Runtime)
    throw new Error('Crypto API not available - nonce generation failed')
  }

  // Convert to Base64URL (URL-safe base64)
  // This is more efficient and secure than base64 for CSP nonces
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Get nonce from request headers
 * @param headers - Headers object (NextRequest.headers or Headers)
 * @returns Nonce string or undefined if not found
 */
export function getNonceFromHeaders(headers: Headers | HeadersInit): string | undefined {
  if (headers instanceof Headers) {
    return headers.get('x-nonce') ?? undefined
  }

  // Handle HeadersInit (Record<string, string> or array)
  if (Array.isArray(headers)) {
    const entry = headers.find(([key]) => key.toLowerCase() === 'x-nonce')
    return entry?.[1]
  }

  // Handle Record<string, string>
  const lowerHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  )
  return lowerHeaders['x-nonce']
}

/**
 * Validate nonce format (Base64URL, 16-32 characters)
 * @param nonce - Nonce string to validate
 * @returns true if nonce format is valid
 */
export function isValidNonce(nonce: string): boolean {
  // Base64URL characters: A-Z, a-z, 0-9, -, _
  const base64UrlRegex = /^[A-Za-z0-9_-]{16,32}$/
  return base64UrlRegex.test(nonce)
}
