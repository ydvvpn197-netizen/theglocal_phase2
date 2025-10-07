'use client'

import { Navbar } from './navbar'
import { Sidebar } from './sidebar'
import { MobileNav } from './mobile-nav'
import { Toaster } from '@/components/ui/toaster'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 pb-20 lg:pb-6">{children}</main>
      </div>
      <MobileNav />
      <Toaster />
    </div>
  )
}
