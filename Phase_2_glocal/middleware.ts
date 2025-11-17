import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { validateRequiredEnv } from '@/lib/utils/env-validation'

// Validate environment variables once on first middleware call
let envValidated = false
if (!envValidated && typeof window === 'undefined') {
  try {
    validateRequiredEnv()
    envValidated = true
  } catch (error) {
    // Log error but don't block requests in development
    if (process.env.NODE_ENV === 'production') {
      throw error
    }
    console.error('Environment validation failed:', error)
  }
}

/**
 * Middleware to handle Supabase authentication
 * Refreshes user sessions and manages cookies
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
