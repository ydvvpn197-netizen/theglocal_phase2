import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateArtistSchema = z.object({
  stage_name: z.string().min(1).max(100).optional(),
  service_category: z.string().optional(),
  description: z.string().max(1000).optional(),
  location_city: z.string().optional(),
  rate_min: z.number().min(0).optional(),
  rate_max: z.number().min(0).optional(),
  portfolio_images: z.array(z.string()).max(10).optional(),
})

// GET /api/artists/[id] - Get artist profile
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const { data: artist, error } = await supabase
      .from('artists')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) throw error

    if (!artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: artist,
    })
  } catch (error) {
    console.error('Fetch artist error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch artist',
      },
      { status: 500 }
    )
  }
}

// PUT /api/artists/[id] - Update artist profile
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify artist ownership
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (artistError || !artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    if (artist.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const updates = updateArtistSchema.parse(body)

    // Update artist profile
    const { data: updatedArtist, error: updateError } = await supabase
      .from('artists')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      message: 'Artist profile updated successfully',
      data: updatedArtist,
    })
  } catch (error) {
    console.error('Update artist error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update artist',
      },
      { status: 500 }
    )
  }
}

// DELETE /api/artists/[id] - Delete artist profile (soft delete by setting subscription to cancelled)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify artist ownership
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (artistError || !artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    if (artist.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Soft delete by setting subscription to cancelled
    const { error: deleteError } = await supabase
      .from('artists')
      .update({
        subscription_status: 'cancelled',
        subscription_cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (deleteError) throw deleteError

    return NextResponse.json({
      success: true,
      message: 'Artist profile deleted successfully',
    })
  } catch (error) {
    console.error('Delete artist error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete artist',
      },
      { status: 500 }
    )
  }
}

