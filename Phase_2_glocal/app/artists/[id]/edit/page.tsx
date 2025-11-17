import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArtistForm } from '@/components/artists/artist-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface EditArtistPageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Edit Freelancer/Creator Profile - Theglocal',
  description: 'Update your freelancer/creator profile and portfolio',
}

export default async function EditArtistPage({ params }: EditArtistPageProps) {
  const supabase = await createClient()
  const { id } = await params

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signup')
  }

  // Get artist profile
  const { data: artist, error } = await supabase.from('artists').select('*').eq('id', id).single()

  if (error || !artist) {
    redirect('/artists/dashboard')
  }

  // Verify ownership
  if (artist.id !== user.id) {
    redirect('/artists/dashboard')
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/artists/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <h1 className="text-3xl font-bold">Edit Your Profile</h1>
        <p className="mt-2 text-muted-foreground">
          Update your freelancer/creator profile information and portfolio
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Keep your profile up to date so clients can find and book you easily
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<FormSkeleton />}>
            <ArtistForm mode="edit" artist={artist} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}
