import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Theglocal - Local Community Platform',
    short_name: 'Theglocal',
    description:
      'Privacy-first local community platform. Connect anonymously, discover events, and support local artists.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      {
        src: '/logo.icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/logo.icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    categories: ['social', 'news', 'lifestyle'],
  }
}
