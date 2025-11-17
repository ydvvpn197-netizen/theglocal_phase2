# Circular Dependency Detection

## Overview

Circular dependencies occur when two or more modules depend on each other, creating a cycle. This can lead to:

- Build errors
- Runtime errors
- Memory leaks
- Difficulty understanding code flow
- Increased bundle size

Theglocal uses **madge** to detect and prevent circular dependencies.

## Current Status

✅ **No circular dependencies found** (as of 2025-11-14)

## Checking for Circular Dependencies

### Local Development

```bash
# Check for circular dependencies
npm run check:circular

# Output circular dependencies as JSON
npm run check:circular:json

# Visualize dependency graph
npm run visualize:deps
```

### CI/CD

Circular dependency checks run automatically in CI:

1. On every push to main
2. On every pull request
3. Before deployment

The build will fail if circular dependencies are detected.

## Understanding the Output

### No Circular Dependencies

```
✔ No circular dependency found!
```

### Circular Dependencies Found

```
❌ Circular dependencies found:
1) app/components/A.tsx > app/components/B.tsx > app/components/A.tsx
2) lib/utils/X.ts > lib/utils/Y.ts > lib/utils/X.ts
```

## Common Circular Dependency Patterns

### 1. Component Imports

**Problem:**

```typescript
// components/A.tsx
import { B } from './B'

export function A() {
  return <B />
}

// components/B.tsx
import { A } from './A'

export function B() {
  return <A />
}
```

**Solution:**
Extract shared logic to a separate file:

```typescript
// components/shared.tsx
export const SharedLogic = () => {
  /* ... */
}

// components/A.tsx
import { SharedLogic } from './shared'

// components/B.tsx
import { SharedLogic } from './shared'
```

### 2. Utility Function Imports

**Problem:**

```typescript
// utils/auth.ts
import { formatUser } from './user'

// utils/user.ts
import { isAuthenticated } from './auth'
```

**Solution:**
Create a third file for shared utilities:

```typescript
// utils/shared.ts
export const isAuthenticated = () => {
  /* ... */
}

// utils/auth.ts
import { isAuthenticated } from './shared'

// utils/user.ts
import { isAuthenticated } from './shared'
```

### 3. Type Imports

**Problem:**

```typescript
// types/user.ts
import { Post } from './post'

export type User = {
  posts: Post[]
}

// types/post.ts
import { User } from './user'

export type Post = {
  author: User
}
```

**Solution:**
Use type-only imports or extract shared types:

```typescript
// types/user.ts
import type { Post } from './post'

export type User = {
  posts: Post[]
}

// types/post.ts
import type { User } from './user'

export type Post = {
  author: User
}
```

Or extract to a common types file:

```typescript
// types/common.ts
export type User = {
  id: string
  // ... other fields
}

export type Post = {
  id: string
  authorId: string
  // ... other fields
}

// types/user.ts
export type { User } from './common'

// types/post.ts
export type { Post } from './common'
```

### 4. Hook Dependencies

**Problem:**

```typescript
// hooks/useUser.ts
import { usePosts } from './usePosts'

// hooks/usePosts.ts
import { useUser } from './useUser'
```

**Solution:**
Create a composable hook structure:

```typescript
// hooks/useData.ts
export function useData() {
  const user = fetchUser()
  const posts = fetchPosts(user.id)
  return { user, posts }
}

// hooks/useUser.ts
import { useData } from './useData'
export function useUser() {
  const { user } = useData()
  return user
}

// hooks/usePosts.ts
import { useData } from './useData'
export function usePosts() {
  const { posts } = useData()
  return posts
}
```

## Dependency Graph Visualization

Generate a visual dependency graph:

```bash
npm run visualize:deps
```

This creates `deps-graph.svg` showing all module dependencies. Useful for:

- Understanding module relationships
- Identifying tight coupling
- Finding opportunities for refactoring

## Preventing Circular Dependencies

### 1. Follow Dependency Direction

Establish a clear dependency direction:

```
app → components → lib → types
```

**Rules:**

