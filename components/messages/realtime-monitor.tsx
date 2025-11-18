'use client'

import { logger } from '@/lib/utils/logger'
import { useEffect, useState } from 'react'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error'

interface RealtimeMonitorProps {
  className?: string
  showLabel?: boolean
}

export function RealtimeMonitor({ className, showLabel = false }: RealtimeMonitorProps) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    logger.info('🔌 Initializing global realtime connection monitor')

    // Monitor realtime connection status with a test channel
    const channel = supabase.channel('connection-monitor-test')

    let isSubscribed = false

    const subscribeTimeout = setTimeout(() => {
      if (!isSubscribed) {
        logger.warn('⚠️ Realtime subscription timed out')
        setStatus('error')
      }
    }, 10000) // 10 second timeout

    channel.subscribe((subscriptionStatus) => {
      logger.info('📡 Global realtime connection status:', subscriptionStatus)

      if (subscriptionStatus === 'SUBSCRIBED') {
        clearTimeout(subscribeTimeout)
        isSubscribed = true
        setStatus('connected')
        setRetryCount(0)
        logger.info('✅ Realtime connection established')
      } else if (subscriptionStatus === 'CHANNEL_ERROR' || subscriptionStatus === 'TIMED_OUT') {
        clearTimeout(subscribeTimeout)
        logger.error('❌ Realtime connection error:', subscriptionStatus)
        setStatus('error')
        setRetryCount((prev) => prev + 1)
      } else if (subscriptionStatus === 'CLOSED') {
        setStatus('disconnected')
        logger.info('🔌 Realtime connection closed')
      } else {
        setStatus('connecting')
      }
    })

    return () => {
      clearTimeout(subscribeTimeout)
      logger.info('🔌 Cleaning up realtime connection monitor')
      supabase.removeChannel(channel)
    }
  }, [])

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-green-500'
      case 'connecting':
        return 'text-yellow-500'
      case 'disconnected':
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusLabel = () => {
    switch (status) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'disconnected':
        return 'Disconnected'
      case 'error':
        return retryCount > 2 ? 'Connection Failed' : 'Connection Error'
      default:
        return 'Unknown'
    }
  }

  const getIcon = () => {
    switch (status) {
      case 'connected':
        return <Wifi className={cn('h-5 w-5', getStatusColor())} />
      case 'connecting':
        return <Loader2 className={cn('h-5 w-5 animate-spin', getStatusColor())} />
      case 'disconnected':
      case 'error':
        return <WifiOff className={cn('h-5 w-5', getStatusColor())} />
      default:
        return <WifiOff className="h-5 w-5 text-gray-400" />
    }
  }

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      title={`Realtime Status: ${getStatusLabel()}`}
    >
      {getIcon()}
      {showLabel && (
        <span className={cn('text-sm font-medium', getStatusColor())}>{getStatusLabel()}</span>
      )}
      {status === 'error' && retryCount > 2 && (
        <span className="text-xs text-gray-500">(Using fallback)</span>
      )}
    </div>
  )
}

// Floating version for global monitoring
export function FloatingRealtimeMonitor() {
  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg z-50 border border-gray-200 dark:border-gray-700">
      <RealtimeMonitor />
    </div>
  )
}
