import { NextRequest } from 'next/server'
import { requireAdminOrThrow } from '@/lib/utils/require-admin'
import { getAllJobs } from '@/lib/utils/background-jobs'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/admin/jobs - Get all jobs for debugging (admin only)
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdminOrThrow()

    const jobs = getAllJobs()

    // Group jobs by status for better overview
    const jobStats = {
      pending: jobs.filter((j) => j.status === 'pending').length,
      processing: jobs.filter((j) => j.status === 'processing').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
      total: jobs.length,
    }

    return createSuccessResponse({
      stats: jobStats,
      jobs: jobs.map((job) => ({
        id: job.id,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        retries: job.retries,
        maxRetries: job.maxRetries,
        error: job.error,
        // Don't include full data/result for privacy
      })),
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/admin/jobs',
    })
  }
})
