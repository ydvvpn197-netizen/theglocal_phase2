import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, FileText, Flag, TrendingUp, Shield } from 'lucide-react'
import { ReportQueue } from '@/components/moderation/report-queue'
import { CommunityMembersList } from '@/components/communities/community-members-list'

interface CommunityAdminPageProps {
  params: { id: string }
}

export default async function CommunityAdminPage({ params }: CommunityAdminPageProps) {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signup')
  }

  // Get community
  const { data: community, error: communityError } = await supabase
    .from('communities')
    .select('*')
    .eq('id', params.id)
    .single()

  if (communityError || !community) {
    return notFound()
  }

  // Check if user is admin of this community
  const { data: membership } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'admin') {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You must be a community admin to access this page.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get community statistics
  const { data: stats } = await supabase.rpc('get_community_stats', {
    p_community_id: params.id,
  })

  // Get pending reports
  const { data: reports } = await supabase
    .from('reports')
    .select('id')
    .eq('community_id', params.id)
    .eq('status', 'pending')

  const pendingReportsCount = reports?.length || 0

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-brand-primary" />
            <Badge>Community Admin</Badge>
          </div>
          <h1 className="text-3xl font-bold">{community.name}</h1>
          <p className="mt-2 text-muted-foreground">Moderation Dashboard</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Users className="h-8 w-8 text-brand-primary" />
              <div>
                <div className="text-2xl font-bold">{community.member_count}</div>
                <div className="text-sm text-muted-foreground">Members</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <FileText className="h-8 w-8 text-brand-secondary" />
              <div>
                <div className="text-2xl font-bold">{community.post_count}</div>
                <div className="text-sm text-muted-foreground">Posts</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Flag className="h-8 w-8 text-destructive" />
              <div>
                <div className="text-2xl font-bold">{pendingReportsCount}</div>
                <div className="text-sm text-muted-foreground">Pending Reports</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {stats?.growth_7d ? `+${stats.growth_7d}` : '0'}
                </div>
                <div className="text-sm text-muted-foreground">Growth (7d)</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Queue */}
        <ReportQueue communityId={params.id} />

        {/* Community Members */}
        <CommunityMembersList communityId={params.id} isAdmin={true} />
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: CommunityAdminPageProps) {
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities')
    .select('name')
    .eq('id', params.id)
    .single()

  return {
    title: `${community?.name || 'Community'} - Admin Dashboard`,
    description: 'Manage your community, review reports, and moderate content',
  }
}

