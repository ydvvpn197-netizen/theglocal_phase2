# Remaining Work - Action Plan

**Date:** November 14, 2025  
**Status:** 20/25 completed (80%)  
**Remaining:** 5 items (3 massive, 2 medium)

---

## 📋 Quick Overview

| Item                       | Priority  | Effort | Status  | Has Guide      |
| -------------------------- | --------- | ------ | ------- | -------------- |
| Remove console.logs (800+) | 🔴 HIGH   | 10-15h | PENDING | ✅ Yes         |
| Add API try-catch (177)    | 🔴 HIGH   | 8-12h  | PENDING | ⚠️ Needs guide |
| Create OpenAPI docs (177)  | 🟡 MEDIUM | 12-16h | PENDING | ⚠️ Needs guide |
| Setup Storybook            | 🟡 MEDIUM | 6-8h   | PENDING | ⚠️ Needs guide |
| Implement animation fixes  | 🔴 HIGH   | 4-6h   | PENDING | ✅ Yes         |

**Total Estimated Effort:** 40-57 hours

---

## 🎯 Prioritized Execution Plan

### Phase 1: Quick Wins (Week 1) - 4-6 hours

#### 1. Implement Animation Performance Fixes

**Priority:** 🔴 HIGH  
**Effort:** 4-6 hours  
**Impact:** HIGH (all users)  
**Guide:** ✅ `docs/ANIMATION_PERFORMANCE_AUDIT.md`

**Steps:**

1. Open Chrome DevTools → Performance tab
2. Record interactions with animated elements
3. Identify animations causing frame drops
4. Fix using patterns from audit guide
5. Re-test with CPU throttling

**Common Issues to Look For:**

- [ ] Modal animations using `width`/`height` → Switch to `transform: scale()`
- [ ] Hover effects with `box-shadow` → Use pseudo-elements
- [ ] Parallax with unbounded scroll events → Throttle with RAF
- [ ] List animations without `will-change`

**Quick Wins:**

```bash
# Run performance audit
1. npm run dev
2. Open localhost:3000
3. F12 → Performance → Record
4. Interact with modals, lists, hovers
5. Stop → Review flame chart
```

---

### Phase 2: Structured Logging Migration (Weeks 1-2) - 10-15 hours

#### 2. Remove/Replace 800+ console.log Statements

**Priority:** 🔴 HIGH  
**Effort:** 10-15 hours  
**Impact:** HIGH (production debugging)  
**Guide:** ✅ `docs/STRUCTURED_LOGGING_SETUP.md`

**Incremental Approach:**

##### Week 1: Setup & Critical Paths (3-4 hours)

```bash
# 1. Setup Better Stack account
https://betterstack.com/logtail → Sign up → Get token

# 2. Install dependencies
npm install @logtail/node @logtail/winston winston
npm install --save-dev @types/winston

# 3. Create logger utility (already documented in guide)
# Copy from docs/STRUCTURED_LOGGING_SETUP.md

# 4. Add environment variable
echo "LOGTAIL_SOURCE_TOKEN=your_token_here" >> .env.local

# 5. Priority 1: Critical paths
# - API routes (authentication, payments, core CRUD)
# - Database operations
# - Error handlers
```

**Files to Migrate First (Priority Order):**

1. `app/api/auth/**` - Authentication (30-40 logs)
2. `app/api/posts/**` - Core feature (80-100 logs)
3. `app/api/users/**` - User management (40-50 logs)
4. `lib/supabase/**` - Database layer (60-80 logs)
5. `lib/utils/error-handler.ts` - Already documented! ✅
6. Remaining API routes (400-500 logs)
7. Components (100-200 logs - least critical)

##### Week 2: Bulk Migration (7-11 hours)

```bash
# Generate migration list
bash scripts/migrate-console-logs.sh

# Systematic replacement
# Use search/replace in VS Code:
# Find: console\.log\((.*?)\)
# Replace: log.info($1)

# Then add metadata manually
```

**Migration Pattern:**

```typescript
// Before
console.log('User created:', userId)

// After
import { log } from '@/lib/utils/logger'
log.info('User created', { userId, timestamp: Date.now() })
```

---

### Phase 3: API Error Handling (Week 3) - 8-12 hours

#### 3. Add try-catch to 177 API Routes

**Priority:** 🔴 HIGH  
**Effort:** 8-12 hours  
**Impact:** HIGH (prevents crashes, better errors)  
**Guide:** ⚠️ NEEDS CREATION

**Action: Create Guide First**

