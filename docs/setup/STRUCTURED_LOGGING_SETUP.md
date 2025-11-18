# Structured Logging Setup Guide

## Overview

This guide covers implementing structured logging for Theglocal using modern logging services with log aggregation, querying, and alerting capabilities.

## Why Structured Logging?

Current state: 800+ console.log statements scattered across codebase

- ❌ No filtering or search
- ❌ Lost on page refresh
- ❌ No production visibility
- ❌ Difficult to debug issues
- ❌ No alerting on errors

Structured logging provides:

- ✅ Centralized log storage
- ✅ Search and filter by level, context, user
- ✅ Real-time monitoring
- ✅ Automatic error alerting
- ✅ Performance metrics
- ✅ Audit trails

## Recommended Services

### 1. Better Stack (LogTail) - RECOMMENDED

**Pros:**

- Purpose-built for modern web apps
- Excellent Next.js integration
- Real-time log streaming
- Powerful query language
- Generous free tier (1GB/month)
- Beautiful UI

**Pricing:** Free → $10/mo → $25/mo

### 2. LogFlare

**Pros:**

- Cloudflare integration
- Very fast ingestion
- SQL-based queries
- Good for high-volume logs

**Pricing:** Free → $49/mo

### 3. Axiom

**Pros:**

- Serverless-first design
- Unlimited retention
- Fast queries
- Good for Next.js

**Pricing:** Free (500GB ingest) → $25/mo

### 4. Datadog

**Pros:**

- Full observability platform
- APM + Logs + Metrics
- Enterprise features
- Best for large scale

**Pricing:** Expensive (starts at $15/host/mo)

## Implementation with Better Stack (LogTail)

### Step 1: Setup Better Stack Account

```bash
# 1. Sign up at https://betterstack.com/logtail
# 2. Create a new source (select "Node.js / Next.js")
# 3. Copy your source token
```

### Step 2: Install Dependencies

```bash
npm install @logtail/node @logtail/winston winston
npm install --save-dev @types/winston
```

### Step 3: Create Logger Utility

```typescript
// lib/utils/logger.ts
import { Logtail } from '@logtail/node'
import { LogtailTransport } from '@logtail/winston'
import winston from 'winston'

// Initialize Logtail (only if token provided)
const logtail = process.env.LOGTAIL_SOURCE_TOKEN
  ? new Logtail(process.env.LOGTAIL_SOURCE_TOKEN)
  : null

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'theglocal',
    environment: process.env.NODE_ENV,
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  },
  transports: [
    // Console transport (always enabled in development)
    ...(process.env.NODE_ENV !== 'production'
      ? [
          new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
          }),
        ]
      : []),
    // Logtail transport (production only)
    ...(logtail ? [new LogtailTransport(logtail)] : []),
  ],
})

/**
 * Structured logger with multiple severity levels.
 * Automatically sends logs to Better Stack in production.
 */
export const log = {
  /**
   * Debug-level logging (verbose, development only).
   */
  debug: (message: string, meta?: Record<string, any>) => {
    logger.debug(message, meta)
  },

  /**
   * Info-level logging (general information).
   */
  info: (message: string, meta?: Record<string, any>) => {
    logger.info(message, meta)
  },

  /**
   * Warning-level logging (potential issues).
   */
  warn: (message: string, meta?: Record<string, any>) => {
    logger.warn(message, meta)
  },

  /**
   * Error-level logging (errors that need attention).
   */
  error: (message: string, error?: Error, meta?: Record<string, any>) => {
    logger.error(message, {
      ...meta,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : undefined,
    })
  },

  /**
   * Critical-level logging (system failures, requires immediate action).
   */
  critical: (message: string, error?: Error, meta?: Record<string, any>) => {
    logger.error(message, {
      ...meta,
      severity: 'critical',
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : undefined,
    })
  },
}

export default log
```

### Step 4: Add Context-Aware Logging

