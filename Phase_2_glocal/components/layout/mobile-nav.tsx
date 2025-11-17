'use client'

import Link from 'next/link'
import { Home, Compass, Users, Calendar, User } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const pathname = usePathname()

  const links = [
    { href: '/', icon: Home, label: 'Feed' },
    { href: '/discover', icon: Compass, label: 'Discover' },
    { href: '/communities', icon: Users, label: 'Communities' },
    { href: '/events', icon: Calendar, label: 'Events' },
    { href: '/profile', icon: User, label: 'Profile' },
  ]

  const handleTouchStart = () => {
    // Haptic feedback for supported devices
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-5 h-16" role="menubar">
        {links.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onTouchStart={handleTouchStart}
              role="menuitem"
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                // Ensure 44x44px minimum touch target
                'flex flex-col items-center justify-center gap-1',
                'min-h-[44px] min-w-[44px]',
                'transition-all duration-150',
                'touch-manipulation',
                'active:scale-95 active:opacity-80',
                // Active state
                isActive ? 'text-brand-primary' : 'text-muted-foreground active:text-foreground'
              )}
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
              <span className="text-[10px] font-medium leading-tight">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
