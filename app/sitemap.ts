import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const { data: communities } = await supabase
    .from('communities')
    .select('slug, updated_at')
    .eq('is_archived', false)

  const { data: events } = await supabase
    .from('events')
    .select('id, updated_at')
    .gte('end_date', new Date().toISOString())
    .limit(1000)

  return [
    {
      url: 'https://theglocal.in',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://theglocal.in/communities',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: 'https://theglocal.in/events',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: 'https://theglocal.in/artists',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...(communities || []).map((c) => ({
      url: `https://theglocal.in/communities/${c.slug}`,
      lastModified: new Date(c.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...(events || []).map((e) => ({
      url: `https://theglocal.in/events/${e.id}`,
      lastModified: new Date(e.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ]
}