```markdown
# docs/API_ERROR_HANDLING.md

## Standard API Response Format

### Success Response

{
"success": true,
"data": { ... }
}

### Error Response

{
"success": false,
"error": {
"message": "User-friendly error message",
"code": "ERROR_CODE",
"statusCode": 400
}
}

## Standard Error Handler

// lib/utils/api-error-handler.ts
import { NextResponse } from 'next/server'
import { log } from './logger'

export class APIError extends Error {
constructor(
message: string,
public statusCode: number = 500,
public code: string = 'INTERNAL_ERROR'
) {
super(message)
this.name = 'APIError'
}
}

export function handleAPIError(
error: unknown,
context: { method: string; path: string; userId?: string }
): NextResponse {
if (error instanceof APIError) {
log.warn('API error', { ...context, error: error.message, code: error.code })
return NextResponse.json(
{
success: false,
error: {
message: error.message,
code: error.code,
statusCode: error.statusCode,
},
},
{ status: error.statusCode }
)
}

// Unexpected error
log.error('Unhandled API error', error as Error, context)
return NextResponse.json(
{
success: false,
error: {
message: 'Internal server error',
code: 'INTERNAL_ERROR',
statusCode: 500,
},
},
{ status: 500 }
)
}

## Usage Pattern

export async function GET(request: NextRequest) {
const context = { method: 'GET', path: '/api/posts' }

try {
// Validate
if (!userId) {
throw new APIError('Authentication required', 401, 'UNAUTHORIZED')
}

    // Business logic
    const posts = await fetchPosts(userId)

    // Success
    return NextResponse.json({ success: true, data: posts })

} catch (error) {
return handleAPIError(error, context)
}
}
```

**Migration Steps:**

1. Create `lib/utils/api-error-handler.ts`
2. Update 10 API routes per day
3. Test each route after migration
4. Run integration tests

**Routes by Priority:**

1. Auth routes (5 routes) - Day 1
2. Posts CRUD (15 routes) - Days 2-3
3. Comments (10 routes) - Day 4
4. Users (12 routes) - Day 5
5. Communities (20 routes) - Days 6-7
6. Artists (15 routes) - Days 8-9
7. Events (20 routes) - Days 10-11
8. Remaining (80 routes) - Days 12-18

---

### Phase 4: Component Documentation (Week 4) - 6-8 hours

#### 4. Setup Storybook

**Priority:** 🟡 MEDIUM  
**Effort:** 6-8 hours  
**Impact:** MEDIUM (developer experience)  
**Guide:** ⚠️ NEEDS CREATION

**Steps:**

##### Day 1: Setup (2 hours)

```bash
# Install Storybook
npx storybook@latest init

# Configure for Next.js 15
# Follow prompts, select Next.js
```

##### Day 2: Configure TailwindCSS (1 hour)

```typescript
// .storybook/preview.ts
import '../app/globals.css'

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}
```

##### Days 3-4: Document Components (3-5 hours)

Start with shadcn/ui components (already built, just need stories):

```typescript
// components/ui/button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    children: 'Button',
    variant: 'default',
  },
}

export const Secondary: Story = {
  args: {
    children: 'Button',
    variant: 'secondary',
  },
}

export const Destructive: Story = {
  args: {
    children: 'Delete',
    variant: 'destructive',
  },
}
```

**Components to Document (Priority):**

1. Button, Input, Label, Textarea (Day 1)
2. Card, Dialog, DropdownMenu (Day 2)
3. Avatar, Badge, Separator (Day 3)
4. Custom components: PostCard, CommentThread, etc. (Day 4)

---

### Phase 5: API Documentation (Weeks 5-7) - 12-16 hours

#### 5. Create OpenAPI/Swagger Documentation

**Priority:** 🟡 MEDIUM  
**Effort:** 12-16 hours  
**Impact:** MEDIUM (team collaboration)  
**Guide:** ⚠️ NEEDS CREATION

**Steps:**

##### Week 1: Setup & Structure (2-3 hours)

```bash
npm install swagger-jsdoc swagger-ui-react
npm install --save-dev @types/swagger-jsdoc @types/swagger-ui-react
```

```typescript
// lib/openapi/config.ts
import swaggerJsdoc from 'swagger-jsdoc'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Theglocal API',
      version: '1.0.0',
      description: 'Privacy-first local community platform API',
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
      },
    },
  },
  apis: ['./app/api/**/*.ts'],
}

export const swaggerSpec = swaggerJsdoc(options)
```

##### Week 2-3: Document Routes (10-13 hours)

Document ~10 routes per day:

```typescript
/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Get all posts
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of posts to return
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
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 */
export async function GET(request: NextRequest) {
  // ...
}
```

**Route Groups:**

1. Auth (5 routes) - Day 1
2. Posts (15 routes) - Days 2-3
3. Users (12 routes) - Day 4
4. Comments (10 routes) - Day 5
5. Communities (20 routes) - Days 6-7
6. Artists (15 routes) - Days 8-9
7. Events (20 routes) - Days 10-11
8. Remaining (80 routes) - Days 12-17

