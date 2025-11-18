# JSDoc Documentation Standards

## Overview

This document defines JSDoc standards for Theglocal to ensure consistent, comprehensive documentation across all exported functions, types, and classes.

## Why JSDoc?

- **IntelliSense:** Better autocomplete in IDEs
- **Type Safety:** Enhanced TypeScript type checking
- **Documentation Generation:** Can generate HTML docs
- **Onboarding:** Easier for new developers
- **Maintainability:** Clear intent and usage

## Basic Syntax

### Function Documentation

````typescript
/**
 * Brief description of what the function does.
 *
 * More detailed explanation if needed. Can span multiple lines.
 *
 * @param paramName - Description of the parameter
 * @param optionalParam - Description of optional parameter
 * @returns Description of return value
 * @throws {ErrorType} When this error is thrown
 * @example
 * ```ts
 * const result = functionName('value', 42)
 * console.log(result) // Output: ...
 * ```
 */
export function functionName(paramName: string, optionalParam?: number): ReturnType {
  // Implementation
}
````

### Class Documentation

````typescript
/**
 * Brief description of the class.
 *
 * @template T - Type parameter description
 * @example
 * ```ts
 * const instance = new ClassName<string>()
 * ```
 */
export class ClassName<T> {
  /**
   * Description of the property.
   * @private Internal use only
   */
  private property: T

  /**
   * Constructor description.
   *
   * @param initialValue - Initial value for property
   */
  constructor(initialValue: T) {
    this.property = initialValue
  }

  /**
   * Method description.
   *
   * @returns Processed value
   */
  public method(): T {
    return this.property
  }
}
````

### Type Documentation

```typescript
/**
 * User profile data structure.
 */
export type UserProfile = {
  /** Unique identifier */
  id: string
  /** Display name (anonymous handle) */
  name: string
  /** Avatar seed for geometric avatar generation */
  avatarSeed: string
  /** User's city location */
  city: string | null
}

/**
 * API response wrapper.
 *
 * @template T - Type of the data payload
 */
export interface ApiResponse<T> {
  /** Indicates if request was successful */
  success: boolean
  /** Response data (only present on success) */
  data?: T
  /** Error message (only present on failure) */
  error?: string
}
```

### Hook Documentation

````typescript
/**
 * Custom hook for managing authentication state.
 *
 * Provides current user, profile, session, and auth actions.
 * Automatically syncs with Supabase auth state changes.
 *
 * @returns Auth context with user data and actions
 * @throws {Error} If used outside AuthProvider
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, profile, signOut } = useAuth()
 *
 *   if (!user) return <div>Not logged in</div>
 *
 *   return (
 *     <div>
 *       <p>Welcome, {profile?.anonymous_handle}</p>
 *       <button onClick={signOut}>Sign Out</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useAuth(): AuthContextType {
  // Implementation
}
````

## JSDoc Tags Reference

| Tag           | Purpose                  | Example                                       |
| ------------- | ------------------------ | --------------------------------------------- |
| `@param`      | Parameter description    | `@param userId - The user's ID`               |
| `@returns`    | Return value description | `@returns User profile object`                |
| `@throws`     | Error description        | `@throws {NotFoundError} When user not found` |
| `@example`    | Usage example            | See examples above                            |
| `@deprecated` | Mark as deprecated       | `@deprecated Use newFunction instead`         |
| `@see`        | Reference to related     | `@see {@link relatedFunction}`                |
| `@internal`   | Internal use only        | `@internal Not part of public API`            |
| `@async`      | Async function           | `@async`                                      |
| `@template`   | Generic type parameter   | `@template T - Type of items`                 |
| `@typedef`    | Define custom type       | `@typedef {Object} UserData`                  |

## Best Practices

### 1. Write for Humans, Not Machines

```typescript
// ❌ Bad: States the obvious
/**
 * Gets the user.
 * @param id - The ID
 * @returns The user
 */
function getUser(id: string): User

// ✅ Good: Provides context and details
/**
 * Fetches user profile from database with location data.
 * Throws NotFoundError if user doesn't exist.
 *
 * @param id - Unique user identifier (UUID format)
 * @returns Complete user profile including anonymous handle and city
 * @throws {NotFoundError} When user ID is not found in database
 */
