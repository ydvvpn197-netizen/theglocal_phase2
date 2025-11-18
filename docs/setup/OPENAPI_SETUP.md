# OpenAPI/Swagger Setup Guide

## Overview

OpenAPI infrastructure is now configured for Theglocal! This provides interactive API documentation and testing.

## ✅ What's Been Setup

**Configuration:**

- ✅ `lib/openapi/config.ts` - OpenAPI specification and schemas
- ✅ `app/api/docs/route.ts` - API endpoint returning spec
- ✅ `app/api/docs/page.tsx` - Documentation viewer page

**Features:**

- ✅ OpenAPI 3.0 specification
- ✅ Common schemas (Error, Success, Post)
- ✅ Security schemes (Bearer auth)
- ✅ Response templates
- ✅ Tag categorization

## 🚀 Installation

```bash
# Install dependencies for full Swagger UI
npm install swagger-ui-react swagger-jsdoc
npm install --save-dev @types/swagger-ui-react @types/swagger-jsdoc
```

## 📝 Accessing Documentation

### Basic View (Available Now)

```
http://localhost:3000/api/docs
```

Shows the OpenAPI spec and setup instructions.

### Full Swagger UI (After Installation)

Will provide interactive API testing with:

- Try it out buttons
- Request/response examples
- Authentication handling
- Schema validation

## 📖 Documenting API Routes

### JSDoc Pattern for Routes

```typescript
/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: List all posts
 *     description: Fetches posts with optional filtering by community
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: community_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by community ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of posts to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: List of posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   post:
 *     summary: Create a new post
 *     description: Creates a post in a community (requires authentication)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - community_id
 *               - title
 *             properties:
 *               community_id:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *               body:
 *                 type: string
 *               image_url:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Post'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *       400:
 *         description: Bad request
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
export async function GET(request: NextRequest) {
  // Implementation
}

export async function POST(request: NextRequest) {
  // Implementation
}
```

## 📋 Documentation Priority

### Phase 1: Critical Routes (15 routes) - 6 hours

1. [ ] `POST /api/auth/signin` - Authentication
2. [ ] `POST /api/auth/signup` - Registration
3. [ ] `GET /api/posts` - List posts
4. [ ] `POST /api/posts` - Create post
5. [ ] `GET /api/posts/{id}` - Get post
6. [ ] `PATCH /api/posts/{id}` - Update post
7. [ ] `DELETE /api/posts/{id}` - Delete post
8. [ ] `GET /api/feed` - User feed
9. [ ] `GET /api/users/{id}` - Get user
10. [ ] `POST /api/posts/{id}/comments` - Add comment
11. [ ] `POST /api/posts/{id}/vote` - Vote on post
12. [ ] `GET /api/communities` - List communities
13. [ ] `POST /api/communities` - Create community
14. [ ] `GET /api/communities/{id}` - Get community
15. [ ] `POST /api/upload` - Upload media

### Phase 2: Important Routes (30 routes) - 8 hours

- Communities CRUD (10 routes)
- Comments & replies (8 routes)
- Artists (7 routes)
- Events (5 routes)

### Phase 3: Remaining Routes (130 routes) - 20 hours

- Polls, moderation, analytics, admin, etc.

## 🎨 Adding Custom Schemas

Add to `lib/openapi/config.ts`:

```typescript
components: {
  schemas: {
    YourSchema: {
      type: 'object',
      required: ['id', 'name'],
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
        },
        name: {
          type: 'string',
        },
        created_at: {
          type: 'string',
          format: 'date-time',
        },
      },
    },
  },
}
```

## 🔒 Security Documentation

Document authentication:

```typescript
security: [
  {
    bearerAuth: [], // Requires JWT token
  },
]
```

## 📦 Add to Scripts

Update `package.json`:

```json
{
  "scripts": {
    "docs:validate": "swagger-cli validate lib/openapi/config.ts",
    "docs:generate": "openapi-generator-cli generate -i lib/openapi/config.ts -g typescript-axios -o lib/generated/api-client"
  }
}
```

## 🚀 Next Steps

1. ✅ Configuration files created
2. ✅ Basic viewer page created
3. [ ] Install Swagger UI: `npm install swagger-ui-react swagger-jsdoc`
4. [ ] Document critical routes (15 routes)
5. [ ] Document important routes (30 routes)
6. [ ] Document remaining routes (130 routes)
7. [ ] Add to CI/CD for validation
8. [ ] Generate TypeScript client (optional)

## 🔥 Quick Documentation Template

```typescript
/**
 * @swagger
 * /api/your-route:
 *   get:
 *     summary: Brief description
 *     description: Detailed description
 *     tags: [Category]
 *     parameters:
 *       - in: query
 *         name: param_name
 *         schema:
 *           type: string
 *         description: Parameter description
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
```

## 🎯 Benefits

**For Developers:**

- Self-documenting API
- Interactive testing
- Type-safe client generation
- Standardized structure

**For Team:**

- Onboarding new developers
- API contract testing
- Frontend/backend alignment
- External API consumers

## 📚 Resources

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc)

---

**Status:** Infrastructure ready, installation required  
**Time to Complete:** ~35 hours for full documentation  
**Priority:** Medium (improves API usability)