```typescript
// lib/utils/logger-context.ts
import { log } from './logger'

/**
 * Creates a logger with additional context.
 * Useful for adding consistent metadata to all logs in a module.
 */
export function createContextLogger(context: Record<string, any>) {
  return {
    debug: (message: string, meta?: Record<string, any>) =>
      log.debug(message, { ...context, ...meta }),
    info: (message: string, meta?: Record<string, any>) =>
      log.info(message, { ...context, ...meta }),
    warn: (message: string, meta?: Record<string, any>) =>
      log.warn(message, { ...context, ...meta }),
    error: (message: string, error?: Error, meta?: Record<string, any>) =>
      log.error(message, error, { ...context, ...meta }),
    critical: (message: string, error?: Error, meta?: Record<string, any>) =>
      log.critical(message, error, { ...context, ...meta }),
  }
}

/**
 * Logger for API routes with automatic request context.
 */
export function createAPILogger(method: string, path: string, userId?: string) {
  return createContextLogger({
    context: 'api',
    method,
    path,
    userId: userId || 'anonymous',
  })
}

/**
 * Logger for database operations.
 */
export function createDBLogger(operation: string, table: string) {
  return createContextLogger({
    context: 'database',
    operation,
    table,
  })
}
```

### Step 5: Update Environment Variables

```bash
# .env.local
LOGTAIL_SOURCE_TOKEN=your_logtail_token_here
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### Step 6: Migrate console.log Statements

#### Before (console.log)

```typescript
console.log('User signed in:', user.id)
console.error('Failed to fetch posts:', error)
```

#### After (structured logging)

```typescript
import { log } from '@/lib/utils/logger'

