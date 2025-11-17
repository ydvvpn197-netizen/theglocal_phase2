'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useToast } from '@/lib/hooks/use-toast'

const DRAFT_STORAGE_KEY = 'community-creation-draft'
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

interface CommunityFormData {
  name: string
  description: string
  location_city: string
  is_private: boolean
  rules?: string
}

interface UseCommunityFormOptions {
  onSuccess?: (communitySlug: string) => void
  clearDraftOnSuccess?: boolean
}

export function useCommunityForm({
  onSuccess,
  clearDraftOnSuccess = true,
}: UseCommunityFormOptions = {}) {
  const router = useRouter()
  const { toast } = useToast()
  const [draftSaved, setDraftSaved] = useState(false)

  // Save draft to localStorage with debouncing
  const saveDraft = useCallback((data: Partial<CommunityFormData>) => {
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
  const loadDraft = useCallback((): Partial<CommunityFormData> | null => {
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

  // React Query mutation for community creation
  const mutation = useMutation({
    mutationFn: async (data: CommunityFormData) => {
      const response = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('SESSION_EXPIRED')
        }
        if (response.status === 409) {
          throw new Error('ALREADY_EXISTS')
        }
        if (response.status === 429) {
          throw new Error('RATE_LIMITED')
        }
        throw new Error(result.error || 'Failed to create community')
      }

      return result
    },
    onSuccess: (result) => {
      if (clearDraftOnSuccess) {
        clearDraft()
      }

      toast({
        title: 'Community Created!',
        description: `${result.data.name} has been created successfully`,
      })

      if (onSuccess) {
        onSuccess(result.data.slug)
      } else {
        router.push(`/communities/${result.data.slug}`)
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

      if (error.message === 'ALREADY_EXISTS') {
        title = 'Community Already Exists'
        description =
          'A community with this name already exists in your city. Try adding a more specific name or different location.'
      }

      if (error.message === 'RATE_LIMITED') {
        title = 'Too Many Requests'
        description =
          "You've created too many communities recently. Please wait before creating another one."
      }

      // Check for network errors
      if (error.message.includes('fetch') || error.message.includes('network')) {
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
    createCommunity: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    draftSaved,
    saveDraft,
    loadDraft,
    clearDraft,
  }
}
