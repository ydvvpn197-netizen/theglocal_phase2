# Theglocal Architecture Overview

## System Architecture

- **Frontend:** Next.js 15 (App Router), Server Components by default
- **Backend:** Supabase (PostgreSQL + PostGIS), Edge Functions, Vercel Serverless
- **State:** React Query for server state, React Context for auth/location
- **Styling:** TailwindCSS + shadcn/ui, 8px base unit system

## Key Patterns

### Database

- Row Level Security (RLS) on all tables
- PostGIS for location queries
- 107 migrations, versioned schema
- Auto-generated TypeScript types

### Authentication

- Supabase Auth (Email/Phone OTP, Google OAuth)
- Anonymous handles, no real names
- Session management via middleware

### Privacy

- City-level location only (~1km rounding)
- GDPR/CCPA compliant
- Minimal data collection

### Performance

- Redis caching (ioredis) with in-memory fallback
- Rate limiting (user-aware & IP-based)
- Edge-compatible middleware
- Image optimization (AVIF, WebP)

### API Routes

- Serverless functions on Vercel
- Edge functions for middleware
- Zod validation for all inputs
- Comprehensive error handling

### Notifications

- Supabase-backed notification feed with strict RLS and service-role inserts only
- `create_notification` SQL function enforces actor ownership and batching (5 min window)
- REST endpoints provide cursor pagination (`/api/notifications`) and summary metadata (`/api/notifications/summary`)
- React Query powers client caches with optimistic mutations and shared infinite lists
- Supabase realtime channels trigger cache invalidation with exponential backoff retries
- Batch metadata (`batch_count`) rendered via UI pills for grouped events

### Observability

- Summary endpoint enables lightweight health checks for unread counts
- Realtime subscription retries logged with attempt counters
- Client cache invalidations debounced to avoid flooding analytics

## MCP Integration

- Supabase MCP: database ops, schema sync
- Vercel MCP: deployment, logs, env vars
