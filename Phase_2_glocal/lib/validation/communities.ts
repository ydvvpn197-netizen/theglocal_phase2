import { z } from 'zod'

export const createCommunitySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  is_private: z.boolean().optional().default(false),
  location: z.string().optional(),
  location_city: z.string().min(1).max(100),
  rules: z.string().max(1000).optional(),
})
