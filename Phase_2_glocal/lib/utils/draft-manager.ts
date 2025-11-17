// Auto-save draft management system with localStorage and server sync
import { MediaItem } from '@/components/posts/enhanced-media-gallery'

export interface DraftData {
  id: string
  type: 'post' | 'comment'
  title?: string
  body: string
  external_url?: string
  location_city?: string
  community_id?: string
  parent_id?: string // For comment drafts
  post_id?: string // For comment drafts - the post being commented on
  media_items: MediaItem[]
  created_at: string
  updated_at: string
  last_saved_at: string
  user_id: string
  auto_saved: boolean
  is_synced: boolean
}

export interface DraftMetadata {
  total_drafts: number
  unsaved_drafts: number
  last_auto_save: string | null
  storage_usage: number // bytes
}

class DraftManager {
  private static readonly STORAGE_KEY = 'post_drafts'
  private static readonly MAX_DRAFTS = 50
  private static readonly AUTO_SAVE_INTERVAL = 30000 // 30 seconds
  private static readonly MAX_STORAGE_SIZE = 50 * 1024 * 1024 // 50MB

  private autoSaveTimer: NodeJS.Timeout | null = null
  private pendingSaves = new Map<string, DraftData>()

  constructor() {
    // Only run client-side operations in browser
    if (typeof window !== 'undefined') {
      this.cleanupOldDrafts()
      this.startAutoSave()
    }
  }

  /**
   * Create a new draft
   */
  createDraft(
    type: 'post' | 'comment',
    initialData: Partial<DraftData>,
    userId: string
  ): DraftData {
    const now = new Date().toISOString()
    const draft: DraftData = {
      id: `draft_${Date?.now()}_${Math?.random().toString(36).substring(2)}`,
      type,
      title: initialData?.title || '',
      body: initialData?.body || '',
      external_url: initialData?.external_url || '',
      location_city: initialData?.location_city || '',
      community_id: initialData?.community_id || '',
      parent_id: initialData?.parent_id || '',
      post_id: initialData?.post_id || '',
      media_items: initialData?.media_items || [],
      created_at: now,
      updated_at: now,
      last_saved_at: now,
      user_id: userId,
      auto_saved: false,
      is_synced: false,
    }

    this.saveDraft(draft)
    console?.warn('📝 Created new draft:', draft?.id)
    return draft
  }

  /**
   * Update an existing draft
   */
  updateDraft(draftId: string, updates: Partial<DraftData>): DraftData | null {
    const drafts = this.getDrafts()
    const draftIndex = drafts?.findIndex((d) => d?.id === draftId)

    if (draftIndex === -1) {
      console?.warn('Draft not found for update:', draftId)
      return null
    }

    const existingDraft = drafts[draftIndex]
    if (!existingDraft) {
      console?.warn('Draft not found for update:', draftId)
      return null
    }

    const updatedDraft: DraftData = {
      ...existingDraft,
      ...updates,
      id: existingDraft.id || '',
      updated_at: new Date().toISOString(),
      is_synced: false, // Mark as needing sync
    }

    drafts[draftIndex] = updatedDraft
    this.storeDrafts(drafts)

    // Add to pending saves for auto-save
    this.pendingSaves.set(draftId, updatedDraft)

    console?.warn('📝 Updated draft:', draftId)
    return updatedDraft
  }

  /**
   * Auto-save a draft (called periodically)
   */
  async autoSaveDraft(draftId: string): Promise<boolean> {
    const draft = this?.getDraft(draftId)
    if (!draft) return false

    try {
      // Update last auto-save timestamp
      const autoSavedDraft = {
        ...draft,
        last_saved_at: new Date().toISOString(),
        auto_saved: true,
      }

      // Save locally first
      this?.updateDraft(draftId, autoSavedDraft)

      // Attempt server sync (non-blocking)
      this?.syncDraftToServer(autoSavedDraft).catch((error) => {
        console?.warn('Server sync failed for draft:', draftId, error)
      })

      console?.warn('💾 Auto-saved draft:', draftId)
      return true
    } catch (error) {
      console?.error('Auto-save failed for draft:', draftId, error)
      return false
    }
  }

  /**
   * Sync draft to server
   */
  private async syncDraftToServer(draft: DraftData): Promise<void> {
    try {
      const response = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON?.stringify(draft),
      })

