import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileHeader } from '@/components/profile/profile-header'
import { ProfileStats } from '@/components/profile/profile-stats'
import { ProfileActivity } from '@/components/profile/profile-activity'
import { ProfileActions } from '@/components/profile/profile-actions'

export default async function ProfilePage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch profile directly from database
  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()

  if (!profile) {
    redirect('/auth/login')
  }

  // Get statistics using database functions
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

  // Get artist info
  const { data: artist } = await supabase.from('artists').select('*').eq('id', user.id).single()

  // Get roles
  const { data: roles } = await supabase
    .from('community_members')
    .select('role, community:communities(id, name, slug)')
    .eq('user_id', user.id)
    .in('role', ['admin', 'moderator'])

  // Get bookings - both as requester and as artist
  const { data: userBookings } = await supabase
    .from('bookings')
    .select(
      `
      id,
      event_date,
      event_type,
      status,
      created_at,
      artist:artists(stage_name, service_category)
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const { data: artistBookings } = await supabase
    .from('bookings')
    .select(
      `
      id,
      event_date,
      event_type,
      status,
      created_at,
      users!bookings_user_id_fkey(anonymous_handle)
    `
    )
    .eq('artist_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Combine and deduplicate bookings
  const allBookings = [
    ...(userBookings || []).map((b) => ({ ...b, is_artist: false })),
    ...(artistBookings || []).map((b) => ({ ...b, is_artist: true })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)

  const profileData = {
    ...profile,
    stats: {
      post_karma: postKarma || 0,
      comment_karma: commentKarma || 0,
      total_karma: (postKarma || 0) + (commentKarma || 0),
      post_count: postCount || 0,
      comment_count: commentCount || 0,
      community_count: communityCount || 0,
    },
    artist: artist || null,
    roles: roles || [],
    bookings: allBookings, // Changed from bookings
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8 space-y-6">
      <ProfileActions profile={profileData} />
      <ProfileHeader profile={profileData} isOwnProfile={true} />
      <ProfileStats
        stats={profileData.stats}
        showKarma={profileData.display_preferences?.show_karma !== false}
      />
      <ProfileActivity
        userId={profileData.id}
        isOwnProfile={true}
        bookings={profileData.bookings}
        artistInfo={profileData.artist}
      />
    </div>
  )
}
