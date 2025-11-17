'use client'

import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RealtimeStatusProps {
  isConnected: boolean
  error?: string | null
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function RealtimeStatus({
  isConnected,
  error,
  className,
  showText = false,
  size = 'sm',
}: RealtimeStatusProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  const iconSize = sizeClasses[size]

  if (error) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <WifiOff className={cn(iconSize, 'text-destructive')} />
        {showText && <span className="text-xs text-muted-foreground">Offline</span>}
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <Loader2 className={cn(iconSize, 'text-muted-foreground animate-spin')} />
        {showText && <span className="text-xs text-muted-foreground">Connecting...</span>}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Wifi className={cn(iconSize, 'text-green-500')} />
      {showText && <span className="text-xs text-muted-foreground">Live</span>}
    </div>
  )
}
