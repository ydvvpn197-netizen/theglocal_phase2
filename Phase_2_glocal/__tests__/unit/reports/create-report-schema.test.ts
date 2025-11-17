import { createReportSchema } from '@/lib/validation/reports'
import { REPORT_REASONS } from '@/lib/utils/constants'
import { ZodError } from 'zod'

describe('createReportSchema', () => {
  // Use valid UUID v4 format for tests
  const validUUID = '550e8400-e29b-41d4-a716-446655440000'
  const basePayload = {
    type: 'post' as const,
    target_id: validUUID,
    reason: REPORT_REASONS[0],
    content_type: 'post' as const,
    content_id: validUUID,
  }

  it('accepts valid report data', () => {
    expect(() => createReportSchema.parse(basePayload)).not.toThrow()
  })

  it('accepts poll content type reports', () => {
    const payload = {
      ...basePayload,
      type: 'poll' as const,
      content_type: 'poll' as const,
    }

    expect(() => createReportSchema.parse(payload)).not.toThrow()
  })

  it('accepts artist reports', () => {
    const payload = {
      ...basePayload,
      type: 'artist' as const,
      content_type: 'artist' as const,
    }

    expect(() => createReportSchema.parse(payload)).not.toThrow()
  })

  it('accepts event reports', () => {
    const payload = {
      ...basePayload,
      type: 'event' as const,
      content_type: 'event' as const,
    }

    expect(() => createReportSchema.parse(payload)).not.toThrow()
  })

  it('rejects invalid reasons', () => {
    expect(() =>
      createReportSchema.parse({
        ...basePayload,
        reason: 'invalid_reason',
      })
    ).toThrow(ZodError)
  })

  it('rejects non-uuid content ids', () => {
    expect(() =>
      createReportSchema.parse({
        ...basePayload,
        content_id: 'not-a-uuid',
      })
    ).toThrow(ZodError)
  })
})
