# Console.log & API Error Handling Migration Progress

**Started:** November 14, 2025  
**Status:** IN PROGRESS  
**Completion:** ~2% (2 of ~180 API routes migrated)

---

## 🎯 Goals

1. **Replace 800+ console.log statements** with structured logging
2. **Add try-catch to 177 API routes** with standardized error handling
3. **Implement consistent error responses** across all endpoints
4. **Add comprehensive logging** for debugging and monitoring

---

## ✅ Infrastructure Complete

### Logger Utilities

- ✅ `lib/utils/logger.ts` - Main logger with multiple log levels
- ✅ `lib/utils/logger-context.ts` - Context-aware loggers (API, DB, Auth, Jobs)
- ✅ `lib/utils/api-error-handler.ts` - Standardized API error handling

### Features

- ✅ Environment-aware logging (verbose in dev, structured in prod)
- ✅ Ready for Better Stack / LogTail integration
- ✅ Consistent error response format
- ✅ Automatic error logging with context
- ✅ Type-safe error classes

---

## 📝 Migration Pattern

### Before (Old Pattern)

```typescript
export async function GET(request: NextRequest) {
  try {
    // ... logic
    const { data, error } = await supabase.from('posts').select('*')
    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    )
  }
}
```

### After (New Pattern)

```typescript
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-error-handler'

export async function GET(request: NextRequest) {
  const logger = createAPILogger('GET', '/api/posts')

  try {
    logger.info('Fetching posts', { ...context })

    // ... logic
    const { data, error } = await supabase.from('posts').select('*')
    if (error) throw error

    logger.info('Posts fetched successfully', { count: data.length })

    return createSuccessResponse(data, { count: data.length })
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/posts',
    })
  }
}
```

### Key Changes

1. ✅ Import logger utilities
2. ✅ Create logger with context
3. ✅ Log start of operation with context
4. ✅ Use `APIErrors` for validation errors
5. ✅ Log successful completion
6. ✅ Use `createSuccessResponse` for consistency
7. ✅ Use `handleAPIError` for error handling
8. ✅ Remove console.error/log statements

---

## ✅ Completed Routes (2/177)

### High-Traffic Routes

1. ✅ `app/api/posts/route.ts` - GET & POST (list & create posts)
2. ✅ `app/api/feed/route.ts` - GET (personalized feed)

**Impact:** These routes handle ~60% of API traffic

---

## 📊 Remaining Work

### Priority 1: Critical Routes (15 routes) - ~6 hours

**Handles authentication, core CRUD operations**

- [ ] `app/api/auth/**` (5 routes)
  - [ ] `auth/signin/route.ts`
  - [ ] `auth/signup/route.ts`
  - [ ] `auth/signout/route.ts`
  - [ ] `auth/callback/route.ts`
  - [ ] `auth/reset-password/route.ts`

- [ ] `app/api/posts/**` (8 routes)
  - [x] `posts/route.ts` - ✅ DONE
  - [ ] `posts/[id]/route.ts` - GET, PUT, DELETE
  - [ ] `posts/[id]/vote/route.ts`
  - [ ] `posts/[id]/comments/route.ts`
  - [ ] `posts/[id]/comments/enhanced/route.ts`

- [ ] `app/api/users/**` (2 routes)
  - [ ] `users/[id]/route.ts`
  - [ ] `users/[id]/profile/route.ts`

### Priority 2: Community & Social (30 routes) - ~10 hours

- [ ] `app/api/communities/**` (~12 routes)
- [ ] `app/api/comments/**` (~8 routes)
- [ ] `app/api/notifications/**` (~5 routes)
- [ ] `app/api/messages/**` (~5 routes)

### Priority 3: Artists & Events (25 routes) - ~8 hours

- [ ] `app/api/artists/**` (~12 routes)
- [ ] `app/api/events/**` (~13 routes)

### Priority 4: Polls & Moderation (20 routes) - ~6 hours

- [ ] `app/api/polls/**` (~10 routes)
- [ ] `app/api/moderation/**` (~5 routes)
- [ ] `app/api/reports/**` (~5 routes)

### Priority 5: Analytics & Admin (30 routes) - ~8 hours

- [ ] `app/api/analytics/**` (~10 routes)
- [ ] `app/api/admin/**` (~8 routes)
- [ ] `app/api/stats/**` (~5 routes)
- [ ] `app/api/profile/**` (~7 routes)

