# Bug Report

**Date:** 2025-01-17  
**Test Suite:** Comprehensive Testing (Task 4.1)

## Bug Summary

| ID      | Severity | Status | Description                      | Files Affected                       |
| ------- | -------- | ------ | -------------------------------- | ------------------------------------ |
| BUG-001 | High     | Open   | Jest ESM Import Issue            | Multiple component test files        |
| BUG-002 | High     | Open   | Next.js Request Object in Tests  | moderation.test.ts, admin.test.ts    |
| BUG-003 | Medium   | Open   | UUID Validation in Report Schema | reports/create-report-schema.test.ts |
| BUG-004 | Medium   | Open   | jest-axe Configuration Issue     | color-contrast.test.tsx              |
| BUG-005 | Low      | Open   | Handle Generation Test           | auth/handle-collision.test.ts        |
| BUG-006 | Low      | Open   | Test Coverage Collection         | Multiple route files                 |

## Detailed Bug Reports

### BUG-001: Jest ESM Import Issue

**Severity:** High  
**Priority:** High  
**Status:** Open  
**Assigned To:** TBD

**Description:**
Jest is unable to transform ESM imports from `lucide-react`, causing multiple test suites to fail with "Cannot use import statement outside a module" errors.

**Steps to Reproduce:**

1. Run `npm run test:unit`
2. Observe failures in:
   - `post-card.test.tsx`
   - `artist-filters.test.tsx`
   - `artist-card.test.tsx`
   - `artist-registration-form.test.tsx`
   - `components.test.tsx`
   - `keyboard.test.tsx`
   - `screen-reader.test.tsx`
   - `semantic-html.test.tsx`

**Expected Behavior:**
All tests should run successfully.

**Actual Behavior:**
Test suites fail with ESM import errors.

**Error Message:**

```
SyntaxError: Cannot use import statement outside a module
```

**Files Affected:**

- `__tests__/unit/post-card.test.tsx`
- `__tests__/unit/artist-filters.test.tsx`
- `__tests__/unit/artist-card.test.tsx`
- `__tests__/unit/artist-registration-form.test.tsx`
- `__tests__/accessibility/components.test.tsx`
- `__tests__/accessibility/keyboard.test.tsx`
- `__tests__/accessibility/screen-reader.test.tsx`
- `__tests__/accessibility/semantic-html.test.tsx`

**Proposed Fix:**
Update `jest.config.js` to properly transform `lucide-react`:

```javascript
transformIgnorePatterns: [
  'node_modules/(?!(lucide-react)/)',
],
```

**Additional Notes:**
Partial fix already applied, but may need additional configuration.

---

### BUG-002: Next.js Request Object in Tests

**Severity:** High  
**Priority:** High  
**Status:** Open  
**Assigned To:** TBD

**Description:**
The `Request` object from Next.js server runtime is not available in Jest test environment, causing integration tests to fail.

**Steps to Reproduce:**

1. Run `npm run test:integration`
2. Observe failures in:
   - `moderation.test.ts`
   - `admin.test.ts`
   - `cache-invalidation.test.ts`

**Expected Behavior:**
All integration tests should run successfully.

**Actual Behavior:**
Test suites fail with "Request is not defined" errors.

**Error Message:**

```
ReferenceError: Request is not defined
```

**Files Affected:**

- `__tests__/integration/moderation.test.ts`
- `__tests__/integration/admin.test.ts`
- `__tests__/edge-cases/performance/cache-invalidation.test.ts`

**Proposed Fix:**

1. Add Request polyfill to Jest setup
2. Or mock Next.js server runtime
3. Or use `node-fetch` for Request object

**Additional Notes:**
This is a common issue when testing Next.js server components in Jest.

---

### BUG-003: UUID Validation in Report Schema

**Severity:** Medium  
**Priority:** Medium  
**Status:** Open  
**Assigned To:** TBD

**Description:**
Report schema tests are using UUIDs that don't match the Zod validation pattern, causing 4 tests to fail.

**Steps to Reproduce:**

1. Run `npm run test:unit -- reports/create-report-schema.test.ts`
2. Observe failures in:
   - "accepts valid report data"
   - "accepts poll content type reports"
   - "accepts artist reports"
   - "accepts event reports"

**Expected Behavior:**
All report schema tests should pass.

**Actual Behavior:**
Tests fail with UUID validation errors.

**Error Message:**

