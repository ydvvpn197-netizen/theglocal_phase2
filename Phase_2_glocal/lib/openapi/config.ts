/**
 * OpenAPI/Swagger Configuration
 *
 * Provides API documentation using OpenAPI 3.0 specification.
 * Documentation is generated from JSDoc comments in API routes.
 */

export const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Theglocal API',
    version: '1.0.0',
    description: 'Privacy-first local community platform API documentation',
    contact: {
      name: 'API Support',
      url: 'https://theglocal.in',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'https://theglocal.in',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabase JWT token from auth.getSession()',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Resource not found',
              },
              code: {
                type: 'string',
                example: 'NOT_FOUND',
              },
              statusCode: {
                type: 'integer',
                example: 404,
              },
            },
          },
        },
      },
      Success: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
            description: 'Response data (varies by endpoint)',
          },
          meta: {
            type: 'object',
            description: 'Optional metadata',
          },
        },
      },
      Post: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          community_id: {
            type: 'string',
            format: 'uuid',
          },
          author_id: {
            type: 'string',
            format: 'uuid',
          },
          title: {
            type: 'string',
            example: 'Local Event This Weekend',
          },
          body: {
            type: 'string',
            example: 'Join us for a community gathering...',
          },
          image_url: {
            type: 'string',
            nullable: true,
            example: 'https://example.com/image.jpg',
          },
          upvotes: {
            type: 'integer',
            example: 42,
          },
          downvotes: {
            type: 'integer',
            example: 5,
          },
          is_deleted: {
            type: 'boolean',
            example: false,
          },
          is_edited: {
            type: 'boolean',
            example: false,
          },
          created_at: {
            type: 'string',
            format: 'date-time',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: {
                message: 'Authentication required',
                code: 'UNAUTHORIZED',
                statusCode: 401,
              },
            },
          },
        },
      },
      ForbiddenError: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: {
                message: 'You do not have permission to perform this action',
                code: 'FORBIDDEN',
                statusCode: 403,
              },
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: {
                message: 'Post not found',
                code: 'NOT_FOUND',
                statusCode: 404,
              },
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Posts',
      description: 'Community posts and content',
    },
    {
      name: 'Users',
      description: 'User profiles and authentication',
    },
    {
      name: 'Communities',
      description: 'Community management',
    },
    {
      name: 'Comments',
      description: 'Post comments and discussions',
    },
    {
      name: 'Artists',
      description: 'Artist profiles and content',
    },
    {
      name: 'Events',
      description: 'Event listings and management',
    },
  ],
}

/**
 * Options for swagger-jsdoc
 */
export const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [
    './app/api/**/*.ts', // API routes
    './lib/types/**/*.ts', // Type definitions
  ],
}