##### UI Page

```typescript
// app/api/docs/page.tsx
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'
import { swaggerSpec } from '@/lib/openapi/config'

export default function APIDocsPage() {
  return <SwaggerUI spec={swaggerSpec} />
}
```

---

## 📊 Weekly Schedule

### Week 1 (14-20 hours)

- [ ] **Mon-Tue:** Animation performance audit & fixes (4-6h)
- [ ] **Wed:** Setup structured logging (3-4h)
- [ ] **Thu-Fri:** Migrate critical console.logs (API routes, auth, database) (7-10h)

### Week 2 (12-15 hours)

- [ ] **Mon-Tue:** Complete console.log migration (7-11h)
- [ ] **Wed-Fri:** Start API error handling (5-8 routes/day) (5-7h)

### Week 3 (12-15 hours)

- [ ] **Mon-Wed:** Complete API error handling (12h)
- [ ] **Thu-Fri:** Start Storybook setup (3h)

### Week 4 (10-12 hours)

- [ ] **Mon-Wed:** Complete Storybook component docs (7-9h)
- [ ] **Thu-Fri:** Start OpenAPI setup (3h)

### Weeks 5-7 (12-16 hours)

- [ ] Document all 177 API routes with OpenAPI

---

## ✅ Completion Criteria

### Console Logs Migration

- [ ] Better Stack / LogTail account created
- [ ] Logger utility implemented
- [ ] All API routes migrated
- [ ] All database operations migrated
- [ ] Critical components migrated
- [ ] Dashboards configured
- [ ] Alerts set up

### API Error Handling

- [ ] Error handler utility created
- [ ] All 177 routes have try-catch
- [ ] Standardized error responses
- [ ] Logging integrated
- [ ] Integration tests passing

### Storybook

- [ ] Storybook installed & configured
- [ ] All shadcn/ui components documented
- [ ] Key custom components documented
- [ ] Accessible at /storybook
- [ ] Auto-generated docs enabled

### OpenAPI

- [ ] Swagger configured
- [ ] All 177 routes documented
- [ ] Schemas defined
- [ ] UI accessible at /api/docs
- [ ] CI validation added

### Animations

- [ ] Performance audit completed
- [ ] Identified issues fixed
- [ ] Tested with CPU throttling
- [ ] Lighthouse score >90

---

## 🔧 Tools & Scripts

### Find Console Logs

```bash
# Count console.logs
grep -r "console\\.log" app/ lib/ components/ --include="*.ts" --include="*.tsx" | wc -l

# List all console.logs with file locations
grep -rn "console\\.log" app/ lib/ components/ --include="*.ts" --include="*.tsx" > console-logs.txt

# Find by priority
grep -rn "console\\.log" app/api/auth/ --include="*.ts" --include="*.tsx"
```

### Find API Routes without try-catch

```bash
# Find all API route handlers
find app/api -name "route.ts" -o -name "route.tsx"

# Count routes
find app/api -name "route.ts" -o -name "route.tsx" | wc -l

# Check if route has try-catch
for file in $(find app/api -name "route.ts"); do
  if ! grep -q "try" "$file"; then
    echo "Missing try-catch: $file"
  fi
done
```

---

## 💰 Cost Estimates

### Better Stack (Logging)

- **Free tier:** 1GB/month
- **Estimated usage:** 2-3GB/month (with all logs)
- **Cost:** $10-25/month

### Time Investment

- **Week 1-2:** 26-35 hours (animations + logging)
- **Week 3-4:** 22-27 hours (error handling + Storybook)
- **Weeks 5-7:** 12-16 hours (OpenAPI)
- **Total:** 60-78 hours over 7 weeks
- **Pace:** ~10-12 hours/week

---

## 🎯 Success Metrics

After completing all items:

### Observability

- ✅ 0 console.logs in production
- ✅ All errors logged to Better Stack
- ✅ Real-time error alerts configured
- ✅ 177 API routes with proper error handling

### Documentation

- ✅ 177 API routes documented in OpenAPI
- ✅ All UI components in Storybook
- ✅ Interactive API docs at /api/docs
- ✅ Component playground at /storybook

### Performance

- ✅ All animations 60fps on mid-range devices
- ✅ Lighthouse performance >90
- ✅ 0 layout thrashing issues

---

## 📞 Support

**Questions or blockers?** Refer to these guides:

- Logging: `docs/STRUCTURED_LOGGING_SETUP.md`
- Animations: `docs/ANIMATION_PERFORMANCE_AUDIT.md`
- General: `FINAL_AUDIT_SUMMARY.md`

---

**Last Updated:** November 14, 2025  
**Status:** Ready for execution  
**Next Review:** Weekly progress check