function getUser(id: string): Promise<User>
```

### 2. Include Examples for Complex Functions

````typescript
/**
 * Calculates distance between two geographic coordinates using Haversine formula.
 *
 * @param lat1 - Latitude of first point (-90 to 90)
 * @param lng1 - Longitude of first point (-180 to 180)
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in kilometers (rounded to 2 decimals)
 * @example
 * ```ts
 * // Distance between New York and Los Angeles
 * const distance = calculateDistance(40.7128, -74.0060, 34.0522, -118.2437)
 * console.log(distance) // ~3944.42 km
 * ```
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Implementation
}
````

### 3. Document Side Effects

````typescript
/**
 * Initializes analytics tracking and sends page view event.
 *
 * **Side Effects:**
 * - Injects Google Analytics script into DOM
 * - Sets cookie for user tracking
 * - Sends initial pageview event to GA
 *
 * @param trackingId - Google Analytics tracking ID (e.g., 'G-XXXXXXXXXX')
 * @returns void
 * @example
 * ```ts
 * useEffect(() => {
 *   initAnalytics('G-ABC123')
 * }, [])
 * ```
 */
export function initAnalytics(trackingId: string): void {
  // Implementation
}
````

### 4. Link Related Documentation

```typescript
/**
 * Authenticates user with email and password.
 *
 * @param email - User's email address
 * @param password - User's password (min 8 characters)
 * @returns Authentication session with tokens
 * @throws {InvalidCredentialsError} When credentials are incorrect
 * @see {@link signUp} for creating new accounts
 * @see {@link resetPassword} for password recovery
 * @see {@link signOut} for logging out
 */
export async function signIn(email: string, password: string): Promise<Session> {
  // Implementation
}
```

### 5. Document Performance Considerations

```typescript
/**
 * Sorts posts by vote count using quicksort algorithm.
 *
 * **Performance:**
 * - Time complexity: O(n log n) average, O(n²) worst case
 * - Space complexity: O(log n)
 * - Recommended for arrays with < 10,000 items
 * - For larger arrays, consider using database-level sorting
 *
 * @param posts - Array of posts to sort
 * @returns Sorted array (descending by votes)
 */
export function sortPostsByVotes(posts: Post[]): Post[] {
  // Implementation
}
```

### 6. Document Security Considerations

````typescript
/**
 * Sanitizes user-provided HTML content to prevent XSS attacks.
 *
 * **Security:**
 * - Removes all script tags
 * - Strips event handlers (onclick, onerror, etc.)
 * - Whitelist-based approach for allowed tags
 * - Safe for rendering with dangerouslySetInnerHTML
 *
 * @param html - Raw HTML string from user input
 * @returns Sanitized HTML safe for rendering
 * @example
 * ```tsx
 * const safeHtml = sanitizeUserContent(userInput)
 * <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
 * ```
 */
export function sanitizeUserContent(html: string): string {
  // Implementation
}
````

## Component-Specific Patterns

### React Components

````tsx
/**
 * Post card component displaying post content with voting and actions.
 *
 * **Features:**
 * - Optimistic vote updates
 * - Media gallery with lazy loading
 * - Author info with avatar
 * - Timestamp with relative formatting
 *
 * @param props - Component props
 * @param props.post - Post data to display
 * @param props.onVote - Callback when user votes (optional)
 * @param props.showActions - Show action buttons (default: true)
 * @returns Rendered post card
 * @example
 * ```tsx
 * <PostCard
 *   post={post}
 *   onVote={(type) => handleVote(post.id, type)}
 * />
 * ```
 */
export function PostCard({ post, onVote, showActions = true }: PostCardProps): JSX.Element {
  // Implementation
}
````

### API Routes

````typescript
/**
 * GET /api/posts/[id] - Fetch single post with full details.
 *
 * **Authentication:** Optional (public endpoint)
 * **Rate Limit:** 100 requests per minute per IP
 *
 * @param request - Next.js request object
 * @param params - Route parameters
 * @param params.id - Post ID (UUID)
 * @returns Post data with author, votes, comments count
 * @throws {404} When post not found
 * @throws {500} On database errors
 * @example
 * ```ts
 * const response = await fetch('/api/posts/123e4567-e89b-12d3-a456-426614174000')
 * const { data } = await response.json()
 * console.log(data.post)
 * ```
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // Implementation
}
````

### Utility Functions

````typescript
/**
 * Formats relative time (e.g., "2 hours ago", "3 days ago").
 *
 * **Localization:** Uses browser locale if available
 * **Thresholds:**
 * - < 1 min: "just now"
 * - < 1 hour: "X minutes ago"
 * - < 24 hours: "X hours ago"
 * - < 7 days: "X days ago"
 * - >= 7 days: Absolute date (e.g., "Jan 15, 2024")
 *
 * @param date - Date to format (Date object or ISO string)
 * @param locale - Optional locale (default: navigator.language)
 * @returns Formatted relative time string
 * @example
 * ```ts
 * formatRelativeTime(new Date('2024-01-14T10:00:00'))
 * // Output: "2 hours ago" (if current time is 12:00)
 * ```
 */
export function formatRelativeTime(date: Date | string, locale?: string): string {
  // Implementation
}
````

## Priority Levels

### 🔴 Critical (Must Document)

1. All exported functions in `lib/`
2. All API route handlers
3. All custom hooks
4. All public utility functions
5. Complex algorithms or logic

### 🟡 High Priority (Should Document)

1. React components (especially reusable ones)
2. Type definitions and interfaces
3. Context providers
4. Database query functions
5. Error handling utilities

### 🟢 Medium Priority (Nice to Have)

1. Internal helper functions
2. Configuration files
3. Constants and enums
4. Test utilities
5. Build scripts

## Generating Documentation

### Using TypeDoc

```bash
# Install TypeDoc
npm install --save-dev typedoc

