'use client'

import { memo, useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useNotifications } from '@/lib/context/notification-context'
import { NotificationDropdown } from './notification-dropdown'
import { NavigationErrorBoundary } from '@/components/error-boundary'
import { NavbarIconSkeleton } from '@/components/layout/navbar-icons-skeleton'

function NotificationIconComponent() {
  const { unreadCount, isReady } = useNotifications()
  const [open, setOpen] = useState(false)

  // Show loading state while context is initializing
  if (!isReady) {
    return <NavbarIconSkeleton />
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              aria-hidden="true"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <NavigationErrorBoundary>
          <NotificationDropdown onClose={() => setOpen(false)} />
        </NavigationErrorBoundary>
      </PopoverContent>
    </Popover>
  )
}

export const NotificationIcon = memo(NotificationIconComponent)
