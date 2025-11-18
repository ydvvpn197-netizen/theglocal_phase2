import { CommunityList } from '@/components/communities/community-list'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default function CommunitiesPage() {
  return (
    <div className="container max-w-6xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Communities</h1>
          <p className="text-muted-foreground mt-2">
            Discover and join local communities in your area
          </p>
        </div>
        <Link href="/communities/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Community
          </Button>
        </Link>
      </div>

      <CommunityList />
    </div>
  )
}
