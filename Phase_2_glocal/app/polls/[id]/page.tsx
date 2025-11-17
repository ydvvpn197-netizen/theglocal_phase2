import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function PollPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: poll, error } = await supabase
    .from('polls')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !poll) {
    notFound()
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">{poll.title}</h1>
      <p className="text-gray-600">{poll.description || ''}</p>
    </div>
  )
}
