'use client'

import { logger } from '@/lib/utils/logger'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'
import { BookingRow } from '@/lib/types/realtime.types'
import { isBookingPayload } from '@/lib/types/type-guards'

interface UseBookingRealtimeOptions {
  bookingId: string
  onUpdate?: (booking: BookingRow) => void
}

/**
 * Hook to subscribe to real-time updates for a specific booking
 * Automatically refreshes booking data when status changes
 */
export function useBookingRealtime({ bookingId, onUpdate }: UseBookingRealtimeOptions) {
  const isSubscribedRef = useRef(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const onUpdateRef = useRef(onUpdate)

  // Update callback ref when it changes
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  useEffect(() => {
    if (!bookingId) return

    try {
      const supabase = createClient()

      // Reset subscription state
      isSubscribedRef.current = false

      // Subscribe to booking changes
      const channel = supabase
        .channel(`booking-${bookingId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings',
            filter: `id=eq.${bookingId}`,
          },
          (payload) => {
            // Only process events when subscription is ready
            if (!isSubscribedRef.current) {
              logger.warn('📅 Received UPDATE event before subscription ready')
              return
            }

            if (!isBookingPayload(payload) || !payload.new) {
              logger.warn('📅 Invalid booking update payload received')
              return
            }
            logger.info('🔄 Booking updated:', payload.new)
            const updatedBooking = payload.new

            // Call the onUpdate callback if provided
            if (onUpdateRef.current) {
              onUpdateRef.current(updatedBooking)
            }
          }
        )
        .subscribe((status) => {
          logger.info(`📅 Booking realtime status for ${bookingId}:`, status)

          if (status === 'SUBSCRIBED') {
            isSubscribedRef.current = true
            logger.info(`✅ Successfully subscribed to booking updates for: ${bookingId}`)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            logger.warn(`📅 Booking realtime subscription error: ${status}`)
            isSubscribedRef.current = false
          } else if (status === 'CLOSED') {
            isSubscribedRef.current = false
            logger.info(`🔌 Booking subscription closed for: ${bookingId}`)
          }
        })

      channelRef.current = channel

      // Cleanup subscription on unmount
      return () => {
        try {
          if (channelRef.current) {
            supabase.removeChannel(channelRef.current)
            isSubscribedRef.current = false
          }
        } catch (cleanupError) {
          logger.error('Error cleaning up booking realtime subscription:', cleanupError)
        }
      }
    } catch (error) {
      logger.error('Error initializing booking realtime subscription:', error)
      isSubscribedRef.current = false
    }
  }, [bookingId])

  return { isSubscribed: isSubscribedRef.current }
}
