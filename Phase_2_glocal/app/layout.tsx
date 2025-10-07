import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/lib/providers/query-provider'
import { AuthProvider } from '@/lib/context/auth-context'
import { AppLayout } from '@/components/layout/app-layout'

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <QueryProvider>
          <AuthProvider>
            <AppLayout>{children}</AppLayout>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
