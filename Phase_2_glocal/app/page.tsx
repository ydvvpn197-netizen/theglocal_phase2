import { LocationFeed } from '@/components/feed/location-feed'
import { CreatePostModal } from '@/components/posts/create-post-modal'
import { CreateCommunityModal } from '@/components/communities/create-community-modal'
import { CreateEventModal } from '@/components/events/create-event-modal'
import { CreatePollModal } from '@/components/polls/create-poll-modal'

export default function Home() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-6">
        {/* Action Buttons Section */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 [&_button]:w-full">
            <CreatePostModal />
          </div>
          <div className="flex-1 [&_button]:w-full">
            <CreateCommunityModal />
          </div>
          <div className="flex-1 [&_button]:w-full">
            <CreateEventModal />
          </div>
          <div className="flex-1 [&_button]:w-full">
            <CreatePollModal />
          </div>
        </div>

        {/* Location-Based Feed */}
        <LocationFeed />
      </div>
    </div>
  )
}
