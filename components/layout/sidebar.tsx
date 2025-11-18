'use client'

import Link from 'next/link'
import { Home, Compass, Users, Calendar, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function Sidebar() {
  return (
    <aside className="hidden lg:block w-64 border-r bg-background h-[calc(100vh-4rem)] sticky top-16 p-4">
      <nav className="space-y-2">
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Home className="h-5 w-5" />
            <span>Feed</span>
          </Button>
        </Link>

        <Link href="/discover">
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Compass className="h-5 w-5" />
            <span>Discover</span>
          </Button>
        </Link>

        <Link href="/communities">
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Users className="h-5 w-5" />
            <span>Communities</span>
          </Button>
        </Link>

        <Link href="/events">
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Calendar className="h-5 w-5" />
            <span>Events</span>
          </Button>
        </Link>

        <Link href="/artists">
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Palette className="h-5 w-5" />
            <span>Artists</span>
          </Button>
        </Link>
      </nav>

      {/* Quick Info Card */}
      <Card className="mt-6 p-4">
        <h3 className="font-semibold text-sm mb-2">Your Communities</h3>
        <p className="text-xs text-muted-foreground">
          Join communities to see content in your feed
        </p>
        <Button className="w-full mt-4" size="sm">
          Explore Communities
        </Button>
      </Card>
    </aside>
  )
}
