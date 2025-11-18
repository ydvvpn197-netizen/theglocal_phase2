'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useToast } from '@/lib/hooks/use-toast'

const DRAFT_STORAGE_KEY = 'event-creation-draft'
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

export interface EventFormData {
  title: string
  description?: string
  event_date: string
  event_time: string
  location_city: string
  location_address?: string
  category: string
  ticket_info?: string
}

interface UseEventFormOptions {
  onSuccess?: (eventId: string) => void
  clearDraftOnSuccess?: boolean
}

export function useEventForm({ onSuccess, clearDraftOnSuccess = true }: UseEventFormOptions = {}) {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [draftSaved, setDraftSaved] = useState(false)

  // Save draft to localStorage with debouncing
  const saveDraft = useCallback((data: Partial<EventFormData>) => {
    if (typeof window === 'undefined') return

    try {
      const draft = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + DRAFT_EXPIRY_MS,
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 2000)
    } catch (error) {
      logger.warn('Failed to save draft:', error)
    }
  }, [])

  // Load draft from localStorage
  const loadDraft = useCallback((): Partial<EventFormData> | null => {
    if (typeof window === 'undefined') return null

    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (!stored) return null

      const draft = JSON.parse(stored)

      // Check if draft is expired
      if (Date.now() > draft.expiresAt) {
        localStorage.removeItem(DRAFT_STORAGE_KEY)
        return null
      }

      return draft.data
    } catch (error) {
      logger.warn('Failed to load draft:', error)
      return null
    }
  }, [])

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch (error) {
      logger.warn('Failed to clear draft:', error)
    }
  }, [])

  // React Query mutation for event creation with optimistic updates
  const mutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      // Combine date and time into ISO string
      const eventDateTime = new Date(`${data.event_date}T${data.event_time}`)

      // Validate future date
      if (eventDateTime <= new Date()) {
        throw new Error('INVALID_DATE')
      }

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          event_date: eventDateTime.toISOString(),
          location_city: data.location_city,
          location_address: data.location_address,
          category: data.category,
          ticket_info: data.ticket_info,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('SESSION_EXPIRED')
        }
        if (response.status === 403) {
          const errorMsg = result.error?.toLowerCase() || ''
          // Check for subscription error first (more specific)
          if (
            errorMsg.includes('subscription') ||
            errorMsg.includes('active subscription required')
          ) {
            throw new Error('SUBSCRIPTION_REQUIRED')
          }
          // Check for artist registration error (more specific pattern)
          if (
            errorMsg.includes('artist profile required') ||
            errorMsg.includes('register as an artist')
          ) {
            throw new Error('ARTIST_REQUIRED')
          }
          throw new Error('FORBIDDEN')
        }
        if (response.status === 400) {
          if (result.error?.includes('future')) {
            throw new Error('INVALID_DATE')
          }
          throw new Error('VALIDATION_ERROR')
        }
        if (response.status === 429) {
          throw new Error('RATE_LIMITED')
        }
        // Log unexpected errors for debugging
        logger.error('Unexpected error creating event:', {
          status: response.status,
          error: result.error,
          result,
        })
        throw new Error(result.error || 'Failed to create event')
      }

      return result
    },
    onSuccess: (result) => {
      if (clearDraftOnSuccess) {
        clearDraft()
      }

      // Invalidate events queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['events', 'list'] })

      toast({
        title: 'Event created',
        description: 'Your event has been created successfully',
      })

      if (onSuccess) {
        onSuccess(result.data.id)
      } else if (result.data?.id) {
        router.push(`/events/${result.data.id}`)
        router.refresh()
      } else {
        router.push('/events')
      }
    },
    onError: (error: Error) => {
      let title = 'Error'
      let description = error.message

      if (error.message === 'SESSION_EXPIRED') {
        title = 'Session Expired'
        description = 'Your session has expired. Please sign in again to continue.'
        router.push('/auth/login')
        return
      }

      if (error.message === 'ARTIST_REQUIRED') {
        title = 'Artist Registration Required'
        description = 'You need to register as an artist to create events.'
        router.push('/artists/register')
        return
      }

      if (error.message === 'SUBSCRIPTION_REQUIRED') {
        title = 'Subscription Required'
        description =
          'You need an active subscription to create events. Please renew your subscription to continue.'
        router.push('/artists/dashboard')
        return
      }

      if (error.message === 'INVALID_DATE') {
        title = 'Invalid Date'
        description = 'Event date must be in the future. Please select a future date and time.'
      }

      if (error.message === 'VALIDATION_ERROR') {
        title = 'Validation Error'
        description = 'Please check all required fields and try again.'
      }

      if (error.message === 'FORBIDDEN') {
        title = 'Access Denied'
        description =
          'You do not have permission to create events. Please contact support if you believe this is an error.'
      }

      if (error.message === 'RATE_LIMITED') {
        title = 'Too Many Requests'
        description =
          "You've created too many events recently. Please wait before creating another one."
      }

      // Check for network errors
      if (
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('Failed to fetch')
      ) {
        title = 'Network Error'
        description =
          'Unable to connect to the server. Check your internet connection and try again.'
      }

      toast({
        title,
        description,
        variant: 'destructive',
      })
    },
  })

  return {
    createEvent: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    draftSaved,
    saveDraft,
    loadDraft,
    clearDraft,
  }
}