```
ZodError: Invalid UUID
```

**Files Affected:**

- `__tests__/unit/reports/create-report-schema.test.ts`

**Test Data:**

```typescript
target_id: '11111111-1111-1111-1111-111111111111',
content_id: '11111111-1111-1111-1111-111111111111',
```

**Proposed Fix:**
Update test UUIDs to match Zod validation pattern, or update Zod schema to accept the test UUIDs.

**Additional Notes:**
The UUID format may be valid but doesn't match the specific pattern expected by Zod.

---

### BUG-004: jest-axe Configuration Issue

**Severity:** Medium  
**Priority:** Medium  
**Status:** Open  
**Assigned To:** TBD

**Description:**
jest-axe configuration includes an unknown rule `keyboard`, causing accessibility tests to fail.

**Steps to Reproduce:**

1. Run `npm run test:a11y`
2. Observe failures in `color-contrast.test.tsx`

**Expected Behavior:**
All accessibility tests should pass.

**Actual Behavior:**
Tests fail with "unknown rule `keyboard`" error.

**Error Message:**

```
unknown rule `keyboard` in options.rules
```

**Files Affected:**

- `__tests__/accessibility/color-contrast.test.tsx`
- `__tests__/setup/jest-axe.setup.ts`

**Proposed Fix:**
Remove `keyboard` rule from jest-axe configuration or update to correct rule name.

**Additional Notes:**
The `keyboard` rule may have been renamed or removed in newer versions of axe-core.

---

### BUG-005: Handle Generation Test

**Severity:** Low  
**Priority:** Low  
**Status:** Open  
**Assigned To:** TBD

**Description:**
Handle generation test expects handles to start with "LocalUser" for empty user IDs, but actual implementation generates handles like "LocalPeacefulBadger899".

**Steps to Reproduce:**

1. Run `npm test -- __tests__/edge-cases/auth/handle-collision.test.ts`
2. Observe failure in "should handle empty user IDs"

**Expected Behavior:**
Handle should match pattern `/^LocalUser/`.

**Actual Behavior:**
Handle is "LocalPeacefulBadger899" which doesn't match the pattern.

**Error Message:**

```
Expected pattern: /^LocalUser/
Received string:  "LocalPeacefulBadger899"
```

**Files Affected:**

- `__tests__/edge-cases/auth/handle-collision.test.ts`

**Proposed Fix:**
Update test expectation to match actual handle generation logic, or update handle generation to match test expectation.

**Additional Notes:**
This may be a test expectation issue rather than a bug in the implementation.

---

### BUG-006: Test Coverage Collection

**Severity:** Low  
**Priority:** Low  
**Status:** Open  
**Assigned To:** TBD

**Description:**
Syntax errors in some route files prevent Jest from collecting coverage data, resulting in very low coverage percentage (0.6%).

**Steps to Reproduce:**

1. Run `npm run test:coverage`
2. Observe syntax errors in route files
3. Check coverage report shows 0.6% overall coverage

**Expected Behavior:**
Coverage should be collected for all files without syntax errors.

**Actual Behavior:**
Coverage collection fails for files with syntax errors.

**Error Message:**

```
Syntax Error: Unexpected eof
Syntax Error: Expected ',', got 'export'
Syntax Error: Expected ',', got 'interface'
```

**Files Affected:**

- `app/api/communities/[slug]/analytics/route.ts`
- `app/api/communities/[slug]/delete/route.ts`
- `app/api/messages/conversations/[id]/route.ts`
- `app/api/posts/[id]/comments/route.ts`
- `app/api/v2/analytics/location-stats/route.ts`

**Proposed Fix:**
Fix syntax errors in affected route files.

**Additional Notes:**
These syntax errors may also affect runtime behavior, so they should be fixed regardless of test coverage.

---

## Bug Statistics

- **Total Bugs:** 6
- **Critical:** 0
- **High:** 2
- **Medium:** 2
- **Low:** 2
- **Open:** 6
- **Fixed:** 0
- **Won't Fix:** 0

## Priority Order

1. BUG-001: Jest ESM Import Issue (High)
2. BUG-002: Next.js Request Object in Tests (High)
3. BUG-003: UUID Validation in Report Schema (Medium)
4. BUG-004: jest-axe Configuration Issue (Medium)
5. BUG-005: Handle Generation Test (Low)
6. BUG-006: Test Coverage Collection (Low)
