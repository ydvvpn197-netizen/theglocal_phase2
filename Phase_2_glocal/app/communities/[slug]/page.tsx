import { CommunityHeader } from '@/components/communities/community-header'

interface CommunityPageProps {
  params: { slug: string }
}

export default function CommunityPage({ params }: CommunityPageProps) {
  return (
    <div className="container max-w-6xl py-6">
      <CommunityHeader slug={params.slug} />

      {/* Community posts feed will be added in task 2.2.12 */}
      <div className="mt-8">
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground">
            Community posts will appear here. Post functionality coming soon!
          </p>
        </div>
      </div>
    </div>
  )
}
