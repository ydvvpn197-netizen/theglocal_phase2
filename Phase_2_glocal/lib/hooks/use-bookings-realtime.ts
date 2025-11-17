'use client'

import { logger } from '@/lib/utils/logger'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'
import { BookingRow } from '@/lib/types/realtime.types'
import { isBookingPayload } from '@/lib/types/type-guards'

interface UseBookingsRealtimeOptions {
  userId: string
  isArtist: boolean
  onUpdate?: (bookingId: string) => void
}

/**
 * Hook to subscribe to real-time updates for bookings list
 * Subscribes to UPDATE events on bookings table for the current user
 * (both as artist receiving bookings and as user making bookings)
 */
export function useBookingsRealtime({ userId, isArtist, onUpdate }: UseBookingsRealtimeOptions) {
  const isSubscribedRef = useRef(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const onUpdateRef = useRef(onUpdate)

  // Update callback ref when it changes
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  useEffect(() => {
    if (!userId) return

    try {
      const supabase = createClient()

      // Reset subscription state
      isSubscribedRef.current = false

      // Create filter based on user role
      // If artist: filter by artist_id
      // If user: filter by user_id
      const filter = isArtist ? `artist_id=eq.${userId}` : `user_id=eq.${userId}`

      // Subscribe to booking changes
      const channel = supabase
        .channel(`bookings-${userId}-${isArtist ? 'artist' : 'user'}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings',
            filter,
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
            logger.info('🔄 Booking updated in list:', payload.new)
            const updatedBooking: BookingRow = payload.new

            // Call the onUpdate callback if provided
            if (onUpdateRef.current) {
              onUpdateRef.current(updatedBooking.id)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'bookings',
            filter,
          },
          (payload) => {
            // Only process events when subscription is ready
            if (!isSubscribedRef.current) {
              logger.warn('📅 Received INSERT event before subscription ready')
              return
            }

            if (!isBookingPayload(payload) || !payload.new) {
              logger.warn('📅 Invalid booking insert payload received')
              return
            }
            logger.info('🆕 New booking added:', payload.new)
            const newBooking: BookingRow = payload.new

            // Call the onUpdate callback if provided
            if (onUpdateRef.current) {
              onUpdateRef.current(newBooking.id)
            }
          }
        )
        .subscribe((status) => {
          logger.info(`📅 Bookings list realtime status for ${userId}:`, status)

          if (status === 'SUBSCRIBED') {
            isSubscribedRef.current = true
            logger.info(`✅ Successfully subscribed to bookings list updates for: ${userId}`)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            logger.warn(`📅 Bookings list realtime subscription error: ${status}`)
            isSubscribedRef.current = false
          } else if (status === 'CLOSED') {
            isSubscribedRef.current = false
            logger.info(`🔌 Bookings list subscription closed for: ${userId}`)
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
          logger.error('Error cleaning up bookings list realtime subscription:', cleanupError)
        }
      }
    } catch (error) {
      logger.error('Error initializing bookings list realtime subscription:', error)
      isSubscribedRef.current = false
    }
  }, [userId, isArtist])

  return { isSubscribed: isSubscribedRef.current }
}
