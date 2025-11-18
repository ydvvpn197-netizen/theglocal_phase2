'use client'

import { logger } from '@/lib/utils/logger'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  realtimeConnectionManager,
  generateSubscriptionKey,
} from '@/lib/utils/realtime-connection-manager'
import { RealtimeChannel } from '@supabase/supabase-js'
import { CommunityRow } from '@/lib/types/realtime.types'
import { isCommunityPayload } from '@/lib/types/type-guards'

interface Community {
  id: string
  name: string
  slug: string
  description: string | null
  location_city: string
  member_count: number
  post_count: number
  is_private: boolean
  is_featured: boolean
  category?: string
  tags?: string[]
  created_at: string
}

interface UseCommunityListRealtimeProps {
  city?: string | null
  category?: string | null
  onNewCommunity?: (community: Community) => void
  onCommunityUpdate?: (communityId: string, updates: Partial<Community>) => void
  onCommunityDelete?: (communityId: string) => void
}

interface UseCommunityListRealtimeResult {
  isConnected: boolean
  error: string | null
}

/**
 * Hook to subscribe to real-time updates for communities list
 * Handles INSERT, UPDATE, and DELETE events on communities table
 * Also handles member count updates via community_members table
 */
export function useCommunityListRealtime({
  city,
  category,
  onNewCommunity,
  onCommunityUpdate,
  onCommunityDelete,
}: UseCommunityListRealtimeProps): UseCommunityListRealtimeResult {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const membersChannelRef = useRef<RealtimeChannel | null>(null)
  const callbacksRef = useRef({ onNewCommunity, onCommunityUpdate, onCommunityDelete })

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = { onNewCommunity, onCommunityUpdate, onCommunityDelete }
  }, [onNewCommunity, onCommunityUpdate, onCommunityDelete])

  useEffect(() => {
    const supabase = createClient()

    // Generate subscription keys
    const communitiesKey = generateSubscriptionKey(
      'communities-list',
      city || 'all',
      category || 'all'
    )
    const membersKey = generateSubscriptionKey('community-members-updates')

    try {
      // Create filter for communities (city and category filters are applied client-side)
      // We subscribe to all communities and filter client-side for better performance

      // Create channel for communities using connection manager
      const channel = realtimeConnectionManager.getChannel(communitiesKey, () => {
        return supabase.channel(communitiesKey)
      })

      channelRef.current = channel

      // Subscribe to INSERT events (new communities)
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'communities',
          },
          async (payload) => {
            if (!isCommunityPayload(payload) || !payload.new) {
              logger.warn('🆕 Invalid community payload received')
              return
            }
            logger.info('🆕 New community:', payload.new)
            const newCommunity: CommunityRow = payload.new

            // Apply client-side filters
            if (city && newCommunity.location_city !== city) return
            if (
              category &&
              'category' in newCommunity &&
              (newCommunity as { category?: string }).category !== category
            )
              return

            try {
              // Fetch complete community data
              const { data: fullCommunity, error: fetchError } = await supabase
                .from('communities')
                .select('*')
                .eq('id', newCommunity.id)
                .single()

              if (fetchError) {
                logger.error('Error fetching new community data:', fetchError)
                return
              }

              if (fullCommunity && callbacksRef.current.onNewCommunity) {
                callbacksRef.current.onNewCommunity(fullCommunity as Community)
              }
            } catch (err) {
              logger.error('Error processing new community:', err)
            }
          }
        )
        // Subscribe to UPDATE events (community updates)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'communities',
          },
          (payload) => {
            if (!isCommunityPayload(payload) || !payload.new) {
              logger.warn('🔄 Invalid community update payload received')
              return
            }
            logger.info('🔄 Community updated:', payload.new)
            const updatedCommunity: CommunityRow = payload.new

            if (callbacksRef.current.onCommunityUpdate) {
              callbacksRef.current.onCommunityUpdate(
                updatedCommunity.id,
                updatedCommunity as Partial<Community>
              )
            }
          }
        )
        // Subscribe to DELETE events
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'communities',
          },
          (payload) => {
            logger.info('🗑️ Community deleted:', payload.old.id)
            if (callbacksRef.current.onCommunityDelete) {
              callbacksRef.current.onCommunityDelete(payload.old.id)
            }
          }
        )
        .subscribe((status) => {
          logger.info('📡 Communities list realtime status:', status)
          setIsConnected(status === 'SUBSCRIBED')
          if (status === 'CHANNEL_ERROR') {
            setError('Failed to subscribe to communities updates')
          } else {
            setError(null)
          }
        })

      // Create separate channel for member count updates
      const membersChannel = realtimeConnectionManager.getChannel(membersKey, () => {
        return supabase.channel(membersKey)
      })

      membersChannelRef.current = membersChannel

      // Subscribe to member count changes
      membersChannel
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'community_members',
          },
          async (payload) => {
            logger.info('👥 Community member change', {
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
            })
            interface MembershipPayload {
              new?: { community_id?: string }
              old?: { community_id?: string }
            }
            const membershipPayload = payload as unknown as MembershipPayload
            const communityId =
              membershipPayload.new?.community_id || membershipPayload.old?.community_id || null

            if (!communityId) return

            try {
              // Recalculate member count
              const { count, error: countError } = await supabase
                .from('community_members')
                .select('*', { count: 'exact', head: true })
                .eq('community_id', communityId)

              if (countError) {
                logger.error('Error fetching member count:', countError)
                return
              }

              // Update community with new member count
              if (callbacksRef.current.onCommunityUpdate) {
                callbacksRef.current.onCommunityUpdate(communityId, {
                  member_count: count || 0,
                } as Partial<Community>)
              }
            } catch (err) {
              logger.error('Error updating member count:', err)
            }
          }
        )
        .subscribe()

      // Cleanup on unmount
      return () => {
        try {
          if (channelRef.current) {
            realtimeConnectionManager.releaseChannel(communitiesKey, channelRef.current)
          }
          if (membersChannelRef.current) {
            realtimeConnectionManager.releaseChannel(membersKey, membersChannelRef.current)
          }
        } catch (err) {
          logger.error('Error cleaning up community list subscription:', err)
        }
      }
    } catch (err) {
      logger.error('Error setting up community list realtime subscription:', err)
      setError(err instanceof Error ? err.message : 'Failed to setup subscription')
      setIsConnected(false)
    }
  }, [city, category])

  return { isConnected, error }
}
