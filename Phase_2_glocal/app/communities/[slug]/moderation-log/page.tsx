import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { ModerationLogTable } from '@/components/moderation/moderation-log-table'
import { Shield, Info } from 'lucide-react'

interface ModerationLogPageProps {
  params: { slug: string }
}

export default async function CommunityModerationLogPage({ params }: ModerationLogPageProps) {
  const supabase = await createClient()

  // Get community
  const { data: community, error } = await supabase
    .from('communities')
    .select('id, name, slug')
    .eq('slug', params.slug)
    .single()

  if (error || !community) {
    return notFound()
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-brand-primary" />
            <h1 className="text-3xl font-bold">Moderation Log</h1>
          </div>
          <p className="text-muted-foreground">{community.name}</p>
        </div>

        {/* Info Banner */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-start gap-3 pt-6">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">Transparency & Accountability</p>
              <p className="text-sm text-blue-700">
                This log shows all moderation actions taken in this community. Moderator identities
                are anonymized to protect their privacy while maintaining transparency about content
                moderation decisions.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Moderation Log Table */}
        <ModerationLogTable communityId={community.id} />
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: ModerationLogPageProps) {
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities')
    .select('name')
    .eq('slug', params.slug)
    .single()

  return {
    title: `Moderation Log - ${community?.name || 'Community'}`,
    description: 'View the transparent moderation log for this community',
  }
}
