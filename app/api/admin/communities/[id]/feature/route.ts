import { NextRequest } from 'next/server'
import { requireAdminOrThrow } from '@/lib/utils/require-admin'
import { z } from 'zod'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

const featureSchema = z.object({
  is_featured: z.boolean(),
})

// PUT /api/admin/communities/[id]/feature - Feature or unfeature a community
export const PUT = withRateLimit(async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Require admin authentication
    const { user, supabase } = await requireAdminOrThrow()

    const body = (await request.json()) as unknown
    const { is_featured } = featureSchema.parse(body)

    // Update community featured status
    const { data: updatedCommunity, error: updateError } = await supabase
      .from('communities')
      .update({
        is_featured,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Log the action
    await supabase.from('moderation_log').insert({
      action: is_featured ? 'feature_community' : 'unfeature_community',
      actor_id: user.id,
      target_type: 'community',
      target_id: id,
      details: { is_featured },
    })

    return createSuccessResponse(updatedCommunity, {
      message: `Community ${is_featured ? 'featured' : 'unfeatured'} successfully`,
    })
  } catch (error) {
    const { id: errorId } = await params
    return handleAPIError(error, {
      method: 'PUT',
      path: `/api/admin/communities/${errorId}/feature`,
    })
  }
})
