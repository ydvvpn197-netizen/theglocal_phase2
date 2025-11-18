/**
 * API Documentation Endpoint
 *
 * Returns OpenAPI specification in JSON format.
 * Used by Swagger UI to generate interactive documentation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { swaggerDefinition } from '@/lib/openapi/config'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * @swagger
 * /api/docs:
 *   get:
 *     summary: Get OpenAPI specification
 *     description: Returns the complete OpenAPI spec for the API
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: OpenAPI specification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  try {
    const logger = createAPILogger('GET', '/api/docs')
    return NextResponse.json(swaggerDefinition)
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/docs',
    })
  }
})