      if (response?.ok) {
        // Mark as synced
        this?.updateDraft(draft?.id, { is_synced: true })
        console?.warn('☁️ Synced draft to server:', draft?.id)
      } else {
        console?.warn('Server sync failed:', response?.statusText)
      }
    } catch (error) {
      console?.error('Server sync error:', error)
      throw error
    }
  }

  /**
   * Get a specific draft
   */
  getDraft(draftId: string): DraftData | null {
    const drafts = this?.getDrafts()
    return drafts?.find((d) => d?.id === draftId) || null
  }

  /**
   * Get all drafts for current user
   */
  getDrafts(userId?: string): DraftData[] {
    // Only access localStorage in browser environment
    if (typeof window === 'undefined') {
      return []
    }

    try {
      const stored = localStorage?.getItem(DraftManager?.STORAGE_KEY)
      if (!stored) return []

      const drafts: DraftData[] = JSON?.parse(stored)

      // Filter by user if specified
      return userId ? drafts?.filter((d) => d?.user_id === userId) : drafts
    } catch (error) {
      console?.error('Error loading drafts:', error)
      return []
    }
  }

  /**
   * Save a draft to localStorage
   */
  private saveDraft(draft: DraftData): void {
    const drafts = this?.getDrafts()

    // Remove existing draft with same ID
    const filteredDrafts = drafts?.filter((d) => d?.id !== draft?.id)

    // Add updated draft
    filteredDrafts?.push(draft)

    // Sort by updated_at (newest first)
    filteredDrafts?.sort(
      (a, b) => new Date(b?.updated_at).getTime() - new Date(a?.updated_at).getTime()
    )

    // Limit number of drafts
    const limitedDrafts = filteredDrafts?.slice(0, DraftManager?.MAX_DRAFTS)

    this?.storeDrafts(limitedDrafts)
  }

  /**
   * Store drafts to localStorage with size check
   */
  private storeDrafts(drafts: DraftData[]): void {
    // Only access localStorage in browser environment
    if (typeof window === 'undefined') {
      return
    }

    try {
      const dataString = JSON?.stringify(drafts)

      // Check storage size
      if (dataString?.length > DraftManager?.MAX_STORAGE_SIZE) {
        console?.warn('Draft storage size limit reached, removing oldest drafts')

        // Remove oldest drafts until under limit
        while (dataString?.length > DraftManager?.MAX_STORAGE_SIZE && drafts?.length > 1) {
          drafts?.pop() // Remove oldest
        }
      }

      localStorage?.setItem(DraftManager?.STORAGE_KEY, JSON?.stringify(drafts))
    } catch (error) {
      console?.error('Error storing drafts:', error)

      // If storage is full, try to clean up
      if (typeof window !== 'undefined') {
        this?.cleanupOldDrafts()

        // Retry with fewer drafts
        try {
          const reducedDrafts = drafts?.slice(0, Math?.floor(drafts?.length / 2))
          localStorage?.setItem(DraftManager?.STORAGE_KEY, JSON?.stringify(reducedDrafts))
        } catch (retryError) {
          console?.error('Failed to store reduced drafts:', retryError)
        }
      }
    }
  }

  /**
   * Delete a draft
   */
  deleteDraft(draftId: string): boolean {
    const drafts = this?.getDrafts()
    const filteredDrafts = drafts?.filter((d) => d?.id !== draftId)

    if (filteredDrafts?.length === drafts?.length) {
      console?.warn('Draft not found for deletion:', draftId)
      return false
    }

    this?.storeDrafts(filteredDrafts)
    this?.pendingSaves.delete(draftId)

    // Also try to delete from server
    this?.deleteDraftFromServer(draftId).catch((error) => {
      console?.warn('Server deletion failed:', error)
    })

    console?.warn('🗑️ Deleted draft:', draftId)
    return true
  }

  /**
   * Delete draft from server
   */
  private async deleteDraftFromServer(draftId: string): Promise<void> {
    try {
      await fetch(`/api/drafts/${draftId}`, {
        method: 'DELETE',
      })
    } catch (error) {
      console?.error('Server deletion error:', error)
      throw error
    }
  }

  /**
   * Recover drafts from server
   */
  async recoverDrafts(userId: string): Promise<DraftData[]> {
    try {
      const response = await fetch(`/api/drafts?userId=${userId}`)

      if (!response?.ok) {
        throw new Error(`Server recovery failed: ${response?.statusText}`)
      }

      const serverDrafts: DraftData[] = await response?.json()

      // Merge with local drafts (server takes precedence for conflicts)
      const localDrafts = this?.getDrafts(userId)
      const mergedDrafts = new Map<string, DraftData>()

      // Add local drafts first
      localDrafts?.forEach((draft) => {
        mergedDrafts?.set(draft?.id, draft)
      })

      // Override with server drafts
      serverDrafts?.forEach((draft) => {
        mergedDrafts?.set(draft?.id, { ...draft, is_synced: true })
      })

      const recoveredDrafts = Array?.from(mergedDrafts?.values())

      // Store merged drafts
      this?.storeDrafts(recoveredDrafts)

      console?.warn(`🔄 Recovered ${serverDrafts?.length} drafts from server`)
      return recoveredDrafts
    } catch (error) {
      console?.error('Draft recovery failed:', error)
      throw error
    }
  }

  /**
   * Get draft metadata
   */
  getMetadata(userId?: string): DraftMetadata {
    const drafts = this?.getDrafts(userId)
    const unsavedDrafts = drafts?.filter((d) => !d?.is_synced)
    const lastAutoSave =
      drafts?.length > 0
        ? drafts?.reduce(
            (latest, draft) =>
              new Date(draft?.last_saved_at || '') > new Date(latest)
                ? draft?.last_saved_at || ''
                : latest,
            drafts[0]?.last_saved_at || ''
          )
        : null

    // Calculate approximate storage usage
    const storageUsage = JSON?.stringify(drafts).length * 2 // Rough UTF-16 byte estimate

    return {
      total_drafts: drafts?.length,
      unsaved_drafts: unsavedDrafts?.length,
      last_auto_save: lastAutoSave || null,
      storage_usage: storageUsage,
    }
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    this.autoSaveTimer = setInterval(() => {
      if (this.pendingSaves.size > 0) {
        console?.warn(`💾 Auto-saving ${this.pendingSaves.size} pending drafts`)

        for (const [draftId] of this.pendingSaves) {
          this.autoSaveDraft(draftId)
        }

        this.pendingSaves.clear()
      }
    }, DraftManager.AUTO_SAVE_INTERVAL)
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave(): void {
    if (this?.autoSaveTimer) {
      clearInterval(this?.autoSaveTimer)
      this.autoSaveTimer = null
    }
  }

  /**
   * Clean up old drafts
   */
  private cleanupOldDrafts(): void {
    // Only run in browser environment
    if (typeof window === 'undefined') {
      return
    }

    const drafts = this?.getDrafts()
    const thirtyDaysAgo = new Date(Date?.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const recentDrafts = drafts?.filter(
      (draft) => draft?.updated_at > thirtyDaysAgo || !draft?.auto_saved
    )

    if (recentDrafts?.length < drafts?.length) {
      this?.storeDrafts(recentDrafts)
      console?.warn(`🧹 Cleaned up ${drafts?.length - recentDrafts?.length} old drafts`)
    }
  }

  /**
   * Clear all drafts (for testing/reset)
   */
  clearAllDrafts(): void {
    if (typeof window !== 'undefined') {
      localStorage?.removeItem(DraftManager?.STORAGE_KEY)
    }
    this?.pendingSaves.clear()
    console?.warn('🧹 Cleared all drafts')
  }

  /**
   * Export drafts for backup
   */
  exportDrafts(): string {
    const drafts = this?.getDrafts()
    return JSON?.stringify(drafts, null, 2)
  }

  /**
   * Import drafts from backup
   */
  importDrafts(exportedData: string, userId: string): number {
    try {
      const importedDrafts: DraftData[] = JSON?.parse(exportedData)
      const existingDrafts = this?.getDrafts()

      // Filter imported drafts to only include those for this user
      const userDrafts = importedDrafts?.filter((d) => d?.user_id === userId)

      // Merge with existing drafts (imported takes precedence)
      const mergedDrafts = new Map<string, DraftData>()

      existingDrafts?.forEach((draft) => {
        mergedDrafts?.set(draft?.id, draft)
      })

      userDrafts?.forEach((draft) => {
        mergedDrafts?.set(draft?.id, { ...draft, is_synced: false })
      })

      const finalDrafts = Array?.from(mergedDrafts?.values())
      this?.storeDrafts(finalDrafts)

      console?.warn(`📥 Imported ${userDrafts?.length} drafts`)
      return userDrafts?.length
    } catch (error) {
      console?.error('Draft import failed:', error)
      throw error
    }
  }
}

// Singleton instance - lazy loaded to avoid SSR issues
let draftManagerInstance: DraftManager | null = null

const getDraftManager = (): DraftManager => {
  if (draftManagerInstance === null) {
    draftManagerInstance = new DraftManager()
  }
  return draftManagerInstance
}

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window?.addEventListener('beforeunload', () => {
    getDraftManager()?.stopAutoSave()
  })
}

// Export getter function for true lazy loading
export default getDraftManager

// Convenience functions
export const createDraft = (type: 'post' | 'comment', data: Partial<DraftData>, userId: string) => {
  return getDraftManager()?.createDraft(type, data, userId)
}

export const updateDraft = (draftId: string, updates: Partial<DraftData>) => {
  return getDraftManager()?.updateDraft(draftId, updates)
}

export const getDraft = (draftId: string) => {
  return getDraftManager()?.getDraft(draftId)
}

export const getDrafts = (userId?: string) => {
  return getDraftManager()?.getDrafts(userId)
}

export const deleteDraft = (draftId: string) => {
  return getDraftManager()?.deleteDraft(draftId)
}

export const getDraftMetadata = (userId?: string) => {
  return getDraftManager()?.getMetadata(userId)
}

export const recoverDrafts = (userId: string) => {
  return getDraftManager()?.recoverDrafts(userId)
}

export const clearAllDrafts = () => {
  return getDraftManager()?.clearAllDrafts()
}

export const exportDrafts = () => {
  return getDraftManager()?.exportDrafts()
}

export const importDrafts = (data: string, userId: string) => {
  return getDraftManager()?.importDrafts(data, userId)
}
