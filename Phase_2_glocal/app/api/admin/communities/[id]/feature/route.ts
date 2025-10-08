import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/utils/permissions'
import { z } from 'zod'

const featureSchema = z.object({
  is_featured: z.boolean(),
})

// PUT /api/admin/communities/[id]/feature - Feature or unfeature a community
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

    // Verify super admin
    const isAdmin = await isSuperAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { is_featured } = featureSchema.parse(body)

    // Update community featured status
    const { data: updatedCommunity, error: updateError } = await supabase
      .from('communities')
      .update({
        is_featured,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) throw updateError

    // Log the action
    await supabase.from('moderation_log').insert({
      action: is_featured ? 'feature_community' : 'unfeature_community',
      actor_id: user.id,
      target_type: 'community',
      target_id: params.id,
      details: { is_featured },
    })

    return NextResponse.json({
      success: true,
      message: `Community ${is_featured ? 'featured' : 'unfeatured'} successfully`,
      data: updatedCommunity,
    })
  } catch (error) {
    console.error('Feature community error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update community',
      },
      { status: 500 }
    )
  }
}