# Generate HTML docs
npx typedoc --entryPoints lib --out docs/api
```

### Add to package.json

```json
{
  "scripts": {
    "docs:generate": "typedoc --entryPoints lib --out docs/api",
    "docs:watch": "typedoc --entryPoints lib --out docs/api --watch"
  }
}
```

## Validation

### ESLint Plugin

```bash
npm install --save-dev eslint-plugin-jsdoc
```

```json
// .eslintrc.json
{
  "plugins": ["jsdoc"],
  "rules": {
    "jsdoc/require-jsdoc": [
      "warn",
      {
        "require": {
          "FunctionDeclaration": true,
          "MethodDefinition": true,
          "ClassDeclaration": true
        }
      }
    ],
    "jsdoc/require-param": "warn",
    "jsdoc/require-returns": "warn",
    "jsdoc/check-types": "warn"
  }
}
```

## Migration Strategy

### Phase 1: Core Utilities (Week 1)

- [ ] lib/utils/
- [ ] lib/hooks/
- [ ] lib/supabase/

### Phase 2: API Routes (Week 2)

- [ ] app/api/posts/
- [ ] app/api/users/
- [ ] app/api/communities/
- [ ] app/api/artists/
- [ ] app/api/events/

### Phase 3: Components (Week 3)

- [ ] components/ui/
- [ ] components/posts/
- [ ] components/communities/
- [ ] components/artists/

### Phase 4: Types & Schemas (Week 4)

- [ ] lib/types/
- [ ] lib/schemas/
- [ ] lib/constants/

## Examples from Codebase

### Authentication Hook

````typescript
/**
 * Custom hook for managing user authentication state.
 *
 * Provides access to current user, profile, session, and auth actions.
 * Automatically subscribes to Supabase auth state changes and keeps
 * user profile data in sync.
 *
 * **Performance:** Uses React Context to prevent unnecessary re-renders
 * **Privacy:** Profile data is anonymized with generated handles
 *
 * @returns {AuthContextType} Auth state and actions
 * @returns {User | null} returns.user - Current Supabase user or null
 * @returns {UserProfile | null} returns.profile - User profile data or null
 * @returns {Session | null} returns.session - Active session or null
 * @returns {boolean} returns.isLoading - Loading state during initial auth check
 * @returns {() => Promise<void>} returns.signOut - Signs out current user
 * @returns {() => Promise<void>} returns.refreshProfile - Refreshes profile data
 * @throws {Error} When used outside AuthProvider context
 * @example
 * ```tsx
 * function UserMenu() {
 *   const { user, profile, signOut, isLoading } = useAuth()
 *
 *   if (isLoading) return <Skeleton />
 *   if (!user) return <SignInButton />
 *
 *   return (
 *     <DropdownMenu>
 *       <DropdownMenuTrigger>{profile?.anonymous_handle}</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem onClick={signOut}>Sign Out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 *   )
 * }
 * ```
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
````

### Error Handler Utility

````typescript
/**
 * Creates a type-safe async wrapper with automatic error handling.
 *
 * Wraps async functions to catch errors and call optional error handler.
 * Useful for preventing unhandled promise rejections in event handlers.
 *
 * **Type Safety:** Preserves original function signature
 * **Error Logging:** Logs to console if no handler provided
 *
 * @template T - Function type to wrap
 * @param fn - Async function to wrap
 * @param errorHandler - Optional custom error handler
 * @returns Wrapped function with same signature as input
 * @example
 * ```ts
 * const safeDeletePost = createSafeAsync(
 *   deletePost,
 *   (error) => {
 *     toast({ title: 'Failed to delete post', description: error.message })
 *   }
 * )
 *
 * // Use in event handler
 * <button onClick={() => safeDeletePost(postId)}>Delete</button>
 * ```
 */
export function createSafeAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  errorHandler?: (error: Error) => void
): T {
  // Implementation
}
````

## Resources

- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [JSDoc Official Documentation](https://jsdoc.app/)
- [TypeDoc](https://typedoc.org/)
- [ESLint JSDoc Plugin](https://github.com/gajus/eslint-plugin-jsdoc)

---

**Status:** Initial implementation in progress
**Last Updated:** 2025-11-14
**Maintainer:** Development Team
