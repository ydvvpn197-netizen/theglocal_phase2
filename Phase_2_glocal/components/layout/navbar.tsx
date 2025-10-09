'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/context/auth-context'
import { LogOut, User } from 'lucide-react'

export function Navbar() {
  const router = useRouter()
  const { user, profile, signOut, isLoading } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-brand-primary">Theglocal</span>
            <Badge variant="secondary" className="text-xs">
              Beta
            </Badge>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium transition-colors hover:text-brand-primary"
            >
              Feed
            </Link>
            <Link
              href="/discover"
              className="text-sm font-medium transition-colors hover:text-brand-primary"
            >
              Discover
            </Link>
            <Link
              href="/communities"
              className="text-sm font-medium transition-colors hover:text-brand-primary"
            >
              Communities
            </Link>
            <Link
              href="/events"
              className="text-sm font-medium transition-colors hover:text-brand-primary"
            >
              Events
            </Link>
            <Link
              href="/artists"
              className="text-sm font-medium transition-colors hover:text-brand-primary"
            >
              Artists
            </Link>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-4">
          {!isLoading && (
            <>
              {user && profile ? (
                <>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">{profile.anonymous_handle}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => router.push('/auth/signup')}>
                    Login
                  </Button>
                  <Button size="sm" onClick={() => router.push('/auth/signup')}>
                    Get Started
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
