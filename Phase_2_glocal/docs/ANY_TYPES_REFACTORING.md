# Any Types Refactoring Guide

## Status

**Date:** November 14, 2025  
**ESLint Rule Added:** `@typescript-eslint/no-explicit-any` set to "error"  
**Prevention:** ✅ Enabled - New `any` types will cause build errors

## Summary

The codebase currently has approximately **156 `any` types** across **115 files** in `lib/` and `app/api/`. While this is not ideal, these have been temporarily allowed to maintain code functionality while we focus on other critical improvements.

### ESLint Configuration

The following rules have been added to prevent new `any` usage:

- `@typescript-eslint/no-explicit-any`: "error"
- `@typescript-eslint/no-unsafe-assignment`: "warn"
- `@typescript-eslint/no-unsafe-member-access`: "warn"
- `@typescript-eslint/no-unsafe-call`: "warn"

## Files with `any` Types

### lib/ (55 files, ~130 occurrences)

**High Priority:**

- `lib/context/auth-context.tsx` - Profile channel types
- `lib/context/notification-context.tsx` - Query cache types
- `lib/hooks/use-messages-realtime.ts` - Channel types
- `lib/hooks/use-conversations-realtime.ts` - Channel types
- `lib/utils/permissions.ts` - Role type assertions
- `lib/database/conflict-resolver.ts` - Generic data types
- `lib/supabase/connection-pool.ts` - Connection types

**Medium Priority:**

- `lib/integrations/` - API response types
- `lib/moderation/` - Report data types
- `lib/payments/` - Payment types
- `lib/services/` - Service response types
- `lib/utils/` - Utility function parameters

### app/api/ (60 files, ~165 occurrences)

**High Priority:**

- `app/api/v2/` - V2 API routes with complex types
- `app/api/polls/[id]/comments/route.ts` - Comment tree building
- `app/api/posts/[id]/comments/route.ts` - Comment handling
- `app/api/discover/route.ts` - Discovery algorithm

**Medium Priority:**

- Other API routes with generic response handling

## Refactoring Strategy

### Phase 1: Define Proper Types (1-2 weeks)

1. Create comprehensive type definitions in `lib/types/`
2. Generate types from Supabase schema
3. Define API response interfaces
4. Create utility types for common patterns

### Phase 2: Gradual Replacement (4-6 weeks)

1. Start with high-priority files
2. Replace `any` with proper types or `unknown` where appropriate
3. Add type guards where needed
4. Use generic types for reusable functions

### Phase 3: Verification (1 week)

1. Run `npm run type-check` to ensure no errors
2. Test critical flows
3. Update tests to use proper types

## Common Patterns to Fix

### Pattern 1: Supabase Client Type

```typescript
// Before
const channelRef = useRef<any>(null)

// After
const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
```

### Pattern 2: Generic Function Parameters

```typescript
// Before
function process(data: any) {}

// After
function process<T>(data: T): T {}
// Or
function process(data: unknown): void {}
```

### Pattern 3: API Responses

```typescript
// Before
const result: any = await fetch(url)

// After
interface ApiResponse {
  success: boolean
  data: unknown
  error?: string
}
const result: ApiResponse = await fetch(url)
```

### Pattern 4: Type Assertions

```typescript
// Before
const role = membership.role as any

// After
const role = membership.role as 'admin' | 'moderator' | 'member' | null
if (role === 'admin' || role === 'moderator' || role === 'member') {
  return role
}
return null
```

## Tools

### Find All `any` Types

```bash
# In lib/
grep -r "any" lib/ --include="*.ts" --include="*.tsx"

# In app/api/
grep -r "any" app/api/ --include="*.ts" --include="*.tsx"

# Count occurrences
grep -r "\bany\b" lib/ app/api/ --include="*.ts" --include="*.tsx" | wc -l
```

### Type-Check Specific File

```bash
npx tsc --noEmit path/to/file.ts
```

## Benefits of Removing `any`

1. **Type Safety:** Catch errors at compile time instead of runtime
2. **Better IntelliSense:** Improved autocomplete and documentation
3. **Refactoring Safety:** TypeScript will catch breaking changes
4. **Code Quality:** Forces thinking about data shapes
5. **Maintainability:** Easier for new developers to understand

## Notes

- Priority should be given to files in critical paths (auth, payments, data mutations)
- Some `any` types are acceptable for:
  - Third-party library types that don't have proper definitions
  - Very dynamic data where shape is truly unknown
  - Temporary workarounds documented with FIXME comments
- Always prefer `unknown` over `any` when the type is truly unknown
- Use type guards to narrow `unknown` to specific types

## Progress Tracking

- [ ] Phase 1: Define proper types (0%)
- [ ] Phase 2: Replace `any` in lib/ (0%)
- [ ] Phase 3: Replace `any` in app/api/ (0%)
- [ ] Phase 4: Final verification (0%)

**Target:** Reduce `any` types to < 10 critical cases by Q1 2026
