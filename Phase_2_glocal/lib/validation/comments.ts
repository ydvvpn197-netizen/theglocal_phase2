import { z } from 'zod'

export const createCommentSchema = z
  .object({
    text: z.string().max(500, 'Comment must be 500 characters or less').optional().default(''),
    parent_id: z.string().uuid().nullable().optional(),
    media_items: z
      .array(
        z.object({
          id: z.string(),
          url: z.string().url(),
          mediaType: z.enum(['image', 'video', 'gif']),
          variants: z.record(z.string(), z.unknown()).optional(),
          duration: z.number().optional(),
          thumbnailUrl: z.string().url().optional(),
          fileSize: z.number().optional(),
          mimeType: z.string().optional(),
          altText: z.string().optional(),
        })
      )
      .max(5, 'Maximum 5 media items allowed')
      .optional()
      .default([]),
    post_id: z.string().uuid().optional(),
  })
  .refine(
    (data) => {
      const hasText = data.text && typeof data.text === 'string' && data.text.trim().length > 0
      const hasMedia =
        data.media_items && Array.isArray(data.media_items) && data.media_items.length > 0
      return hasText || hasMedia
    },
    {
      message: 'Comment must contain text or at least one media item',
      path: ['text'],
    }
  )
