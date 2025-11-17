# Rate Limiting Documentation

## Overview

All API endpoints in Theglocal platform are protected by rate limiting to prevent abuse and ensure fair usage. Rate limiting is implemented using a unified wrapper that automatically detects Redis availability and falls back to in-memory limiting when needed.

## Rate Limit Presets

The platform uses different rate limit presets based on route categories:

| Preset           | Limit       | Use Case                                         |
| ---------------- | ----------- | ------------------------------------------------ |
| **HIGH_TRAFFIC** | 100 req/min | High-traffic routes (feed, posts, search)        |
| **STANDARD**     | 60 req/min  | Standard API routes (default)                    |
| **EXPENSIVE**    | 20 req/min  | Expensive operations (uploads, analytics, admin) |
| **AUTH**         | 10 req/min  | Authentication routes and webhooks               |
| **CRON**         | No limit    | Cron job routes (excluded)                       |

## Route Categories

### High-Traffic Routes (100 req/min)

- `/api/feed`
- `/api/v2/feed`
- `/api/posts`
- `/api/v2/search`
- `/api/discover`

### Standard Routes (60 req/min)

- `/api/communities`
- `/api/events`
- `/api/artists`
- `/api/locations`
- `/api/comments`
- `/api/polls`
- `/api/messages`
- `/api/notifications`
- `/api/bookings`
- `/api/drafts`
- `/api/reports`
- `/api/moderation`
- `/api/profile`
- `/api/users`
- `/api/jobs`
- `/api/docs`

### Expensive Routes (20 req/min)

- `/api/upload/*`
- `/api/geocoding/*`
- `/api/analytics/*`
- `/api/admin/*`
- `/api/transparency/*`
- `/api/stats/*`
- `/api/v2/analytics/*`
- OAuth callbacks (`/api/*/callback`)

### Auth Routes (10 req/min)

- `/api/auth/*`
- Webhook routes (`/api/*/webhook`)
- OAuth auth endpoints (`/api/*/auth`)

### Excluded Routes

- `/api/cron/*` - Cron jobs have no rate limits

## Rate Limit Headers

All API responses include rate limit headers:

- `X-RateLimit-Limit`: Maximum number of requests allowed per window
- `X-RateLimit-Remaining`: Number of requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit window resets
- `Retry-After`: Seconds to wait before retrying (only on 429 responses)

### Example Response Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704067200
```

## Rate Limit Exceeded Response

When rate limit is exceeded, the API returns a 429 status code:

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again in 45 seconds.",
  "retryAfter": 45
}
```

Response headers:

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704067200
Retry-After: 45
```

## Implementation

### Adding Rate Limiting to New Routes

All API routes should use the `withRateLimit` wrapper:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const GET = withRateLimit(async function GET(request: NextRequest) {
  // Your handler code
  return NextResponse.json({ data: 'ok' })
})
```

The wrapper automatically:

1. Detects the route path and applies appropriate limits
2. Uses Redis for distributed rate limiting (if available)
3. Falls back to in-memory limiting (Edge-compatible)
4. Adds rate limit headers to all responses
5. Returns user-friendly error messages on rate limit exceeded

### Custom Rate Limits

For routes that need custom limits, pass a config:

```typescript
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const POST = withRateLimit(
  async function POST(request: NextRequest) {
    // Handler code
  },
  {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // Custom limit
  }
)
```

### Route Pattern Matching

Rate limits are automatically assigned based on route patterns defined in `lib/config/rate-limits.ts`. Routes are matched in order, first match wins.

To add a new route pattern:

```typescript
export const RATE_LIMIT_ROUTE_MAP = [
  // Add your pattern before the default catch-all
  { pattern: /^\/api\/your-route/, preset: 'STANDARD' },
  // ...
  { pattern: /^\/api\//, preset: 'STANDARD' }, // Default
]
```

## Rate Limiting Strategy

### User-Based vs IP-Based

Rate limiting uses a hybrid approach:

1. **Authenticated users**: Rate limits are applied per user ID
2. **Anonymous users**: Rate limits are applied per IP address

This ensures fair usage while preventing abuse from unauthenticated requests.

### Distributed Rate Limiting

When Redis is available, rate limiting is distributed across all server instances. This ensures consistent limits even in a multi-instance deployment.

If Redis is unavailable, the system automatically falls back to in-memory rate limiting, which works per-instance but still provides protection.

## Monitoring

Rate limit violations are logged for monitoring. Check logs for:

- Rate limit exceeded events
- Redis connection issues (fallback to in-memory)
- Unusual traffic patterns

## Best Practices

1. **Always use `withRateLimit`**: All API routes should use the wrapper
2. **Choose appropriate presets**: Use the right preset for your route category
3. **Handle 429 responses**: Clients should respect `Retry-After` headers
4. **Monitor rate limits**: Track rate limit violations to identify abuse
5. **Test rate limiting**: Verify rate limits work correctly in your tests

## Testing

To test rate limiting:

1. Make requests up to the limit
2. Verify headers are present and correct
3. Exceed the limit and verify 429 response
4. Wait for reset and verify limit is restored

Example test:

```typescript
// Make 60 requests (standard limit)
for (let i = 0; i < 60; i++) {
  const response = await fetch('/api/your-route')
  const remaining = response.headers.get('X-RateLimit-Remaining')
  console.log(`Request ${i + 1}: ${remaining} remaining`)
}

// 61st request should return 429
const response = await fetch('/api/your-route')
expect(response.status).toBe(429)
```

## Troubleshooting

### Rate limits too strict

- Check if route is using the correct preset
- Verify route pattern matching in `rate-limits.ts`
- Consider using custom limits for specific routes

### Rate limits not working

- Verify `withRateLimit` wrapper is applied
- Check Redis connection (if using distributed limiting)
- Verify route path matches a pattern in `rate-limits.ts`

### Headers missing

- Ensure `withRateLimit` wrapper is used
- Check that response is a `NextResponse` object
- Verify middleware is not stripping headers

## Related Files

- `lib/middleware/with-rate-limit.ts` - Main rate limiting wrapper
- `lib/config/rate-limits.ts` - Rate limit configuration
- `lib/middleware/redis-rate-limit.ts` - Redis-based implementation
- `lib/middleware/edge-rate-limit.ts` - Edge-compatible fallback
- `scripts/audit-rate-limiting.ts` - Audit script for coverage

## Audit Coverage

Run the audit script to check rate limiting coverage:

```bash
npx tsx scripts/audit-rate-limiting.ts
```

This will generate a report showing:

- Routes with rate limiting
- Routes without rate limiting
- Routes using old rate limit utilities
- Coverage percentage
