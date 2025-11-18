/**
 * Environment Variable Validation
 *
 * Validates required environment variables at application startup.
 * Throws errors if required variables are missing or invalid.
 *
 * This should be called early in the application lifecycle (e.g., in middleware or app initialization).
 */

import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

/**
 * Schema for required environment variables
 * These must be present for the application to function
 */
const requiredEnvSchema = z.object({
  // Supabase (Required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
})

/**
 * Schema for optional but recommended environment variables
 * These are validated if present but won't fail if missing
 */
const optionalEnvSchema = z.object({
  // Application URLs
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Admin
  SUPER_ADMIN_EMAILS: z.string().optional(),

  // Redis (optional - falls back to in-memory)
  REDIS_URL: z.string().url().optional(),
  REDIS_TOKEN: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),

  // Payment Gateway
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),

  // Email Service
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  // External APIs
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  GOOGLE_GEOCODING_API_KEY: z.string().optional(),
  GOOGLE_NEWS_API_KEY: z.string().optional(),
  NEWS_API_KEY: z.string().optional(),
  REDDIT_CLIENT_ID: z.string().optional(),
  REDDIT_CLIENT_SECRET: z.string().optional(),
  BOOKMYSHOW_API_KEY: z.string().optional(),
  NEXT_PUBLIC_GIPHY_API_KEY: z.string().optional(),

  // Event Platforms
  EVENTBRITE_CLIENT_ID: z.string().optional(),
  EVENTBRITE_CLIENT_SECRET: z.string().optional(),
  MEETUP_CLIENT_ID: z.string().optional(),
  MEETUP_CLIENT_SECRET: z.string().optional(),

  // Monitoring
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

  // Cron & Webhooks
  CRON_SECRET: z.string().min(32, 'CRON_SECRET must be at least 32 characters').optional(),
  GEOCODING_WEBHOOK_SECRET: z.string().optional(),

  // AdSense
  NEXT_PUBLIC_GOOGLE_ADSENSE_PUB_ID: z.string().optional(),

  // Development
  ANALYZE: z.enum(['true', 'false']).optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
})

/**
 * Validate required environment variables
 * Throws an error if any required variables are missing or invalid
 *
 * @throws Error if validation fails
 */
export function validateRequiredEnv(): void {
  // Skip validation on client-side
  if (typeof window !== 'undefined') {
    return
  }

  const result = requiredEnvSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.issues.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    }))

    logger.error('❌ Missing or invalid required environment variables', undefined, {
      errors,
      help: 'See .env.example for required variables',
    })

    throw new Error(
      `Missing or invalid required environment variables:\n${errors.map((e) => `  - ${e.path}: ${e.message}`).join('\n')}\n\nSee .env.example for required variables.`
    )
  }

  logger.info('✅ Required environment variables validated')
}

/**
 * Validate optional environment variables
 * Logs warnings for missing recommended variables but doesn't throw
 *
 * @returns Object with validation results and warnings
 */
export function validateOptionalEnv(): {
  isValid: boolean
  warnings: string[]
} {
  // Skip validation on client-side
  if (typeof window !== 'undefined') {
    return { isValid: true, warnings: [] }
  }

  const result = optionalEnvSchema.safeParse(process.env)
  const warnings: string[] = []

  if (!result.success) {
    const errors = result.error.issues
    errors.forEach((err) => {
      warnings.push(`${err.path.join('.')}: ${err.message}`)
    })
  }

  // Check for recommended variables that are missing
  const recommendedVars = ['NEXT_PUBLIC_SITE_URL', 'CRON_SECRET', 'GEOCODING_WEBHOOK_SECRET']

  recommendedVars.forEach((varName) => {
    if (!process.env[varName]) {
      warnings.push(`Recommended variable ${varName} is not set`)
    }
  })

  if (warnings.length > 0) {
    logger.warn('⚠️  Optional environment variable warnings', { warnings })
  }

  return {
    isValid: result.success,
    warnings,
  }
}

/**
 * Validate all environment variables (required + optional)
 * Throws if required variables are missing, logs warnings for optional
 *
 * @throws Error if required validation fails
 */
export function validateEnv(): void {
  validateRequiredEnv()
  validateOptionalEnv()
}

/**
 * Get environment variable validation status
 * Useful for health checks or startup diagnostics
 */
export function getEnvValidationStatus(): {
  required: { isValid: boolean; errors: string[] }
  optional: { isValid: boolean; warnings: string[] }
} {
  // Skip validation on client-side
  if (typeof window !== 'undefined') {
    return {
      required: { isValid: true, errors: [] },
      optional: { isValid: true, warnings: [] },
    }
  }

  const requiredResult = requiredEnvSchema.safeParse(process.env)
  const optionalResult = validateOptionalEnv()

  return {
    required: {
      isValid: requiredResult.success,
      errors: requiredResult.success
        ? []
        : requiredResult.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`),
    },
    optional: optionalResult,
  }
}
