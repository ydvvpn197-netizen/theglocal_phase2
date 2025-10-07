import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncBookMyShowEvents } from '@/lib/integrations/bookmyshow'

// GET /api/events/sync-bookmyshow - Cron job to sync BookMyShow events
export async function GET(_request: NextRequest) {
  try {
    // Verify this is a cron job request (Vercel cron secret)
    const authHeader = _request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get list of cities with active communities
    const { data: communities } = await supabase
      .from('communities')
      .select('location_city')
      .limit(100)

    const cities = Array.from(
      new Set(communities?.map((c) => c.location_city) || ['Mumbai', 'Delhi'])
    )

    // Sync events
    const syncedCount = await syncBookMyShowEvents(cities)

    console.log(`Synced ${syncedCount} BookMyShow events across ${cities.length} cities`)

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedCount} events`,
      data: {
        syncedCount,
        cities: cities.length,
      },
    })
  } catch (error) {
    console.error('BookMyShow sync error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to sync events',
      },
      { status: 500 }
    )
  }
}