- `app` can import from `components`, `lib`, `types`
- `components` can import from `lib`, `types`
- `lib` can import from `types`
- `types` should not import from anything (except other `types`)

### 2. Use Barrel Exports

Create index files to centralize exports:

```typescript
// components/ui/index.ts
export { Button } from './button'
export { Input } from './input'
export { Card } from './card'

// Other files import from index
import { Button, Input } from '@/components/ui'
```

### 3. Extract Shared Code

When two modules need each other, extract shared code:

```
Before:
A.ts ← → B.ts

After:
A.ts → Shared.ts ← B.ts
```

### 4. Use Dependency Injection

Instead of direct imports, pass dependencies:

```typescript
// ❌ Bad - Creates circular dependency
import { serviceB } from './serviceB'

export function serviceA() {
  serviceB.doSomething()
}

// ✅ Good - Dependency injection
export function serviceA(serviceB: ServiceB) {
  serviceB.doSomething()
}
```

### 5. Use Event-Driven Architecture

Use events instead of direct calls:

```typescript
// ❌ Bad - Direct import
import { notifyUser } from './notifications'

export function createPost() {
  // ...
  notifyUser()
}

// ✅ Good - Event emitter
import { emit } from './events'

export function createPost() {
  // ...
  emit('post:created', post)
}
```

## Configuration

### madge Configuration

Located in `package.json`:

```json
{
  "scripts": {
    "check:circular": "madge --circular --extensions ts,tsx app lib components",
    "check:circular:json": "madge --circular --extensions ts,tsx --json app lib components",
    "visualize:deps": "madge --extensions ts,tsx --image deps-graph.svg app lib components"
  }
}
```

### ESLint Plugin (Optional)

Add `eslint-plugin-import` for additional checks:

```bash
npm install --save-dev eslint-plugin-import
```

```json
// .eslintrc.json
{
  "plugins": ["import"],
  "rules": {
    "import/no-cycle": ["error", { "maxDepth": 10 }]
  }
}
```

## Fixing Circular Dependencies

If circular dependencies are found:

1. **Identify the cycle:**

   ```bash
   npm run check:circular
   ```

2. **Analyze the dependency chain:**
   - Which modules are involved?
   - What code causes the dependency?
   - Can it be extracted?

3. **Apply a fix strategy:**
   - **Extract shared code** to a new module
   - **Use type-only imports** for TypeScript types
   - **Refactor** to break the cycle
   - **Use dependency injection** or events

4. **Verify the fix:**

   ```bash
   npm run check:circular
   ```

5. **Test thoroughly:**
   ```bash
   npm test
   npm run build
   ```

## Integration with CI/CD

### GitHub Actions

Circular dependency check runs in `.github/workflows/ci.yml`:

```yaml
- name: Check circular dependencies
  run: npm run check:circular
```

### Pre-commit Hook

Add to `.lintstagedrc.js`:

```javascript
module.exports = {
  '*.{ts,tsx}': ['eslint --fix', 'npm run check:circular'],
}
```

## Monitoring

### Regular Audits

Run monthly dependency audits:

```bash
# Check for circular dependencies
npm run check:circular

# Generate visualization
npm run visualize:deps

# Review deps-graph.svg for patterns
```

### Metrics

Track over time:

- Number of circular dependencies
- Dependency graph complexity
- Module coupling

## Resources

- [madge Documentation](https://github.com/pahen/madge)
- [Circular Dependencies Explained](https://medium.com/@antonkorzunov/circular-dependencies-explained-b6e86d4f8c29)
- [TypeScript Circular Dependencies](https://tkdodo.eu/blog/avoiding-use-effect-with-callback-refs)
- [ESLint Import Plugin](https://github.com/import-js/eslint-plugin-import)

## Audit Trail

- **2025-11-14**: Implemented madge for circular dependency detection
- **Status**: No circular dependencies found
- **CI Integration**: Added to GitHub Actions workflow
- **Scripts**: check:circular, check:circular:json, visualize:deps
- **Documentation**: Comprehensive circular dependency guide created
