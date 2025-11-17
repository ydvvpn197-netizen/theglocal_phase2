'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * DEPRECATED ROUTE
 *
 * This route is deprecated. All events (including BookMyShow events)
 * are now stored in the database and accessible via /events/[id].
 *
 * This page now redirects to the unified event detail page.
 */
export default function BookMyShowPreviewPage() {
  const router = useRouter()

  useEffect(() => {
    // Try to find the event in the database by external_id
    // If it's a BookMyShow ID, redirect to the events page to search
    // For now, we'll redirect to the main events page
    router.replace('/events')
  }, [router])

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Redirecting to events page...</p>
        <p className="text-sm text-muted-foreground">
          BookMyShow events are now integrated with the main events page
        </p>
      </div>
    </div>
  )
}
