import { redirect } from 'next/navigation'

interface ArtistProfilePageProps {
  params: Promise<{ id: string }>
}

/**
 * Redirect from /artist/[id] to /artists/[id] for backward compatibility
 */
export default async function ArtistProfilePage({ params }: ArtistProfilePageProps) {
  const { id } = await params
  redirect(`/artists/${id}`)
}
