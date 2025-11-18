import { logger } from '@/lib/utils/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

interface MediaItem {
  id?: string
  url?: string
}

/**
 * Clean up orphaned media files from storage when post creation fails.
 * The logic mirrors the previous in-route implementation but lives in a reusable module.
 */
export async function cleanupOrphanedMedia(
  mediaItems: MediaItem[] = [],
  supabase: SupabaseClient
): Promise<void> {
  try {
    for (const item of mediaItems) {
      if (!item?.url) continue

      try {
        const url = new URL(item.url)
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/)

        if (!pathMatch || !pathMatch[1] || !pathMatch[2]) {
          continue
        }

        const bucket = pathMatch[1]
        const filePath = pathMatch[2]

        const { error: deleteError } = await supabase.storage.from(bucket).remove([filePath])

        if (deleteError) {
          logger.warn(`Failed to delete orphaned media file ${filePath}:`, deleteError)
        }

        // Attempt to remove common variant suffixes as best effort
        const basePath = filePath.substring(0, filePath.lastIndexOf('.'))
        const variantSuffixes = ['_large', '_medium', '_thumbnail', '_webp']

        for (const suffix of variantSuffixes) {
          const variantPaths = [
            `${basePath}${suffix}.jpg`,
            `${basePath}${suffix}.webp`,
            `${basePath}${suffix}.png`,
          ]

          for (const variantPath of variantPaths) {
            await supabase.storage.from(bucket).remove([variantPath])
          }
        }
      } catch (error) {
        logger.warn(`Error cleaning up media item ${item.id}:`, error)
      }
    }
  } catch (error) {
    logger.error('Error during orphaned media cleanup:', error)
  }
}
