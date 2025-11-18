import { NextRequest, NextResponse } from 'next/server'
import { getJobStatus } from '@/lib/utils/background-jobs'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/jobs/[id] - Get job status
export const GET = withRateLimit(async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createAPILogger('GET', '/api/jobs/[id]')
  try {
    const { id: jobId } = await params

    if (!jobId) {
      throw APIErrors.badRequest('Job ID is required')
    }

    const job = getJobStatus(jobId)

    if (!job) {
      throw APIErrors.notFound('Job')
    }

    // Return job status without sensitive data
    return createSuccessResponse({
      id: job.id,
      type: job.type,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      retries: job.retries,
      maxRetries: job.maxRetries,
      error: job.error,
      result: job.result,
    })
  } catch (error) {
    const { id: errorJobId } = await params
    return handleAPIError(error, {
      method: 'GET',
      path: `/api/jobs/${errorJobId}`,
    })
  }
})
