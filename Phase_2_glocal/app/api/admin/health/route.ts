import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/utils/permissions'

// GET /api/admin/health - Check health of external APIs
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify super admin
    const isAdmin = await isSuperAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const healthChecks = []

    // Check Google News API
    try {
      const startTime = Date.now()
      const newsResponse = await fetch(
        `https://newsapi.org/v2/everything?q=mumbai&sortBy=publishedAt&apiKey=${process.env.GOOGLE_NEWS_API_KEY}`,
        { signal: AbortSignal.timeout(5000) }
      )
      const responseTime = Date.now() - startTime

      healthChecks.push({
        service: 'Google News API',
        status: newsResponse.ok ? 'healthy' : 'degraded',
        response_time_ms: responseTime,
        last_checked: new Date().toISOString(),
        error_message: newsResponse.ok ? undefined : `HTTP ${newsResponse.status}`,
      })
    } catch (error) {
      healthChecks.push({
        service: 'Google News API',
        status: 'down',
        response_time_ms: 0,
        last_checked: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Connection failed',
      })
    }

    // Check Razorpay API
    try {
      const startTime = Date.now()
      const razorpayResponse = await fetch('https://api.razorpay.com/v1/payments', {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
          ).toString('base64')}`,
        },
        signal: AbortSignal.timeout(5000),
      })
      const responseTime = Date.now() - startTime

      healthChecks.push({
        service: 'Razorpay API',
        status: razorpayResponse.ok ? 'healthy' : 'degraded',
        response_time_ms: responseTime,
        last_checked: new Date().toISOString(),
        error_message: razorpayResponse.ok ? undefined : `HTTP ${razorpayResponse.status}`,
      })
    } catch (error) {
      healthChecks.push({
        service: 'Razorpay API',
        status: 'down',
        response_time_ms: 0,
        last_checked: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Connection failed',
      })
    }

    // Check Resend API
    try {
      const startTime = Date.now()
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        signal: AbortSignal.timeout(5000),
      })
      const responseTime = Date.now() - startTime

      healthChecks.push({
        service: 'Resend API',
        status: resendResponse.ok ? 'healthy' : 'degraded',
        response_time_ms: responseTime,
        last_checked: new Date().toISOString(),
        error_message: resendResponse.ok ? undefined : `HTTP ${resendResponse.status}`,
      })
    } catch (error) {
      healthChecks.push({
        service: 'Resend API',
        status: 'down',
        response_time_ms: 0,
        last_checked: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Connection failed',
      })
    }

    // Check Supabase database
    try {
      const startTime = Date.now()
      const { data, error } = await supabase.from('users').select('id').limit(1).single()
      const responseTime = Date.now() - startTime

      healthChecks.push({
        service: 'Supabase Database',
        status: error ? 'degraded' : 'healthy',
        response_time_ms: responseTime,
        last_checked: new Date().toISOString(),
        error_message: error ? error.message : undefined,
      })
    } catch (error) {
      healthChecks.push({
        service: 'Supabase Database',
        status: 'down',
        response_time_ms: 0,
        last_checked: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Connection failed',
      })
    }

    return NextResponse.json({
      success: true,
      data: healthChecks,
      checked_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to check API health',
      },
      { status: 500 }
    )
  }
}
