import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/lib/providers/query-provider'
import { AuthProvider } from '@/lib/context/auth-context'
import { LocationProvider } from '@/lib/context/location-context'
import { NotificationProvider } from '@/lib/context/notification-context'
import { AppLayout } from '@/components/layout/app-layout'
import { ErrorBoundary } from '@/components/error-boundary'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Theglocal - Privacy-First Local Community Platform',
  description:
    'Connect with your local community anonymously. Discover events, engage in civic discussions, and support local artists.',
}

// Force dynamic rendering for all pages to prevent build-time errors with Supabase
export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
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