log.info('User signed in', { userId: user.id, timestamp: new Date() })
log.error('Failed to fetch posts', error, { userId: user.id, action: 'fetch_posts' })
```

## Usage Examples

### API Routes

```typescript
// app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const logger = createAPILogger('GET', `/api/posts/${params.id}`)

  try {
    logger.info('Fetching post', { postId: params.id })

    const supabase = await createClient()
    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      logger.error('Database error fetching post', error, { postId: params.id })
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    logger.info('Post fetched successfully', { postId: params.id })
    return NextResponse.json({ data: post })
  } catch (error) {
    logger.critical('Unexpected error in GET /api/posts/[id]', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Database Operations

```typescript
import { createDBLogger } from '@/lib/utils/logger-context'

export async function createPost(userId: string, data: PostData) {
  const logger = createDBLogger('insert', 'posts')

  logger.info('Creating post', { userId, title: data.title })

  try {
    const result = await db.posts.create({
      data: {
        ...data,
        userId,
      },
    })

    logger.info('Post created successfully', { postId: result.id, userId })
    return result
  } catch (error) {
    logger.error('Failed to create post', error as Error, { userId })
    throw error
  }
}
```

### Authentication

```typescript
import { log } from '@/lib/utils/logger'

export async function signIn(email: string, password: string) {
  log.info('Sign in attempt', { email })

  try {
    const result = await supabase.auth.signInWithPassword({ email, password })

    if (result.error) {
      log.warn('Sign in failed', { email, reason: result.error.message })
      throw result.error
    }

    log.info('Sign in successful', { userId: result.data.user?.id, email })
    return result
  } catch (error) {
    log.error('Sign in error', error as Error, { email })
    throw error
  }
}
```

### Background Jobs

```typescript
import { log } from '@/lib/utils/logger'

export async function processEmailQueue() {
  log.info('Email queue processing started')

  try {
    const emails = await getQueuedEmails()
    log.info('Emails fetched from queue', { count: emails.length })

    for (const email of emails) {
      try {
        await sendEmail(email)
        log.info('Email sent', { emailId: email.id, recipient: email.to })
      } catch (error) {
        log.error('Email send failed', error as Error, { emailId: email.id })
      }
    }

    log.info('Email queue processing completed', { processed: emails.length })
  } catch (error) {
    log.critical('Email queue processing failed', error as Error)
  }
}
```

## Better Stack Configuration

### 1. Create Log Views

Create saved views for common queries:

**Error Logs:**

```sql
level:"error" OR level:"critical"
```

**API Logs:**

```sql
context:"api"
```

**User Activity:**

```sql
userId:EXISTS
```

**Slow Queries:**

```sql
duration:>1000
```

### 2. Setup Alerts

Create alerts for critical events:

**High Error Rate:**

- Condition: `level:"error" COUNT > 10 in 5 minutes`
- Notification: Email, Slack

**API Failures:**

- Condition: `context:"api" AND level:"error" COUNT > 5 in 1 minute`
- Notification: Email, Slack, PagerDuty

**Authentication Failures:**

```
message:"Sign in failed" COUNT > 20 in 5 minutes
```

### 3. Create Dashboards

**Application Health:**

- Error rate over time
- Top error messages
- Response times by endpoint

**User Activity:**

- Sign-ins over time
- Active users
- Most popular features

**Performance:**

- Database query times
- API response times
- Background job duration

## Migration Script

Create a script to help migrate console.log to structured logging:

```bash
#!/bin/bash
# scripts/migrate-console-logs.sh

echo "Finding all console.log statements..."

# Find all console.log
grep -r "console.log" app/ lib/ components/ --include="*.ts" --include="*.tsx" -n > console-logs.txt

echo "Found $(wc -l < console-logs.txt) console.log statements"
echo "Saved to console-logs.txt"

# Provide guidance
echo ""
echo "Migration Guide:"
echo "1. Replace console.log with log.info"
echo "2. Replace console.error with log.error"
echo "3. Replace console.warn with log.warn"
echo "4. Replace console.debug with log.debug"
echo "5. Add contextual metadata to each log"
```

## Best Practices

### 1. Log Levels

Use appropriate log levels:

- **debug:** Detailed diagnostic info (dev only)
- **info:** General informational messages
- **warn:** Warning messages (potential issues)
- **error:** Error events (handled)
- **critical:** Critical failures (require immediate action)

### 2. Add Context

Always include relevant metadata:

```typescript
// ❌ Bad
log.info('Post created')

// ✅ Good
log.info('Post created', {
  postId: post.id,
  userId: user.id,
  title: post.title,
  duration: endTime - startTime,
})
```

### 3. Avoid Sensitive Data

Never log:

- Passwords
- API keys
- Credit card numbers
- Personal identifiable information (PII)

```typescript
// ❌ Bad
log.info('User login', { email: user.email, password: password })

// ✅ Good
log.info('User login', { userId: user.id, email: hashEmail(user.email) })
```

### 4. Performance Considerations

```typescript
// ❌ Bad: Expensive computation always executed
log.debug('User data', { userData: serializeComplexObject(user) })

// ✅ Good: Only compute if debug level is active
if (logger.isLevelEnabled('debug')) {
  log.debug('User data', { userData: serializeComplexObject(user) })
}
```

## Querying Logs

### Better Stack Query Language

```sql
-- Find all errors in last hour
level:"error" @timestamp:>now-1h

-- API errors for specific user
context:"api" AND userId:"user123" AND level:"error"

-- Slow database queries
context:"database" AND duration:>1000

-- Search by message
message:"Failed to fetch"

-- Combine multiple conditions
(level:"error" OR level:"critical") AND context:"api" @timestamp:>now-24h
```

## Cost Optimization

### 1. Log Sampling

For high-volume logs, implement sampling:

```typescript
const shouldLog = Math.random() < 0.1 // Sample 10%

if (shouldLog) {
  log.info('High volume event', { ...data })
}
```

### 2. Log Retention

Configure retention based on importance:

- Critical logs: 90 days
- Error logs: 30 days
- Info logs: 7 days
- Debug logs: 1 day

### 3. Use Appropriate Levels

Use debug level sparingly in production:

```typescript
if (process.env.NODE_ENV === 'development') {
  log.debug('Detailed debug info', { ... })
}
```

## Monitoring & Alerting

### Key Metrics to Track

1. **Error Rate:** Errors per minute
2. **Response Time:** P50, P95, P99 latencies
3. **Throughput:** Requests per second
4. **User Activity:** Active users, sign-ins

### Recommended Alerts

1. **High Error Rate:** > 10 errors/minute for 5 minutes
2. **API Failures:** > 5% error rate on any endpoint
3. **Database Errors:** Any critical database error
4. **Authentication Issues:** > 20 failed logins in 5 minutes
5. **Performance Degradation:** P95 latency > 2 seconds

## Next Steps

1. [ ] Sign up for Better Stack account
2. [ ] Install dependencies
3. [ ] Create logger utility
4. [ ] Add LOGTAIL_SOURCE_TOKEN to .env
5. [ ] Migrate console.log in critical paths (API routes, auth, database)
6. [ ] Setup log views and dashboards
7. [ ] Configure alerts
8. [ ] Migrate remaining console.log statements

## Resources

- [Better Stack Documentation](https://betterstack.com/docs/logs/)
- [Winston Documentation](https://github.com/winstonjs/winston)
- [Logtail Node.js SDK](https://github.com/logtail/logtail-node)

---

**Status:** Ready for implementation
**Estimated Time:** 2-4 hours for initial setup + migration
**Priority:** High (critical for production monitoring)
