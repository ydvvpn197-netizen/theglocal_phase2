import { z } from 'zod'

export const createArtistSchema = z
  .object({
    stage_name: z
      .string()
      .min(1, 'Stage name is required')
      .max(100, 'Stage name must be 100 characters or less'),
    service_category: z.string().min(1, 'Service category is required').max(200),
    description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
    genres: z.array(z.string()).optional(),
    social_links: z.record(z.string(), z.string()).optional(),
    location_city: z.string().max(100, 'City name must be 100 characters or less').optional(),
    location_coordinates: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      })
      .optional(),
    rate_min: z.number().min(0, 'Minimum rate must be 0 or greater').optional(),
    rate_max: z.number().min(0, 'Maximum rate must be 0 or greater').optional(),
    portfolio_images: z
      .array(z.string().url())
      .max(10, 'Maximum 10 portfolio images allowed')
      .optional(),
  })
  .refine(
    (data) => {
      if (data.rate_min !== undefined && data.rate_max !== undefined) {
        return data.rate_max >= data.rate_min
      }
      return true
    },
    {
      message: 'Maximum rate must be greater than or equal to minimum rate',
      path: ['rate_max'],
    }
  )
  .refine(
    (data) => {
      const hasCity = data.location_city && data.location_city.trim().length > 0
      const hasCoordinates = data.location_coordinates !== undefined

      return hasCity || hasCoordinates
    },
    {
      message: 'Either city or current location must be provided',
      path: ['location_city'],
    }
  )
