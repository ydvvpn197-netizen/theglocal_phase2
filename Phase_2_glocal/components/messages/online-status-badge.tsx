'use client'

import { UserPresence } from '@/lib/types/messages.types'
import { getUserPresenceInfo } from '@/lib/utils/message-helpers'
import { cn } from '@/lib/utils'

interface OnlineStatusBadgeProps {
  presence: UserPresence | null
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
}

const statusColors = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  offline: 'bg-gray-400',
}

export function OnlineStatusBadge({
  presence,
  size = 'md',
  showTooltip = true,
  className,
}: OnlineStatusBadgeProps) {
  const { status, lastSeen, isOnline } = getUserPresenceInfo(presence)

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'rounded-full border-2 border-white shadow-sm',
          sizeClasses[size],
          statusColors[status]
        )}
        title={showTooltip ? (isOnline ? 'Online' : `Last seen ${lastSeen}`) : undefined}
      />

      {/* Pulse animation for online status */}
      {isOnline && (
        <div
          className={cn(
            'absolute inset-0 rounded-full animate-ping',
            sizeClasses[size],
            statusColors[status],
            'opacity-20'
          )}
        />
      )}
    </div>
  )
}
