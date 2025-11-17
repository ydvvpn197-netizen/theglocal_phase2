/**
 * Event Data Validator
 *
 * Validates all event fields before database storage
 */

import { logger } from '@/lib/utils/logger'
import { StandardizedEvent } from './types'
import { globalURLValidator } from '@/lib/utils/url-validator'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sanitizedEvent: StandardizedEvent
}

export class EventValidator {
  /**
   * Validate a single event
   */
  async validate(event: StandardizedEvent, checkUrls: boolean = true): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const sanitized = this.sanitizeEvent(event)

    // Required fields validation
    this.validateRequiredFields(sanitized, errors)

    // Field format validation
    this.validateFieldFormats(sanitized, errors, warnings)

    // URL validation (if enabled)
    if (checkUrls) {
      await this.validateUrls(sanitized, errors, warnings)
    }

    // Date validation
    this.validateDate(sanitized, errors, warnings)

    // Price validation
    this.validatePrice(sanitized, warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedEvent: sanitized,
    }
  }

  /**
   * Batch validate multiple events
   */
  async validateBatch(
    events: StandardizedEvent[],
    checkUrls: boolean = false // URLs check is expensive, default to false for batch
  ): Promise<ValidationResult[]> {
    return Promise.all(events.map((event) => this.validate(event, checkUrls)))
  }

  /**
   * Quick validation (no URL checks)
   */
  quickValidate(event: StandardizedEvent): Pick<ValidationResult, 'isValid' | 'errors'> {
    const errors: string[] = []
    const sanitized = this.sanitizeEvent(event)

    this.validateRequiredFields(sanitized, errors)
    this.validateFieldFormats(sanitized, errors, [])

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Sanitize event data with enhanced null/undefined handling
   */
  private sanitizeEvent(event: StandardizedEvent): StandardizedEvent {
    // Enhanced validation for event object
    if (!event || typeof event !== 'object') {
      throw new Error('Invalid event object provided for sanitization')
    }

    return {
      ...event,
      title: this.sanitizeString(event.title || ''),
      description: this.sanitizeString(event.description || ''),
      venue: this.sanitizeString(event.venue || ''),
      city: this.sanitizeString(event.city || ''),
      category:
        event.category && typeof event.category === 'string'
          ? event.category.toLowerCase()
          : 'event',
      price: this.sanitizePrice(event.price),
      language:
        event.language && typeof event.language === 'string'
          ? this.sanitizeString(event.language)
          : undefined,
      duration:
        event.duration && typeof event.duration === 'string'
          ? this.sanitizeString(event.duration)
          : undefined,
      genre:
        event.genre && typeof event.genre === 'string'
          ? this.sanitizeString(event.genre)
          : undefined,
      // Ensure required fields are preserved even if null/undefined
      external_id: this.sanitizeString(event.external_id || ''),
      event_date: event.event_date || '',
      source_platform: this.sanitizeString(event.source_platform || '') as
        | 'eventbrite'
        | 'insider'
        | 'allevents'
        | 'paytm-insider'
        | 'townscript'
        | 'explara'
        | 'meetup'
        | 'google-events',
      ticket_url:
        event.ticket_url && typeof event.ticket_url === 'string'
          ? event.ticket_url.trim()
          : undefined,
      image_url:
        event.image_url && typeof event.image_url === 'string' ? event.image_url.trim() : undefined,
    }
  }

  /**
   * Sanitize string: trim, remove extra whitespace, limit length with enhanced safety
   */
  private sanitizeString(str: string | null | undefined, maxLength: number = 500): string {
    // Enhanced null/undefined handling
    if (str === null || str === undefined) return ''
    if (typeof str !== 'string') return String(str || '')

    try {
      return str
        .trim()
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .slice(0, maxLength)
    } catch (error) {
      logger.warn('Error sanitizing string', { error, input: str })
      return ''
    }
  }

  /**
   * Sanitize price string with enhanced null handling and validation
   */
  private sanitizePrice(price?: string | null): string {
    // Enhanced null/undefined handling
    if (!price || typeof price !== 'string') return 'Check website'

    const sanitized = price.trim()
    if (sanitized === '') return 'Check website'

    try {
      // Check for common "free" variations
      if (/free|₹0|rs\.?\s*0|complimentary|no\s*charge/i.test(sanitized)) {
        return 'Free'
      }

      // Check for invalid/placeholder values
      if (/tbd|tba|to\s*be\s*(announced|determined)|coming\s*soon|n\/?a/i.test(sanitized)) {
        return 'Check website'
      }

      return sanitized
    } catch (error) {
      logger.warn('Error sanitizing price', { error, input: price })
      return 'Check website'
    }
  }

  /**
   * Validate required fields with enhanced null/undefined checking
   */
  private validateRequiredFields(event: StandardizedEvent, errors: string[]) {
    const requiredFields: Array<keyof StandardizedEvent> = [
      'external_id',
      'title',
      'event_date',
      'city',
      'venue',
      'source_platform',
    ]

    for (const field of requiredFields) {
      const value = event[field]

      // Enhanced validation for different types of "empty" values
      if (value === null || value === undefined) {
        errors.push(`Missing required field: ${field} (null/undefined)`)
        continue
      }

      if (typeof value === 'string') {
        const trimmed = value.trim()
        if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
          errors.push(`Missing required field: ${field} (empty string)`)
          continue
        }
      } else if (typeof value !== 'string') {
        errors.push(`Invalid field type for ${field}: expected string, got ${typeof value}`)
        continue
      }
    }

    // Description validation with enhanced checking
    const description = event.description
    if (!description || typeof description !== 'string') {
      errors.push('Description is required and must be a string')
    } else if (description.trim().length < 10) {
      errors.push('Description too short (minimum 10 characters)')
    }
  }

  /**
   * Validate field formats with enhanced null/undefined checking
   */
  private validateFieldFormats(event: StandardizedEvent, errors: string[], warnings: string[]) {
    // Title validation with null checking
    if (!event.title || typeof event.title !== 'string') {
      errors.push('Title must be a valid string')
      return // Skip further title validation
    }
    const titleLength = event.title.trim().length
    if (titleLength < 3) {
      errors.push('Title too short (minimum 3 characters)')
    }
    if (titleLength > 200) {
      warnings.push('Title very long (over 200 characters)')
    }

    // Description validation with null checking
    if (event.description && typeof event.description === 'string') {
      const descLength = event.description.trim().length
      if (descLength > 2000) {
        warnings.push('Description very long (over 2000 characters)')
      }
    }

    // Venue validation with null checking
    if (!event.venue || typeof event.venue !== 'string') {
      errors.push('Venue must be a valid string')
    } else if (event.venue.trim().length < 2) {
      errors.push('Venue name too short')
    }

    // City validation with null checking
    if (!event.city || typeof event.city !== 'string') {
      errors.push('City must be a valid string')
    } else if (event.city.trim().length < 2) {
      errors.push('City name too short')
    }

    // External ID validation with null checking
    if (!event.external_id || typeof event.external_id !== 'string') {
      errors.push('External ID must be a valid string')
    } else if (!event.external_id.includes('-')) {
      warnings.push('External ID should include platform prefix (e.g., "bms-eventid-123")')
    }

    // Source platform validation with null checking
    if (!event.source_platform || typeof event.source_platform !== 'string') {
      errors.push('Source platform must be a valid string')
    } else {
      const validPlatforms = [
        'bookmyshow',
        'eventbrite',
        'insider',
        'allevents',
        'paytm-insider',
        'artist',
        'community',
      ]
      if (!validPlatforms.includes(event.source_platform.toLowerCase())) {
        errors.push(`Invalid source platform: ${event.source_platform}`)
      }
    }
  }

  /**
   * Validate URLs
   */
  private async validateUrls(event: StandardizedEvent, errors: string[], warnings: string[]) {
    // Validate ticket URL (required for external events)
    if (event.ticket_url) {
      if (!globalURLValidator.quickValidate(event.ticket_url)) {
        errors.push(`Invalid ticket URL format: ${event.ticket_url}`)
      } else {
        // Check accessibility (with caching)
        const validation = await globalURLValidator.validateEventUrl(
          event.ticket_url,
          event.source_platform
        )

        if (!validation.isValid) {
          errors.push(`Ticket URL not accessible: ${validation.error}`)
        } else if (validation.statusCode && validation.statusCode >= 300) {
          warnings.push(`Ticket URL returned status ${validation.statusCode}`)
        }
      }
    } else {
      warnings.push('No ticket URL provided')
    }

    // Validate image URL (optional but recommended)
    if (event.image_url) {
      if (!globalURLValidator.quickValidate(event.image_url)) {
        warnings.push(`Invalid image URL format: ${event.image_url}`)
        event.image_url = undefined // Remove invalid image URL
      } else {
        // Quick accessibility check (no retry, with cache)
        const isValid = await globalURLValidator.isValidImageUrl(event.image_url)
        if (!isValid) {
          warnings.push('Image URL may not be accessible')
        }
      }
    } else {
      warnings.push('No image URL provided')
    }
  }

  /**
   * Validate event date
   */
  private validateDate(event: StandardizedEvent, errors: string[], warnings: string[]) {
    try {
      const eventDate = new Date(event.event_date)
      const now = new Date()

      // Check if date is valid
      if (isNaN(eventDate.getTime())) {
        errors.push('Invalid event date format')
        return
      }

      // Check if date is in the past (with 1 hour buffer for ongoing events)
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      if (eventDate < oneHourAgo) {
        warnings.push('Event date is in the past')
      }

      // Check if date is too far in the future (more than 1 year)
      const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      if (eventDate > oneYearFromNow) {
        warnings.push('Event date is more than 1 year in the future')
      }
    } catch {
      errors.push('Failed to parse event date')
    }
  }

  /**
   * Validate price format
   */
  private validatePrice(event: StandardizedEvent, warnings: string[]) {
    if (!event.price) return

    const price = event.price.toLowerCase()

    // Check for placeholder text
    const placeholders = ['tbd', 'tba', 'to be announced', 'coming soon', 'na', 'n/a']
    if (placeholders.some((ph) => price.includes(ph))) {
      warnings.push('Price contains placeholder text')
    }

    // Check if price looks reasonable
    if (price !== 'free' && price !== 'check website') {
      // Try to extract numeric value
      const numericMatch = price.match(/[\d,]+/)
      if (numericMatch) {
        const numericPrice = parseInt(numericMatch[0].replace(/,/g, ''))

        if (numericPrice > 100000) {
          warnings.push('Price seems unusually high (over ₹100,000)')
        }
      }
    }
  }

  /**
   * Get validation summary for a batch
   */
  getSummary(results: ValidationResult[]): {
    total: number
    valid: number
    invalid: number
    totalErrors: number
    totalWarnings: number
    commonErrors: Map<string, number>
  } {
    const commonErrors = new Map<string, number>()

    results.forEach((result) => {
      result.errors.forEach((error) => {
        commonErrors.set(error, (commonErrors.get(error) || 0) + 1)
      })
    })

    return {
      total: results.length,
      valid: results.filter((r) => r.isValid).length,
      invalid: results.filter((r) => !r.isValid).length,
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
      commonErrors,
    }
  }
}

// Global event validator instance
export const globalEventValidator = new EventValidator()
