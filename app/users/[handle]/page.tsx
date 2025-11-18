import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileHeader } from '@/components/profile/profile-header'
import { ProfileStats } from '@/components/profile/profile-stats'
import { ProfileActivity } from '@/components/profile/profile-activity'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

interface Props {
  params: Promise<{
    handle: string
  }>
}

export default async function PublicProfilePage({ params }: Props) {
  // Destructure handle from params (Next.js 15 async params)
  const { handle } = await params

  const supabase = await createClient()

  // Fetch user profile directly from database
  const { data: user, error: userError } = await supabase
    .from('users')
    .select(
      'id, anonymous_handle, avatar_seed, location_city, bio, created_at, deleted_at, display_preferences'
    )
    .eq('anonymous_handle', handle)
    .single()

  if (userError || !user) {
    notFound()
  }

  // Check if user is deleted
  if (user.deleted_at) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h2 className="text-2xl font-bold mb-2">User Deleted</h2>
              <p className="text-muted-foreground">This user account has been deleted.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get user statistics
  const { data: postKarma } = await supabase.rpc('get_user_post_karma', {
    user_uuid: user.id,
  })
  const { data: commentKarma } = await supabase.rpc('get_user_comment_karma', {
    user_uuid: user.id,
  })
  const { data: postCount } = await supabase.rpc('get_user_post_count', {
    user_uuid: user.id,
  })
  const { data: commentCount } = await supabase.rpc('get_user_comment_count', {
    user_uuid: user.id,
  })
  const { data: communityCount } = await supabase.rpc('get_user_community_count', {
    user_uuid: user.id,
  })

  // Check if user is an artist
  const { data: artist } = await supabase
    .from('artists')
    .select('id, stage_name, service_category, subscription_status')
    .eq('id', user.id)
    .single()

  // Get user's roles
  const { data: rolesData } = await supabase
    .from('community_members')
    .select('role, community:communities(name, slug)')
    .eq('user_id', user.id)
    .in('role', ['admin', 'moderator'])

  // Transform roles to correct type
  const roles =
    rolesData?.map((r: unknown) => {
      if (!r || typeof r !== 'object') return { role: '', community: null }
      const rRecord = r as { role?: unknown; community?: unknown }
      return {
        role: String(rRecord.role ?? ''),
        community: Array.isArray(rRecord.community) ? rRecord.community[0] : rRecord.community,
      }
    }) || []

  const profileData = {
    id: user.id,
    anonymous_handle: user.anonymous_handle,
    avatar_seed: user.avatar_seed,
    location_city: user.display_preferences?.show_location ? user.location_city : null,
    bio: user.bio,
    created_at: user.created_at,
    display_preferences: user.display_preferences,
    stats: {
      post_karma: postKarma || 0,
      comment_karma: commentKarma || 0,
      total_karma: (postKarma || 0) + (commentKarma || 0),
      post_count: postCount || 0,
      comment_count: commentCount || 0,
      community_count: communityCount || 0,
    },
    artist: artist
      ? {
          stage_name: artist.stage_name,
          service_category: artist.service_category,
          subscription_status: artist.subscription_status,
        }
      : null,
    roles: roles,
  }

  // Check if viewing own profile
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()
  const isOwnProfile = currentUser?.id === profileData.id

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8 space-y-6">
      <ProfileHeader profile={profileData} isOwnProfile={isOwnProfile} />
      <ProfileStats
        stats={profileData.stats}
        showKarma={profileData.display_preferences?.show_karma !== false}
      />
      <ProfileActivity
        userId={profileData.id}
        isOwnProfile={isOwnProfile}
        artistInfo={profileData.artist || undefined}
      />
    </div>
  )
}

export async function generateMetadata({ params }: Props) {
  // Destructure handle from params (Next.js 14 synchronous params)
  const { handle } = await params

  return {
    title: `u/${handle} - Theglocal`,
    description: `View ${handle}'s profile on Theglocal`,
  }
}
