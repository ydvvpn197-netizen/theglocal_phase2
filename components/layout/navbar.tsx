'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/lib/context/auth-context'
import { SearchBar } from '@/components/search/search-bar'
import { LogOut, User, Search } from 'lucide-react'

export function Navbar() {
  const router = useRouter()
  const { user, profile, signOut, isLoading } = useAuth()
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <nav
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-brand-primary">Theglocal</span>
            <Badge variant="secondary" className="text-xs">
              Beta
            </Badge>
          </Link>

          {/* Desktop Search Bar */}
          <div className="hidden md:block w-full max-w-md mx-4">
            <SearchBar placeholder="Search..." />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6" role="menubar" aria-label="Main menu">
            <Link
              href="/"
              className="text-sm font-medium transition-colors hover:text-brand-primary"
              role="menuitem"
              aria-label="Go to Feed"
            >
              Feed
            </Link>
            <Link
              href="/discover"
              className="text-sm font-medium transition-colors hover:text-brand-primary"
              role="menuitem"
              aria-label="Go to Discover"
            >
              Discover
            </Link>
            <Link
              href="/communities"
              className="text-sm font-medium transition-colors hover:text-brand-primary"
              role="menuitem"
              aria-label="Go to Communities"
            >
              Communities
            </Link>
            <Link
              href="/events"
              className="text-sm font-medium transition-colors hover:text-brand-primary"
              role="menuitem"
              aria-label="Go to Events"
            >
              Events
            </Link>
            <Link
              href="/artists"
              className="text-sm font-medium transition-colors hover:text-brand-primary"
              role="menuitem"
              aria-label="Go to Artists"
            >
              Artists
            </Link>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-4">
          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Open search"
          >
            <Search className="h-4 w-4" />
          </Button>

          {!isLoading && (
            <>
              {user && profile ? (
                <>
                  <div
                    className="hidden sm:flex items-center gap-2"
                    aria-label={`User: ${profile.anonymous_handle}`}
                  >
                    <User className="h-4 w-4" aria-hidden="true" />
                    <span className="text-sm font-medium">{profile.anonymous_handle}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label="Sign out">
                    <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/auth/login')}
                    aria-label="Go to login page"
                  >
                    Login
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => router.push('/auth/signup')}
                    aria-label="Get started - create an account"
                  >
                    Get Started
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Search Dialog */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          <SearchBar
            onSearch={(query) => {
              setIsSearchOpen(false)
              router.push(`/search?q=${encodeURIComponent(query)}`)
            }}
            autoFocus
          />
        </DialogContent>
      </Dialog>
    </nav>
  )
}
