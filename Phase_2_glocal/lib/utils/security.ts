/**
 * Security Utilities
 * Input sanitization, CSRF protection, and security helpers
 */

/**
 * Sanitize user input to prevent XSS attacks
 * Removes potentially dangerous HTML/script tags
 */
export function sanitizeInput(input: string): string {
  if (!input) return ''

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

/**
 * Sanitize HTML content
 * Allows basic formatting but removes dangerous elements
 */
export function sanitizeHTML(html: string): string {
  if (!html) return ''

  const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote']
  const dangerous = /<script|<iframe|javascript:|on\w+=/gi

  if (dangerous.test(html)) {
    return sanitizeInput(html)
  }

  return html
}

/**
 * Validate and sanitize URL
 * Prevents javascript: and data: URLs
 */
export function sanitizeURL(url: string): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url)

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }

    return parsed.toString()
  } catch {
    return null
  }
}

/**
 * Validate email format (additional check beyond Zod)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/
  return phoneRegex.test(phone)
}

/**
 * Check if input contains SQL injection patterns
 */
export function hasSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(--|;|\/\*|\*\/)/g,
    /(\bOR\b.*=.*)/gi,
    /(\bAND\b.*=.*)/gi,
  ]

  return sqlPatterns.some((pattern) => pattern.test(input))
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  if (typeof window === 'undefined') {
    // Server-side: use crypto
    const crypto = require('crypto')
    return crypto.randomBytes(32).toString('hex')
  } else {
    // Client-side: use Web Crypto API
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(token: string, expectedToken: string): boolean {
  if (!token || !expectedToken) return false
  return token === expectedToken
}

/**
 * Rate limit check (simplified version)
 * Full implementation in lib/middleware/rate-limit.ts
 */
export function checkRateLimit(identifier: string, limit: number, windowMs: number): boolean {
  // This is a placeholder - actual implementation in middleware
  return true
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Escape special characters for safe display
 */
export function escapeHTML(unsafe: string): string {
  if (!unsafe) return ''

  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Check if string contains only safe characters
 */
export function isSafeString(input: string): boolean {
  // Allows alphanumeric, spaces, and common punctuation
  const safePattern = /^[a-zA-Z0-9\s.,!?'"()\-_@#$%&*+=:;/\\[\]{}]+$/
  return safePattern.test(input)
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: File, options: {
  maxSize?: number
  allowedTypes?: string[]
}): { valid: boolean; error?: string } {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  } = options

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only images are allowed.',
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(0)}MB.`,
    }
  }

  return { valid: true }
}

/**
 * Prevent timing attacks on string comparison
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

