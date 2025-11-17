import { redirect } from 'next/navigation'

interface EditArtistPageProps {
  params: Promise<{ id: string }>
}

/**
 * Redirect from /artist/[id]/edit to /artists/[id]/edit for backward compatibility
 */
export default async function EditArtistPage({ params }: EditArtistPageProps) {
  const { id } = await params
  redirect(`/artists/${id}/edit`)
}
