import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/lib/providers/query-provider'
import { AuthProvider } from '@/lib/context/auth-context'
import { LocationProvider } from '@/lib/context/location-context'
import { NotificationProvider } from '@/lib/context/notification-context'
import { AppLayout } from '@/components/layout/app-layout'
import { ErrorBoundary } from '@/components/error-boundary'

// Optimize font loading with display swap and preload
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  preload: false, // Only preload primary font
  adjustFontFallback: true,
})

export const metadata: Metadata = {
  title: 'Theglocal - Privacy-First Local Community Platform',
  description:
    'Connect with your local community anonymously. Discover events, engage in civic discussions, and support local artists.',
  // Add resource hints for performance
  other: {
    'dns-prefetch': 'https://fonts.googleapis.com https://fonts.gstatic.com',
  },
}

// Force dynamic rendering for all pages to prevent build-time errors with Supabase
export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Preconnect to external domains for faster resource loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* DNS prefetch for Supabase */}
        <link rel="dns-prefetch" href="https://*.supabase.co" />
      </head>
      <body className="font-sans antialiased">
        <ErrorBoundary>
          <QueryProvider>
            <AuthProvider>
              <NotificationProvider>
                <LocationProvider>
                  <AppLayout>{children}</AppLayout>
                </LocationProvider>
              </NotificationProvider>
            </AuthProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
