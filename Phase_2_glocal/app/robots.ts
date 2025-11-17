import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/messages/', '/profile/'],
    },
    sitemap: 'https://theglocal.in/sitemap.xml',
  }
}
