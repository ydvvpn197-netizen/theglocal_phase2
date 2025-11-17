import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

/**
 * Environment variable schema with validation
 * All required environment variables must be present and valid
 */
const envSchema = z.object({
  // Supabase (Required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  // Server-only: Only validate on server-side (not in browser)
  SUPABASE_SERVICE_ROLE_KEY:
    typeof window === 'undefined'
      ? z.string().min(1, 'Supabase service role key is required')
      : z.string().optional(),

  // App Configuration (Required)
  NEXT_PUBLIC_APP_URL: z.string().url('Must be a valid URL'),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),

  // Payments (Required for production, optional for development)
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // PayPal (Optional)
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_MODE: z.enum(['sandbox', 'live']).optional().default('sandbox'),
  PAYPAL_PRODUCT_ID: z.string().optional(),
  PAYPAL_PLAN_MONTHLY: z.string().optional(),
  PAYPAL_PLAN_YEARLY: z.string().optional(),
  PAYPAL_WEBHOOK_SECRET: z.string().optional(),

  // Email (Required for production, optional for development)
  RESEND_API_KEY: z.string().optional(),

  // External APIs (Optional)
  GOOGLE_NEWS_API_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),

  // Event Platform Integrations (Optional)
  EVENTBRITE_API_KEY: z.string().optional(),
  EVENTBRITE_OAUTH_CLIENT_ID: z.string().optional(),
  EVENTBRITE_OAUTH_CLIENT_SECRET: z.string().optional(),
  EVENTBRITE_OAUTH_REDIRECT_URI: z.string().url().optional(),

  MEETUP_OAUTH_CLIENT_ID: z.string().optional(),
  MEETUP_OAUTH_CLIENT_SECRET: z.string().optional(),
  MEETUP_OAUTH_REDIRECT_URI: z.string().url().optional(),

  // Security (Required for production, optional for development)
  CRON_SECRET: z.string().min(32, 'Cron secret must be at least 32 characters').optional(),

  // Admin (Optional, defaults to empty)
  SUPER_ADMIN_EMAILS: z.string().optional().default(''),

  // Monitoring (Optional but recommended)
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),

  // Redis (Optional, falls back to in-memory)
  REDIS_URL: z.string().optional(),

  // Vercel (Optional, only needed for deployment scripts)
  VERCEL_TOKEN: z.string().optional(),

  // Google AdSense (Optional)
  NEXT_PUBLIC_GOOGLE_ADSENSE_PUB_ID: z.string().optional(),

  // CI/CD (Optional)
  CI: z.string().optional(),
})

/**
 * Parse and validate environment variables
 * Only validates on server-side to avoid build-time errors
 */
function validateEnv() {
  // Skip validation on client-side
  if (typeof window !== 'undefined') {
    // Client-side: Only NEXT_PUBLIC_* variables are available
    // Return a safe object that won't break the app
    return {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      NEXT_PUBLIC_GIPHY_API_KEY: process.env.NEXT_PUBLIC_GIPHY_API_KEY,
      NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      NEXT_PUBLIC_GOOGLE_ADSENSE_PUB_ID: process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_PUB_ID,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
      NODE_ENV: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
      SUPER_ADMIN_EMAILS: '',
      // Server-only variables are undefined on client
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      RAZORPAY_KEY_ID: undefined,
      RAZORPAY_KEY_SECRET: undefined,
      RAZORPAY_WEBHOOK_SECRET: undefined,
      PAYPAL_CLIENT_ID: undefined,
      PAYPAL_CLIENT_SECRET: undefined,
      PAYPAL_MODE: 'sandbox' as const,
      PAYPAL_PRODUCT_ID: undefined,
      PAYPAL_PLAN_MONTHLY: undefined,
      PAYPAL_PLAN_YEARLY: undefined,
      PAYPAL_WEBHOOK_SECRET: undefined,
      RESEND_API_KEY: undefined,
      GOOGLE_NEWS_API_KEY: undefined,
      GOOGLE_MAPS_API_KEY: undefined,
      EVENTBRITE_API_KEY: undefined,
      EVENTBRITE_OAUTH_CLIENT_ID: undefined,
      EVENTBRITE_OAUTH_CLIENT_SECRET: undefined,
      EVENTBRITE_OAUTH_REDIRECT_URI: undefined,
      MEETUP_OAUTH_CLIENT_ID: undefined,
      MEETUP_OAUTH_CLIENT_SECRET: undefined,
      MEETUP_OAUTH_REDIRECT_URI: undefined,
      CRON_SECRET: undefined,
      SENTRY_AUTH_TOKEN: undefined,
      SENTRY_ORG: undefined,
      SENTRY_PROJECT: undefined,
      REDIS_URL: undefined,
      VERCEL_TOKEN: undefined,
      CI: undefined,
    } as z.infer<typeof envSchema>
  }

  // Server-side: full validation
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    logger.error('❌ Invalid environment variables', undefined, {
      errors: parsed.error.format(),
    })
    throw new Error('Invalid environment variables. Check the logs above.')
  }

  return parsed.data
}

/**
 * Validated environment variables
 * Use this instead of process.env for type safety
 */
export const env = validateEnv()

/**
 * Helper function to check if we're in production
 */
export const isProduction = env.NODE_ENV === 'production'

/**
 * Helper function to check if we're in development
 */
export const isDevelopment = env.NODE_ENV === 'development'

/**
 * Helper function to check if we're in test environment
 */
export const isTest = env.NODE_ENV === 'test'

/**
 * Get super admin emails as an array
 */
export function getSuperAdminEmails(): string[] {
  if (!env.SUPER_ADMIN_EMAILS) return []
  return env.SUPER_ADMIN_EMAILS.split(',')
    .map((email) => email.trim())
    .filter(Boolean)
}

/**
 * Check if an email is a super admin
 */
export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  const superAdmins = getSuperAdminEmails()
  return superAdmins.includes(email.toLowerCase())
}

// Export the schema for reference
export type Env = z.infer<typeof envSchema>

// Default export for convenience
export default env