### Priority 6: Integrations & Jobs (50 routes) - ~12 hours

- [ ] `app/api/v2/**` (~20 routes)
- [ ] `app/api/jobs/**` (~10 routes)
- [ ] `app/api/cron/**` (~5 routes)
- [ ] `app/api/eventbrite/**` (~3 routes)
- [ ] `app/api/meetup/**` (~3 routes)
- [ ] `app/api/bookings/**` (~9 routes)

**Total Remaining:** ~175 routes, ~50 hours

---

## 🔧 Migration Tools

### Find Routes to Migrate

```bash
# List all API route files
find app/api -name "route.ts" | sort

# Find routes with console.log/error
grep -r "console\.\(log\|error\|warn\)" app/api --include="*.ts" | cut -d: -f1 | sort -u

# Count remaining migrations
grep -r "console\.\(log\|error\|warn\)" app/api --include="*.ts" | wc -l
```

### Test Migrated Route

```bash
# Start dev server
npm run dev

# Test endpoint
curl http://localhost:3000/api/posts
curl -X POST http://localhost:3000/api/posts -H "Content-Type: application/json" -d '{"community_id":"123","title":"Test"}'
```

---

## 📈 Progress Tracking

### Week 1 Goals

- [x] Create logger infrastructure
- [x] Create API error handler
- [x] Migrate 2 sample routes
- [ ] Migrate auth routes (5 routes)
- [ ] Migrate remaining posts routes (8 routes)
- [ ] Migrate users routes (2 routes)

**Target:** 15 routes total by end of week

### Week 2 Goals

- [ ] Communities (12 routes)
- [ ] Comments (8 routes)
- [ ] Notifications (5 routes)
- [ ] Messages (5 routes)

**Target:** 30 additional routes

### Week 3-4 Goals

- [ ] Artists & Events (25 routes)
- [ ] Polls & Moderation (20 routes)
- [ ] Analytics & Admin (30 routes)

**Target:** 75 additional routes

### Week 5-6 Goals

- [ ] Integrations & Jobs (50 routes)
- [ ] Final cleanup
- [ ] Testing

**Target:** Complete all 177 routes

---

## 🎯 Success Metrics

### Logging

- [ ] 0 console.log in production code
- [ ] All API routes use structured logger
- [ ] All errors logged with context
- [ ] Better Stack / LogTail integration active

### Error Handling

- [ ] 177/177 routes have try-catch
- [ ] All routes use `handleAPIError`
- [ ] Consistent error response format
- [ ] Validation errors use `APIErrors`

### Code Quality

- [ ] All routes have JSDoc comments
- [ ] All routes log start/success/error
- [ ] User context tracked in all logs
- [ ] No generic error messages

---

## 💡 Tips for Migration

### 1. Start with Structure

```typescript
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-error-handler'

export async function GET(request: NextRequest) {
  const logger = createAPILogger('GET', '/api/your-route')

  try {
    // Existing code...
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/your-route' })
  }
}
```

### 2. Add Logging

```typescript
// At start
logger.info('Operation starting', { key: 'value' })

// Before database calls
logger.info('Querying database', { table: 'posts', filters: {...} })

// On success
logger.info('Operation successful', { postId: result.id })
```

### 3. Replace Error Handling

```typescript
// Replace manual errors with APIErrors
if (!userId) {
  throw APIErrors.unauthorized()
}

if (!item) {
  throw APIErrors.notFound('Post')
}

if (validation.error) {
  throw APIErrors.badRequest(validation.error.message)
}
```

### 4. Replace Response Format

```typescript
// Replace manual success responses
return NextResponse.json({ success: true, data: result })
// With:
return createSuccessResponse(result, { optional: 'metadata' })
```

---

## 📞 Need Help?

### Common Issues

**Q: Import errors?**  
A: Make sure logger utilities are in `lib/utils/`

**Q: Type errors?**  
A: Run `npm run type-check` to see all issues

**Q: How to log database queries?**  
A: Use `createDBLogger('insert', 'posts')`

**Q: How to add user context?**  
A: Include `userId: user?.id` in log metadata

### Resources

- Logger utility: `lib/utils/logger.ts`
- API error handler: `lib/utils/api-error-handler.ts`
- Context loggers: `lib/utils/logger-context.ts`
- Examples: `app/api/posts/route.ts`, `app/api/feed/route.ts`

---

**Last Updated:** November 14, 2025  
**Next Review:** November 21, 2025
