import { logger } from '@/lib/utils/logger'
export function safeJsonParse<T = unknown>(jsonString: string | null | undefined): T | null {
  if (!jsonString || typeof jsonString !== 'string') {
    return null
  }

  try {
    return JSON.parse(jsonString) as T
  } catch (error) {
    logger.warn('Invalid JSON string provided:', error)
    return null
  }
}

export function safeArrayAccess<T>(array: T[] | null | undefined, index: number): T | null {
  if (!Array.isArray(array) || index < 0 || index >= array.length) {
    return null
  }
  return array[index] ?? null
}

export function safeGet<T>(obj: unknown, path: string, defaultValue: T): T {
  if (!obj || typeof obj !== 'object') {
    return defaultValue
  }

  const keys = path.split('.')
  let current = obj as Record<string, unknown>

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key] as Record<string, unknown>
    } else {
      return defaultValue
    }
  }

  return current as T
}

export function validateUrl(url: string | null | undefined): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'Invalid URL string' }
  }

  try {
    const urlObj = new URL(url)

    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'Only HTTP/HTTPS URLs allowed' }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: 'Malformed URL' }
  }
}

export function validateFormData(data: FormData | null | undefined): {
  valid: boolean
  error?: string
} {
  if (!data || !(data instanceof FormData)) {
    return { valid: false, error: 'Invalid FormData object' }
  }

  for (const [key, value] of data.entries()) {
    if (typeof key !== 'string') {
      return { valid: false, error: 'Invalid form field name' }
    }

    if (typeof value === 'string' && value.length > 10000) {
      return { valid: false, error: `Field '${key}' exceeds maximum length` }
    }
  }

  return { valid: true }
}

export function validatePagination(params: { page?: unknown; limit?: unknown }): {
  valid: boolean
  page: number
  limit: number
  error?: string
} {
  let page = 1
  let limit = 20

  if (params.page !== undefined) {
    const pageNum = Number(params.page)
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      return { valid: false, page: 1, limit: 20, error: 'Invalid page number' }
    }
    page = pageNum
  }

  if (params.limit !== undefined) {
    const limitNum = Number(params.limit)
    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) {
      return { valid: false, page, limit: 20, error: 'Invalid limit (must be 1-100)' }
    }
    limit = limitNum
  }

  return { valid: true, page, limit }
}

export function validateSearchQuery(query: unknown): {
  valid: boolean
  query?: string
  error?: string
} {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Invalid search query' }
  }

  const trimmed = query.trim()

  if (trimmed.length === 0) {
    return { valid: false, error: 'Empty search query' }
  }

  if (trimmed.length > 200) {
    return { valid: false, error: 'Search query too long (max 200 characters)' }
  }

  const sanitized = trimmed.replace(/[<>]/g, '')

  return { valid: true, query: sanitized }
}

export function isValidObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0
}

export function safeNumber(
  value: unknown,
  min = -Infinity,
  max = Infinity,
  defaultValue = 0
): number {
  const num = Number(value)

  if (!Number.isFinite(num)) {
    return defaultValue
  }

  return Math.min(max, Math.max(min, num))
}

export function safeString(value: unknown, maxLength = 1000): string {
  if (typeof value !== 'string') {
    return String(value || '').slice(0, maxLength)
  }

  return value.slice(0, maxLength)
}

export function validateEmail(email: string | null | undefined): {
  valid: boolean
  error?: string
} {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' }
  }

  const trimmed = email.trim().toLowerCase()

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address' }
  }

  if (trimmed.length > 255) {
    return { valid: false, error: 'Email address is too long' }
  }

  return { valid: true }
}

export function validatePhone(phone: string | null | undefined): {
  valid: boolean
  error?: string
  normalized?: string
} {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' }
  }

  const cleaned = phone.replace(/[^\d+]/g, '')

  if (!cleaned.startsWith('+')) {
    return {
      valid: false,
      error: 'Phone number must include country code (e.g., +1234567890)',
      normalized: cleaned.startsWith('+') ? cleaned : `+${cleaned}`,
    }
  }

  const e164Regex = /^\+[1-9]\d{1,14}$/

  if (!e164Regex.test(cleaned)) {
    return {
      valid: false,
      error: 'Please enter a valid phone number with country code (e.g., +1234567890)',
      normalized: cleaned,
    }
  }

  return { valid: true, normalized: cleaned }
}

export function validateContact(contact: string | null | undefined): {
  valid: boolean
  error?: string
  type?: 'email' | 'phone'
  normalized?: string
} {
  if (!contact || typeof contact !== 'string') {
    return { valid: false, error: 'Email or phone number is required' }
  }

  const trimmed = contact.trim()

  if (trimmed.includes('@')) {
    const emailValidation = validateEmail(trimmed)
    if (emailValidation.valid) {
      return { valid: true, type: 'email', normalized: trimmed.toLowerCase() }
    }
    return { valid: false, error: emailValidation.error, type: 'email' }
  }

  const phoneValidation = validatePhone(trimmed)
  if (phoneValidation.valid) {
    return {
      valid: true,
      type: 'phone',
      normalized: phoneValidation.normalized || trimmed,
    }
  }

  return {
    valid: false,
    error: phoneValidation.error || 'Please enter a valid email or phone number',
    type: 'phone',
  }
}
