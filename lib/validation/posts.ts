import { z } from 'zod'
import { CONTENT_LIMITS } from '@/lib/utils/constants'

export const createPostSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(200, 'Title must be 200 characters or less'),
    body: z
      .string()
      .trim()
      .max(5000, 'Body must be 5000 characters or less')
      .optional()
      .or(z.literal('')),
    external_url: z.string().url('Invalid URL format').optional().or(z.literal('')),
    location_city: z.string().optional(),
    community_id: z.string().uuid('Invalid community ID'),
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
      .max(CONTENT_LIMITS.POST_MEDIA_MAX, 'Maximum 10 media items allowed')
      .optional(),
  })
  .refine((data) => data.title.trim().length > 0, {
    message: 'Title is required',
    path: ['title'],
  })
