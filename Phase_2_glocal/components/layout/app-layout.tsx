'use client'

import Link from 'next/link'
import { Navbar } from './navbar'
import { Sidebar } from './sidebar'
import { MobileNav } from './mobile-nav'
import { Toaster } from '@/components/ui/toaster'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background overscroll-none">
      {/* Skip to main content link for keyboard navigation */}
      <Link
        href="#main-content"
        className="skip-link sr-only focus:not-sr-only focus:static focus:z-[100]"
      >
        Skip to main content
      </Link>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main
          id="main-content"
          className="flex-1 pb-20 lg:pb-6 overscroll-contain"
          role="main"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
      <MobileNav />
      <Toaster />
    </div>
  )
}
