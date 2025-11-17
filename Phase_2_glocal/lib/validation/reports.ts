import { z } from 'zod'
import { REPORT_REASONS } from '@/lib/utils/constants'

const REPORTABLE_CONTENT_TYPES = [
  'post',
  'comment',
  'poll',
  'message',
  'user',
  'community',
  'artist',
  'event',
] as const

export const createReportSchema = z.object({
  type: z.enum(REPORTABLE_CONTENT_TYPES),
  target_id: z.string().uuid(),
  reason: z.enum(REPORT_REASONS),
  description: z.string().max(1000).optional(),
  content_type: z.enum(REPORTABLE_CONTENT_TYPES).optional(),
  content_id: z.string().uuid().optional(),
  additional_context: z.string().max(1000).optional(),
})
