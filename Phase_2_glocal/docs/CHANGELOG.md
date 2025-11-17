# Changelog

All notable changes and fixes to the Theglocal platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

#### Messaging & Notifications

- **Messages Disappearing After Sending** - Fixed state overwrite and race conditions in message loading
  - Added `lastSendTimeRef` to prevent immediate reload after sending
  - Added `optimisticMessagesRef` to track optimistic messages
  - Improved message merging logic to preserve optimistic messages
  - Files: `lib/hooks/use-messages-realtime.ts`
- **Notifications Not Working** - Fixed RLS policy blocking notification creation
  - Updated RLS policy to allow SECURITY DEFINER functions to insert notifications
  - Improved error handling in `notify_direct_message` trigger
  - Added validation checks for conversation, recipient, and sender
  - Files: `supabase/migrations/0134_fix_message_notification_rls.sql`

- **Messages Not Delivering in Real-Time** - Fixed realtime subscription issues
  - Added conversation ID validation before processing messages
  - Improved message sorting and duplicate detection
  - Better status tracking with timeout handling
  - Files: `lib/hooks/use-messages-realtime.ts`

- **Notification Count Disappearing** - Fixed query invalidation causing count reset
  - Added optimistic cache updates for notifications
  - Preserved unread count during refresh
  - Better realtime event handling for INSERT/UPDATE/DELETE
  - Files: `lib/context/notification-context.tsx`

- **Real-time Messages Not Working** - Added polling fallback
  - Added 5-second polling interval when realtime connection fails
  - Improved error handling with fallback to basic message data
  - Connection status tracking to trigger polling automatically
  - Files: `lib/hooks/use-messages-realtime.ts`

- **Messages Not Delivering** - Added retry logic
  - Retry logic with exponential backoff (3 attempts: 1s, 2s, 3s delays)
  - Message delivery verification (checks database after 2 seconds)
  - Pending message tracking to show delivery status
  - Files: `lib/hooks/use-messages-realtime.ts`

- **Notifications Disappearing/Flickering** - Fixed aggressive cache invalidation
  - Reduced aggressive invalidation - removed `onSettled` invalidations
  - Changed to only invalidate summary instead of all queries
  - Increased debounce time from 400ms to 1000ms
  - Files: `lib/context/notification-context.tsx`, `components/notifications/notification-dropdown.tsx`

#### Comments

- **Comment Visibility** - Fixed RLS policy blocking comment visibility
  - Reordered RLS policy to check `author_id` first, then `can_view_post_safe`
  - Fixed CSP errors blocking inline styles
  - Added optimistic comment preservation
  - Files: `supabase/migrations/0119_fix_comment_realtime_visibility.sql`, `middleware.ts`, `next.config.js`, `components/posts/post-comments-section.tsx`

#### Admin & Moderation

- **Admin Reporting System** - Fixed admin actions not working
  - Added missing `resolved_by` and `resolution_note` columns to reports table
  - Extended content type support (users, communities, artists, events, messages)
  - Fixed moderation_log field names (`moderator_id` → `action_by`)
  - Added soft delete support for artists and events
  - Files: `supabase/migrations/0130_fix_reports_columns.sql`, `supabase/migrations/0131_add_is_deleted_to_artists_events.sql`, `app/api/moderation/route.ts`, `components/moderation/report-card.tsx`

#### Code Quality

- **ESLint Warnings** - Fixed various ESLint warnings
  - Fixed Prettier formatting errors
  - Replaced console statements with proper logging
  - Fixed React hooks dependency warnings
  - Fixed TypeScript unsafe any warnings in hooks and utilities
  - Created batch fix script for remaining patterns
  - Files: Multiple files across `lib/`, `app/`, `components/`

#### Database Performance

- **Message Realtime Performance** - Added database indexes
  - Added indexes for message filtering by conversation
  - Added indexes for message_reads lookups
  - Added indexes for unread message queries
  - Added indexes for notification realtime filtering
  - Added indexes for conversation list queries
  - Files: `supabase/migrations/0133_optimize_message_realtime_indexes.sql`

---

## [2025-01-14] - Final Achievement Report

### Added

- Structured logger with Sentry integration (`lib/utils/logger.ts`)
- Cron security middleware (`lib/utils/cron-auth.ts`)
- All 11 cron endpoints secured with `CRON_SECRET` validation
- Dynamic imports for map components (EventMap, CommunityMap, ArtistMap)
- TypeScript CI integration in build process

### Fixed

- Zero TypeScript compilation errors
- Enhanced logger with flexible type system
- Fixed 58 type errors from logger migrations

### Changed

- Build script now includes type-check: `npm run type-check && next build`
- ESLint no-console rule active (prevents new violations)

---

## [2025-01-14] - Session Completion

### Fixed

- Console logging migration (35+ files migrated)
- Cron security (all 11 endpoints secured)
- Stale closures in auth-context.tsx
- TypeScript CI integration
- Aria labels audit (57+ existing labels verified)
- Performance optimizations (dynamic imports, 200KB+ savings)

---

## [2025-11-14] - Platform Audit Implementation

### Added

- 20+ comprehensive documentation guides
- Error boundaries (5 components)
- Web Vitals monitoring
- Performance dashboard
- Optimistic updates (4 hooks)
- Query prefetching
- Accessibility testing (jest-axe)
- ARIA audit checklist
- Test coverage reporting
- Circular dependency detection (0 found!)
- CI/CD pipeline (GitHub Actions)
- Git hooks (Husky + lint-staged)
- Database backup/restore documentation
- Empty state component
- JSDoc standards
- Structured logging setup guide
- Animation performance guide

### Fixed

- Removed critical `any` types + strict ESLint
- Fixed XSS vulnerabilities with DOMPurify
- Complete `.env.example` documentation
- Lazy loading for heavy components
- Performance optimization utilities

---

## [2025-11-13] - Launch Readiness

### Added

- Error tracking & monitoring (Sentry)
- SEO foundation (robots.txt, sitemap)
- Additional launch readiness features

---

## [2025-10-08] - Core Platform Complete

### Added

- Project Foundation & Infrastructure (100% complete)
- Core User Features (100% complete)
- Discovery & Aggregation (100% complete)
- Artist Ecosystem (95% complete)
- Moderation & Governance (73% complete)

---

## Notes

- All fixes are backward compatible
- No breaking changes to existing APIs
- Database migrations are safe to run on production
- For detailed fix documentation, see files in `docs/history/fixes/`

---

_For detailed fix information, refer to the original fix documentation files in `docs/history/fixes/`_
