'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/context/auth-context'
import { debounce } from '@/lib/utils/performance'
import { DraftData, createDraft, updateDraft, deleteDraft } from '@/lib/utils/draft-manager'
import { logger } from '@/lib/utils/logger'

export interface UseDraftOptions {
  type: 'post' | 'comment'
  initialData?: Partial<DraftData>
  draftKey?: string // Custom key for identifying this draft (e.g., postId + parentId for comments)
  autoSaveInterval?: number // Default: 30000ms (30 seconds)
  enabled?: boolean // Default: true
}

export interface UseDraftReturn {
  draft: DraftData | null
  updateDraft: (updates: Partial<DraftData>) => void
  saveDraft: () => Promise<void>
  deleteDraft: () => Promise<void>
  isSaving: boolean
  lastSaved: Date | null
  hasUnsavedChanges: boolean
  error: Error | null
  handleBlur: () => void
}

const AUTO_SAVE_INTERVAL = 30000 // 30 seconds

/**
 * Hook for managing draft auto-save functionality
 * Handles debounced auto-save, blur save, and draft restoration
 */
export function useDraft({
  type,
  initialData = {},
  draftKey,
  autoSaveInterval = AUTO_SAVE_INTERVAL,
  enabled = true,
}: UseDraftOptions): UseDraftReturn {
  const { user } = useAuth()
  const [draft, setDraft] = useState<DraftData | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Generate draft key if not provided
  const generatedDraftKey = useRef<string | null>(null)
  if (!generatedDraftKey.current && user) {
    if (draftKey) {
      generatedDraftKey.current = draftKey
    } else if (type === 'post') {
      generatedDraftKey.current = `draft_post_${user.id}_${initialData.community_id || 'default'}`
    } else {
      // Comment draft
      const postId = initialData.post_id || 'default'
      const parentId = initialData.parent_id || 'root'
      generatedDraftKey.current = `draft_comment_${user.id}_${postId}_${parentId}`
    }
  }

  const currentDraftKey = generatedDraftKey.current

  // Debounced auto-save function
  const debouncedSave = useRef(
    debounce((...args: unknown[]) => {
      const draftData = args[0] as DraftData
      if (!enabled || !user) return // Use async IIFE to handle async operations
      ;(async () => {
        try {
          setIsSaving(true)
          setError(null)

          // Save to database via API
          const response = await fetch('/api/drafts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...draftData,
              user_id: user.id,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to save draft')
          }

          const result = await response.json()
          const savedDraft = result.data as DraftData

          // Update local draft with saved data
          setDraft(savedDraft)
          setLastSaved(new Date(savedDraft.last_saved_at))
          setHasUnsavedChanges(false)

          // Also update localStorage
          updateDraft(savedDraft.id, savedDraft)

          logger.debug(`💾 Auto-saved draft: ${savedDraft.id}`)
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Failed to save draft')
          setError(error)
          logger.error('Failed to auto-save draft:', error)
        } finally {
          setIsSaving(false)
        }
      })()
    }, autoSaveInterval)
  ).current

  // Restore draft on mount
  useEffect(() => {
    if (!enabled || !user || !currentDraftKey) return

    const restoreDraft = async () => {
      try {
        // First, try to fetch from database
        const response = await fetch('/api/drafts')
        if (response.ok) {
          const result = await response.json()
          const drafts = result.data as DraftData[]

          // Find matching draft
          const matchingDraft = drafts.find((d) => {
            if (type === 'post') {
              return (
                d.type === 'post' &&
                d.community_id === initialData.community_id &&
                d.user_id === user.id
              )
            } else {
              return (
                d.type === 'comment' &&
                d.post_id === initialData.post_id &&
                d.parent_id === (initialData.parent_id || undefined) &&
                d.user_id === user.id
              )
            }
          })

          if (matchingDraft) {
            setDraft(matchingDraft)
            setLastSaved(new Date(matchingDraft.last_saved_at))
            setHasUnsavedChanges(false)

            // Update localStorage
            updateDraft(matchingDraft.id, matchingDraft)
            return
          }
        }

        // If no database draft, check localStorage
        const { getDrafts: getAllDrafts } = await import('@/lib/utils/draft-manager')
        const localDrafts = getAllDrafts(user.id)
        const localDraft = localDrafts.find((d) => {
          if (type === 'post') {
            return (
              d.type === 'post' &&
              d.community_id === initialData.community_id &&
              d.user_id === user.id
            )
          } else {
            return (
              d.type === 'comment' &&
              d.post_id === initialData.post_id &&
              d.parent_id === (initialData.parent_id || undefined) &&
              d.user_id === user.id
            )
          }
        })

        if (localDraft) {
          setDraft(localDraft)
          setLastSaved(new Date(localDraft.last_saved_at))
          setHasUnsavedChanges(!localDraft.is_synced)

          // If not synced, try to sync with database
          if (!localDraft.is_synced) {
            debouncedSave(localDraft)
          }
        }
      } catch (err) {
        logger.error('Failed to restore draft:', err)
      }
    }

    restoreDraft()
  }, [
    enabled,
    user,
    currentDraftKey,
    type,
    initialData.community_id,
    initialData.post_id,
    initialData.parent_id,
    debouncedSave,
  ])

  // Create initial draft if needed
  useEffect(() => {
    if (!enabled || !user || !currentDraftKey || draft) return

    // Only create draft if there's initial data
    if (initialData.title || initialData.body || initialData.media_items?.length) {
      const newDraft = createDraft(type, initialData, user.id)
      setDraft(newDraft)
      setHasUnsavedChanges(true)
    }
  }, [enabled, user, currentDraftKey, type, initialData, draft])

  // Update draft function
  const handleUpdateDraft = useCallback(
    (updates: Partial<DraftData>) => {
      if (!enabled || !user || !currentDraftKey) return

      const currentDraft = draft || createDraft(type, initialData, user.id)

      const updatedDraft: DraftData = {
        ...currentDraft,
        ...updates,
        updated_at: new Date().toISOString(),
        is_synced: false,
      }

      setDraft(updatedDraft)
      setHasUnsavedChanges(true)

      // Update localStorage immediately
      updateDraft(updatedDraft.id, updatedDraft)

      // Trigger debounced save
      debouncedSave(updatedDraft)
    },
    [enabled, user, currentDraftKey, draft, type, initialData, debouncedSave]
  )

  // Manual save function (immediate)
  const handleSaveDraft = useCallback(async () => {
    if (!enabled || !user || !currentDraftKey || !draft) return

    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          user_id: user.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save draft')
      }

      const result = await response.json()
      const savedDraft = result.data as DraftData

      setDraft(savedDraft)
      setLastSaved(new Date(savedDraft.last_saved_at))
      setHasUnsavedChanges(false)

      // Update localStorage
      updateDraft(savedDraft.id, savedDraft)

      logger.debug(`💾 Manually saved draft: ${savedDraft.id}`)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save draft')
      setError(error)
      logger.error('Failed to save draft:', error)
      throw error
    } finally {
      setIsSaving(false)
    }
  }, [enabled, user, currentDraftKey, draft])

  // Delete draft function
  const handleDeleteDraft = useCallback(async () => {
    if (!enabled || !user || !currentDraftKey || !draft) return

    try {
      // Delete from database
      const response = await fetch(`/api/drafts/${draft.id}`, {
        method: 'DELETE',
      })

      if (!response.ok && response.status !== 404) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete draft')
      }

      // Delete from localStorage
      deleteDraft(draft.id)

      setDraft(null)
      setLastSaved(null)
      setHasUnsavedChanges(false)

      logger.debug(`🗑️ Deleted draft: ${draft.id}`)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete draft')
      setError(error)
      logger.error('Failed to delete draft:', error)
      throw error
    }
  }, [enabled, user, currentDraftKey, draft])

  // Save on blur (immediate)
  const handleBlur = useCallback(() => {
    if (hasUnsavedChanges && draft) {
      handleSaveDraft().catch((err) => {
        logger.error('Failed to save draft on blur:', err)
      })
    }
  }, [hasUnsavedChanges, draft, handleSaveDraft])

  // Save before page unload
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges || !draft) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Try to save synchronously (may not work in all browsers)
      handleSaveDraft().catch(() => {
        // Ignore errors on unload
      })
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [enabled, hasUnsavedChanges, draft, handleSaveDraft])

  return {
    draft,
    updateDraft: handleUpdateDraft,
    saveDraft: handleSaveDraft,
    deleteDraft: handleDeleteDraft,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    error,
    handleBlur,
  }
}
