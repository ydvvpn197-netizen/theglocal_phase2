import { redirect } from 'next/navigation'

interface ArtistSubscribePageProps {
  params: Promise<{ id: string }>
}

/**
 * Redirect from /artist/[id]/subscribe to /artists/[id]/subscribe for backward compatibility
 */
export default async function ArtistSubscribePage({ params }: ArtistSubscribePageProps) {
  const { id } = await params
  redirect(`/artists/${id}/subscribe`)
}
