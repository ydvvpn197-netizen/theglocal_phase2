# Task List: Theglocal MVP Development

**Source PRD:** master_prd.md  
**Generated:** October 7, 2025  
**Target:** Phase 1 MVP (Months 1-3)

---

## Relevant Files

### Configuration & Setup

- `.env.local` - Environment variables for API keys, Supabase credentials, and external services
- `next.config.js` - Next.js configuration with image domains, security headers
- `tailwind.config.ts` - TailwindCSS configuration with custom colors and design tokens
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts
- `.eslintrc.json` - ESLint configuration
- `.prettierrc` - Code formatting rules

### Database & Types

- `supabase/migrations/0001_initial_schema.sql` - Initial database schema for all tables
- `supabase/migrations/0002_rls_policies.sql` - Row Level Security policies
- `supabase/migrations/0003_indexes.sql` - Database indexes for performance
- `supabase/seed.sql` - Seed data for development/testing
- `lib/types/database.types.ts` - TypeScript types generated from Supabase schema
- `lib/types/models.ts` - Application-level type definitions

### Core Libraries

- `lib/supabase/client.ts` - Supabase client configuration
- `lib/supabase/server.ts` - Server-side Supabase client
- `lib/utils/anonymous-id.ts` - Anonymous handle generation logic
- `lib/utils/anonymous-id.test.ts` - Tests for handle generation
- `lib/utils/location.ts` - Location utilities (distance calc, privacy rounding)
- `lib/utils/location.test.ts` - Tests for location utilities
- `lib/utils/validation.ts` - Zod schemas for form validation
- `lib/utils/constants.ts` - App-wide constants
- `lib/context/auth-context.tsx` - Authentication context provider
- `lib/context/location-context.tsx` - Location context provider
- `lib/hooks/use-auth.ts` - Authentication hook
- `lib/hooks/use-location.ts` - Location hook

### Design System

- `components/ui/button.tsx` - Button component (shadcn)
- `components/ui/input.tsx` - Input component (shadcn)
- `components/ui/card.tsx` - Card component (shadcn)
- `components/ui/dialog.tsx` - Dialog/modal component (shadcn)
- `components/ui/avatar.tsx` - Avatar component with anonymous pattern generation
- `components/ui/badge.tsx` - Badge component
- `components/ui/toast.tsx` - Toast notification component
- `components/layout/navbar.tsx` - Main navigation bar
- `components/layout/sidebar.tsx` - Sidebar navigation (desktop)
- `components/layout/mobile-nav.tsx` - Mobile bottom navigation

### Authentication

- `app/auth/signup/page.tsx` - Signup page with OTP
- `app/auth/verify/page.tsx` - OTP verification page
- `app/api/auth/signup/route.ts` - Signup API endpoint
- `app/api/auth/verify-otp/route.ts` - OTP verification endpoint
- `app/api/auth/logout/route.ts` - Logout endpoint
- `components/auth/signup-form.tsx` - Signup form component
- `components/auth/otp-input.tsx` - OTP input component
- `components/auth/location-permission.tsx` - Location permission prompt

### Communities

- `app/communities/page.tsx` - Communities listing page
- `app/communities/[id]/page.tsx` - Individual community page
- `app/communities/create/page.tsx` - Create community page
- `app/api/communities/route.ts` - List/create communities
- `app/api/communities/[id]/route.ts` - Get/update/delete community
- `app/api/communities/[id]/join/route.ts` - Join community
- `app/api/communities/[id]/leave/route.ts` - Leave community
- `components/communities/community-card.tsx` - Community card component
- `components/communities/community-list.tsx` - Community list component
- `components/communities/create-community-form.tsx` - Create community form
- `components/communities/community-header.tsx` - Community header with stats

### Posts & Comments

- `app/api/posts/route.ts` - List/create posts
- `app/api/posts/[id]/route.ts` - Get/update/delete post
- `app/api/posts/[id]/vote/route.ts` - Vote on post
- `app/api/posts/[id]/comments/route.ts` - List/create comments
- `app/api/comments/[id]/route.ts` - Update/delete comment
- `app/api/comments/[id]/vote/route.ts` - Vote on comment
- `components/posts/post-card.tsx` - Post card component
- `components/posts/post-list.tsx` - Post list component
- `components/posts/create-post-form.tsx` - Create post form
- `components/posts/post-detail.tsx` - Full post view
- `components/posts/comment-thread.tsx` - Nested comment thread
- `components/posts/comment-form.tsx` - Comment input form
- `components/posts/vote-buttons.tsx` - Upvote/downvote UI

### Feeds & Discovery

- `app/page.tsx` - Main feed page (home)
- `app/discover/page.tsx` - Discovery feed (news, Reddit, events)
- `app/api/feed/route.ts` - Main feed API (location-based)
- `app/api/discover/route.ts` - Discovery feed aggregator
- `app/api/discover/news/route.ts` - Google News integration
- `app/api/discover/reddit/route.ts` - Reddit API integration
- `lib/integrations/google-news.ts` - Google News API client
- `lib/integrations/google-news.test.ts` - Tests for News API
- `lib/integrations/reddit.ts` - Reddit API client
- `lib/integrations/reddit.test.ts` - Tests for Reddit API
- `components/feed/feed-item.tsx` - Generic feed item component
- `components/feed/news-card.tsx` - News article card
- `components/feed/reddit-card.tsx` - Reddit post card
- `components/feed/feed-filters.tsx` - Feed filter controls

### Polls & Civic Engagement

- `app/api/polls/route.ts` - List/create polls
- `app/api/polls/[id]/route.ts` - Get poll details
- `app/api/polls/[id]/vote/route.ts` - Vote on poll (anonymous)
- `app/api/polls/[id]/results/route.ts` - Get poll results
- `components/polls/create-poll-form.tsx` - Create poll form
- `components/polls/poll-card.tsx` - Poll display with voting
- `components/polls/poll-results.tsx` - Poll results visualization
- `lib/utils/poll-anonymity.ts` - Anonymous voting hash generation
- `lib/utils/poll-anonymity.test.ts` - Tests for poll anonymity

### Events

- `app/events/page.tsx` - Events listing page
- `app/events/[id]/page.tsx` - Event detail page
- `app/api/events/route.ts` - List/create events
- `app/api/events/[id]/route.ts` - Get/update event
- `app/api/events/[id]/rsvp/route.ts` - RSVP to event
- `app/api/events/sync-bookmyshow/route.ts` - BookMyShow sync cron job
- `lib/integrations/bookmyshow.ts` - BookMyShow API client
- `lib/integrations/bookmyshow.test.ts` - Tests for BookMyShow API
- `components/events/event-card.tsx` - Event card component
- `components/events/event-list.tsx` - Event list component
- `components/events/create-event-form.tsx` - Create event form (artists)
- `components/events/rsvp-button.tsx` - RSVP button component

### Artist Platform

- `app/artists/page.tsx` - Artist discovery page
- `app/artists/[id]/page.tsx` - Artist profile page
- `app/artists/register/page.tsx` - Artist registration page
- `app/artists/dashboard/page.tsx` - Artist dashboard
- `app/api/artists/route.ts` - List/create artist profiles
- `app/api/artists/[id]/route.ts` - Get/update artist profile
- `app/api/artists/[id]/subscribe/route.ts` - Handle subscription
- `app/api/artists/subscription-webhook/route.ts` - Razorpay webhook handler
- `lib/integrations/razorpay.ts` - Razorpay SDK integration
- `lib/integrations/razorpay.test.ts` - Tests for payment integration
- `components/artists/artist-card.tsx` - Artist card component
- `components/artists/artist-profile.tsx` - Full artist profile
- `components/artists/artist-portfolio.tsx` - Portfolio image grid
- `components/artists/subscription-form.tsx` - Subscription payment form
- `components/artists/artist-filters.tsx` - Filter artists by category/location

### Booking System

- `app/bookings/page.tsx` - User booking history
- `app/bookings/[id]/page.tsx` - Booking detail with messages
- `app/api/bookings/route.ts` - List/create bookings
- `app/api/bookings/[id]/route.ts` - Get/update booking
- `app/api/bookings/[id]/messages/route.ts` - Booking message thread
- `components/bookings/booking-form.tsx` - Booking request form
- `components/bookings/booking-card.tsx` - Booking card component
- `components/bookings/booking-status.tsx` - Booking status badge
- `components/bookings/booking-messages.tsx` - Message thread UI

### Moderation & Reporting

- `app/api/reports/route.ts` - Create/list reports
- `app/api/reports/[id]/route.ts` - Resolve report
- `app/api/moderation/route.ts` - Moderation actions
- `components/moderation/report-button.tsx` - Report content button
- `components/moderation/report-form.tsx` - Report submission form
- `components/moderation/report-card.tsx` - Report display for admins
- `components/moderation/moderation-log.tsx` - Public moderation log

### Admin Dashboards

- `app/admin/page.tsx` - Super admin dashboard home
- `app/admin/reports/page.tsx` - Reports queue
- `app/admin/users/page.tsx` - User management
- `app/admin/artists/page.tsx` - Artist management
- `app/admin/communities/page.tsx` - Community management
- `app/admin/stats/page.tsx` - Platform statistics
- `app/admin/community/[id]/page.tsx` - Community admin dashboard
- `app/api/admin/reports/route.ts` - Admin reports API
- `app/api/admin/users/[id]/ban/route.ts` - Ban user
- `app/api/admin/stats/route.ts` - Platform stats API
- `components/admin/stats-card.tsx` - Statistics card component
- `components/admin/user-table.tsx` - User management table
- `components/admin/report-queue.tsx` - Report queue component
- `lib/utils/permissions.ts` - Permission checking utilities
- `lib/utils/permissions.test.ts` - Tests for permissions

### Testing & Documentation

- `jest.config.js` - Jest configuration
- `jest.setup.js` - Jest setup file
- `__tests__/integration/auth.test.ts` - Auth integration tests
- `__tests__/integration/communities.test.ts` - Communities integration tests
- `__tests__/e2e/onboarding.spec.ts` - Playwright E2E test for onboarding
- `__tests__/e2e/booking-flow.spec.ts` - Playwright E2E test for booking
- `README.md` - Project documentation
- `DEPLOYMENT.md` - Deployment guide
- `CONTRIBUTING.md` - Contribution guidelines

### Notes

- All component files should have corresponding `.test.tsx` files in the same directory
- API routes should follow REST conventions and include error handling
- Use Zod for all input validation
- Implement rate limiting on all API routes
- Use React Query for data fetching and caching
- Follow atomic design principles for components
- Maintain WCAG 2.1 AA accessibility compliance
- Run `npm test` to execute all Jest tests
- Run `npx playwright test` to execute E2E tests

---

## Tasks

- [x] **1.0 Project Foundation & Infrastructure Setup**
  - [x] 1.1 Initialize Next.js 14 project with TypeScript and App Router
  - [x] 1.2 Install and configure core dependencies (TailwindCSS, shadcn/ui, React Query, React Hook Form, Zod)
  - [x] 1.3 Set up Supabase project (create account, initialize project, get credentials)
  - [x] 1.4 Configure environment variables (.env.local with Supabase URL, anon key, service role key)
  - [x] 1.5 Set up Git repository with proper .gitignore (exclude .env.local, node_modules, .next)
  - [x] 1.6 Configure ESLint, Prettier, and TypeScript compiler options
  - [x] 1.7 Set up testing infrastructure (Jest for unit tests, React Testing Library, Playwright for E2E)
  - [x] 1.8 Create initial database schema migration (all tables: users, communities, posts, comments, polls, artists, bookings, events, reports, moderation_log)
  - [x] 1.9 Implement Row Level Security (RLS) policies for all tables based on privacy requirements
  - [x] 1.10 Create database indexes for performance (location coordinates, timestamps, foreign keys)
  - [x] 1.11 Generate TypeScript types from Supabase schema using CLI
  - [x] 1.12 Set up Supabase client and server utilities (lib/supabase/)
  - [x] 1.13 Implement design system: configure Tailwind with custom colors, spacing, typography
  - [x] 1.14 Install and configure shadcn/ui components (button, input, card, dialog, badge, toast, avatar)
  - [x] 1.15 Create layout components (navbar, sidebar, mobile navigation)
  - [x] 1.16 Implement anonymous avatar generation system (geometric patterns based on user ID hash)
  - [x] 1.17 Set up global styles and theme configuration
  - [x] 1.18 Create utility functions (anonymous ID generator, location utilities, constants)
  - [x] 1.19 Write unit tests for utility functions (anonymous-id.test.ts, location.test.ts)
  - [x] 1.20 Set up development workflow documentation (README.md with setup instructions)

- [ ] **2.0 Core User Features: Authentication, Communities & Content**
  - [ ] 2.1 **Authentication System**
    - [x] 2.1.1 Create signup page with email/phone input (app/auth/signup/page.tsx)
    - [x] 2.1.2 Implement OTP verification page (app/auth/verify/page.tsx)
    - [x] 2.1.3 Build signup API endpoint with Supabase Auth OTP (app/api/auth/signup/route.ts)
    - [x] 2.1.4 Build OTP verification endpoint (app/api/auth/verify-otp/route.ts)
    - [x] 2.1.5 Implement anonymous handle generation on signup (LocalAdjective+Noun+3digits)
    - [x] 2.1.6 Create anonymous handle generator with profanity filter
    - [x] 2.1.7 Build location permission prompt component (request GPS on first login)
    - [x] 2.1.8 Implement manual city selection fallback if GPS denied
    - [x] 2.1.9 Create authentication context provider (lib/context/auth-context.tsx)
    - [x] 2.1.10 Create useAuth hook for accessing auth state
    - [x] 2.1.11 Implement logout endpoint (app/api/auth/logout/route.ts)
    - [x] 2.1.12 Add session persistence (30-day JWT tokens in httpOnly cookies)
    - [x] 2.1.13 Create protected route middleware for authenticated pages
    - [x] 2.1.14 Write integration tests for auth flow (**tests**/integration/auth.test.ts)
  - [ ] 2.2 **Communities**
    - [ ] 2.2.1 Create communities listing page (app/communities/page.tsx)
    - [ ] 2.2.2 Build community card component with stats (members, posts, activity)
    - [ ] 2.2.3 Implement community creation page (app/communities/create/page.tsx)
    - [ ] 2.2.4 Build create community form with validation (name, description, location)
    - [ ] 2.2.5 Create API endpoint for listing communities (GET /api/communities) with location filtering
    - [ ] 2.2.6 Create API endpoint for creating community (POST /api/communities)
    - [ ] 2.2.7 Ensure community creator auto-becomes admin (insert into community_members with role='admin')
    - [ ] 2.2.8 Build individual community page (app/communities/[id]/page.tsx)
    - [ ] 2.2.9 Implement community header with stats, join/leave button, admin badge
    - [ ] 2.2.10 Create join community endpoint (POST /api/communities/[id]/join)
    - [ ] 2.2.11 Create leave community endpoint (DELETE /api/communities/[id]/leave)
    - [ ] 2.2.12 Implement community post feed on community page
    - [ ] 2.2.13 Add community search and filter functionality (by location, member count, recent activity)
    - [ ] 2.2.14 Display community rules/guidelines on community page
    - [ ] 2.2.15 Write unit tests for community components
    - [ ] 2.2.16 Write integration tests for community CRUD operations
  - [ ] 2.3 **Posts & Comments**
    - [ ] 2.3.1 Create post card component (title, body, image, author, metadata, vote counts)
    - [ ] 2.3.2 Build create post form (title, body, image upload, community selector)
    - [ ] 2.3.3 Implement image upload to Supabase Storage with size validation (max 5MB)
    - [ ] 2.3.4 Create API endpoint for creating post (POST /api/posts) with location metadata
    - [ ] 2.3.5 Create API endpoint for listing posts (GET /api/posts) with pagination
    - [ ] 2.3.6 Build post detail page (app/posts/[id]/page.tsx or modal)
    - [ ] 2.3.7 Implement comment thread component with nested replies (max 2 levels)
    - [ ] 2.3.8 Create comment form component
    - [ ] 2.3.9 Build API endpoint for creating comment (POST /api/posts/[id]/comments)
    - [ ] 2.3.10 Build API endpoint for listing comments (GET /api/posts/[id]/comments)
    - [ ] 2.3.11 Implement edit post functionality (within 10 minutes of creation)
    - [ ] 2.3.12 Implement delete post/comment (replace with "[deleted]" placeholder)
    - [ ] 2.3.13 Add "edited" indicator with timestamp on edited content
    - [ ] 2.3.14 Create vote buttons component (upvote/downvote UI)
    - [ ] 2.3.15 Build voting endpoint (POST /api/posts/[id]/vote) with one-vote-per-user validation
    - [ ] 2.3.16 Build comment voting endpoint (POST /api/comments/[id]/vote)
    - [ ] 2.3.17 Update vote counts in real-time (optimistic updates)
    - [ ] 2.3.18 Implement infinite scroll pagination for posts
    - [ ] 2.3.19 Add loading states and error handling
    - [ ] 2.3.20 Write unit tests for post/comment components
    - [ ] 2.3.21 Write integration tests for post CRUD and voting
  - [ ] 2.4 **Location-Based Main Feed**
    - [ ] 2.4.1 Create main feed page (app/page.tsx)
    - [ ] 2.4.2 Implement location context provider (lib/context/location-context.tsx)
    - [ ] 2.4.3 Build feed API endpoint (GET /api/feed) that aggregates posts from joined communities
    - [ ] 2.4.4 Implement location filtering logic (filter by city/region based on user location)
    - [ ] 2.4.5 Add sort options: Recent (default), Popular (by upvote ratio)
    - [ ] 2.4.6 Create feed filter controls component (location radius: 5km, 10km, 25km, 50km, city-wide)
    - [ ] 2.4.7 Implement location radius indicator at top of feed
    - [ ] 2.4.8 Add infinite scroll with 20 posts per page
    - [ ] 2.4.9 Implement manual refresh functionality
    - [ ] 2.4.10 Add empty state message when no content available
    - [ ] 2.4.11 Optimize feed query performance with proper indexes
    - [ ] 2.4.12 Write integration tests for feed filtering and sorting

- [ ] **3.0 Discovery & Aggregation: Feeds, News & Events**
  - [ ] 3.1 **Discovery Feed UI**
    - [ ] 3.1.1 Create discovery page (app/discover/page.tsx)
    - [ ] 3.1.2 Build unified feed component for mixed content (news, Reddit, events)
    - [ ] 3.1.3 Create news card component with source attribution
    - [ ] 3.1.4 Create Reddit post card component with subreddit info
    - [ ] 3.1.5 Implement "Share to Community" button on discovery items
    - [ ] 3.1.6 Build share dialog (select community, pre-filled title/link)
    - [ ] 3.1.7 Add content type badges (News, Reddit, Event)
    - [ ] 3.1.8 Implement loading skeletons for discovery feed
  - [ ] 3.2 **Google News API Integration**
    - [ ] 3.2.1 Register for Google News API key (newsapi.org)
    - [ ] 3.2.2 Add API key to environment variables
    - [ ] 3.2.3 Create Google News API client (lib/integrations/google-news.ts)
    - [ ] 3.2.4 Implement news fetching by location (country, region, city)
    - [ ] 3.2.5 Build news API endpoint (GET /api/discover/news) with location param
    - [ ] 3.2.6 Implement caching strategy (15-minute TTL) to respect rate limits
    - [ ] 3.2.7 Add error handling for API failures (graceful degradation)
    - [ ] 3.2.8 Parse and transform news data to unified format
    - [ ] 3.2.9 Write unit tests for Google News client (google-news.test.ts)
  - [ ] 3.3 **Reddit API Integration**
    - [ ] 3.3.1 Set up Reddit API credentials (OAuth app)
    - [ ] 3.3.2 Add Reddit API credentials to environment variables
    - [ ] 3.3.3 Create Reddit API client (lib/integrations/reddit.ts)
    - [ ] 3.3.4 Implement location-based subreddit selection logic
    - [ ] 3.3.5 Fetch hot/trending posts from local subreddits
    - [ ] 3.3.6 Build Reddit API endpoint (GET /api/discover/reddit) with caching
    - [ ] 3.3.7 Implement rate limiting (60 req/min) and caching
    - [ ] 3.3.8 Parse Reddit JSON response to unified format
    - [ ] 3.3.9 Add error handling and fallback content
    - [ ] 3.3.10 Write unit tests for Reddit client (reddit.test.ts)
  - [ ] 3.4 **Discovery Feed Aggregation**
    - [ ] 3.4.1 Create discovery aggregator endpoint (GET /api/discover)
    - [ ] 3.4.2 Fetch and merge content from News, Reddit, and Events APIs
    - [ ] 3.4.3 Implement unified content interface for mixed feed
    - [ ] 3.4.4 Add smart sorting (mix of recency, relevance, content type diversity)
    - [ ] 3.4.5 Implement pagination for aggregated feed
    - [ ] 3.4.6 Add content deduplication logic
    - [ ] 3.4.7 Write integration tests for discovery aggregation
  - [ ] 3.5 **Share External Content**
    - [ ] 3.5.1 Build share-to-community endpoint (POST /api/discover/share)
    - [ ] 3.5.2 Create post with external link and metadata
    - [ ] 3.5.3 Implement link preview generation (title, description, image)
    - [ ] 3.5.4 Add source attribution to shared posts
    - [ ] 3.5.5 Write tests for sharing functionality

  - [ ] 3.6 **Polls & Civic Engagement**
    - [ ] 3.6.1 Create poll card component with voting UI
    - [ ] 3.6.2 Build create poll form (question, 2-10 options, expiry date, category)
    - [ ] 3.6.3 Add poll category selector (Infrastructure, Safety, Events, Environment, General)
    - [ ] 3.6.4 Implement government authority tagging field (symbolic, text only)
    - [ ] 3.6.5 Create poll creation endpoint (POST /api/polls) with location metadata
    - [ ] 3.6.6 Build poll listing endpoint (GET /api/polls) with location filtering
    - [ ] 3.6.7 Implement anonymous voting hash generation (lib/utils/poll-anonymity.ts)
    - [ ] 3.6.8 Create poll voting endpoint (POST /api/polls/[id]/vote) with anonymity guarantee
    - [ ] 3.6.9 Ensure one vote per user using anonymous hash (no user-vote association stored)
    - [ ] 3.6.10 Build poll results endpoint (GET /api/polls/[id]/results)
    - [ ] 3.6.11 Create poll results visualization component (percentage bars)
    - [ ] 3.6.12 Implement real-time vote count updates
    - [ ] 3.6.13 Add poll expiry logic (disable voting after expiry, show final results)
    - [ ] 3.6.14 Display tagged authorities on poll card
    - [ ] 3.6.15 Implement poll search by location and category
    - [ ] 3.6.16 Write unit tests for poll anonymity utilities (poll-anonymity.test.ts)
    - [ ] 3.6.17 Write integration tests for poll creation and voting

  - [ ] 3.7 **BookMyShow Events Integration**
    - [ ] 3.7.1 Set up BookMyShow API partnership/credentials
    - [ ] 3.7.2 Add BookMyShow API credentials to environment variables
    - [ ] 3.7.3 Create BookMyShow API client (lib/integrations/bookmyshow.ts)
    - [ ] 3.7.4 Implement event fetching by city and category
    - [ ] 3.7.5 Create events listing page (app/events/page.tsx)
    - [ ] 3.7.6 Build event card component (title, date, location, image, source badge)
    - [ ] 3.7.7 Create event detail page (app/events/[id]/page.tsx)
    - [ ] 3.7.8 Build events API endpoint (GET /api/events) merging BookMyShow + artist events
    - [ ] 3.7.9 Implement cron job endpoint for syncing BookMyShow events (GET /api/events/sync-bookmyshow)
    - [ ] 3.7.10 Set up Vercel cron job to run sync every 6 hours
    - [ ] 3.7.11 Add event filters (date, category, location radius)
    - [ ] 3.7.12 Implement RSVP button component
    - [ ] 3.7.13 Create RSVP endpoint (POST /api/events/[id]/rsvp)
    - [ ] 3.7.14 Display RSVP count in real-time
    - [ ] 3.7.15 Add event discussion thread (use existing comment system)
    - [ ] 3.7.16 Write unit tests for BookMyShow client (bookmyshow.test.ts)
    - [ ] 3.7.17 Write integration tests for event syncing and RSVP

- [ ] **4.0 Artist Ecosystem: Profiles, Subscriptions & Booking**
  - [ ] 4.1 **Artist Registration & Profiles**
    - [ ] 4.1.1 Create artist registration page (app/artists/register/page.tsx)
    - [ ] 4.1.2 Build multi-step artist registration form (stage name, category, description, location)
    - [ ] 4.1.3 Add service category dropdown (Musician, DJ, Photographer, Videographer, Makeup Artist, Dancer, Comedian, Chef, Artist, Other)
    - [ ] 4.1.4 Implement portfolio image uploader (max 10 images, 5MB each)
    - [ ] 4.1.5 Add rate range input (min and max)
    - [ ] 4.1.6 Create artist registration endpoint (POST /api/artists)
    - [ ] 4.1.7 Store artist profile with initial status "trial"
    - [ ] 4.1.8 Build artist profile page (app/artists/[id]/page.tsx)
    - [ ] 4.1.9 Create artist profile component with portfolio grid
    - [ ] 4.1.10 Display artist stats (profile views, rating, bookings)
    - [ ] 4.1.11 Build artist discovery page (app/artists/page.tsx)
    - [ ] 4.1.12 Create artist card component for discovery
    - [ ] 4.1.13 Implement artist filters (location, category, rating, rate range)
    - [ ] 4.1.14 Build artist search functionality
    - [ ] 4.1.15 Write unit tests for artist components
  - [ ] 4.2 **Razorpay Subscription Integration**
    - [ ] 4.2.1 Set up Razorpay account and get API keys
    - [ ] 4.2.2 Add Razorpay key_id and key_secret to environment variables
    - [ ] 4.2.3 Install Razorpay SDK (npm install razorpay)
    - [ ] 4.2.4 Create Razorpay client wrapper (lib/integrations/razorpay.ts)
    - [ ] 4.2.5 Create subscription plan in Razorpay (₹500/month)
    - [ ] 4.2.6 Build subscription form component with Razorpay checkout
    - [ ] 4.2.7 Create subscription endpoint (POST /api/artists/[id]/subscribe)
    - [ ] 4.2.8 Implement 30-day free trial logic (card required but not charged)
    - [ ] 4.2.9 Activate artist profile immediately after trial initiation
    - [ ] 4.2.10 Set up Razorpay webhook endpoint (POST /api/artists/subscription-webhook)
    - [ ] 4.2.11 Verify webhook signature for security
    - [ ] 4.2.12 Handle subscription events (payment.success, payment.failed, subscription.cancelled)
    - [ ] 4.2.13 Update artist subscription_status based on webhook events
    - [ ] 4.2.14 Implement profile visibility logic (active when subscription current, hidden after 15-day grace period)
    - [ ] 4.2.15 Send email reminders 3 days before subscription renewal
    - [ ] 4.2.16 Build artist dashboard (app/artists/dashboard/page.tsx)
    - [ ] 4.2.17 Display subscription status and next billing date on dashboard
    - [ ] 4.2.18 Write unit tests for Razorpay integration (razorpay.test.ts)
    - [ ] 4.2.19 Write integration tests for subscription flow
  - [ ] 4.3 **Artist Events**
    - [ ] 4.3.1 Create artist event creation page (app/artists/dashboard/events/create/page.tsx)
    - [ ] 4.3.2 Build create event form (title, date/time, location, description, category, ticket info)
    - [ ] 4.3.3 Create event creation endpoint (POST /api/events) restricted to subscribed artists
    - [ ] 4.3.4 Validate artist has active subscription before event creation
    - [ ] 4.3.5 Display artist events on artist profile
    - [ ] 4.3.6 Add edit/delete functionality for artist's own events
    - [ ] 4.3.7 Write tests for artist event creation
  - [ ] 4.4 **Booking System**
    - [ ] 4.4.1 Create booking form component (event date, type, location, budget, message)
    - [ ] 4.4.2 Add "Request Booking" button on artist profile
    - [ ] 4.4.3 Build booking creation endpoint (POST /api/bookings)
    - [ ] 4.4.4 Send notification to artist on new booking request
    - [ ] 4.4.5 Create bookings listing page (app/bookings/page.tsx)
    - [ ] 4.4.6 Build booking card component showing status
    - [ ] 4.4.7 Create booking detail page (app/bookings/[id]/page.tsx)
    - [ ] 4.4.8 Implement booking status update endpoint (PUT /api/bookings/[id])
    - [ ] 4.4.9 Add status options: Pending, Accepted, Declined, Info Requested, Completed
    - [ ] 4.4.10 Build booking message thread UI
    - [ ] 4.4.11 Create booking message endpoint (POST /api/bookings/[id]/messages)
    - [ ] 4.4.12 Implement notifications for booking status changes
    - [ ] 4.4.13 Add booking history view for users and artists
    - [ ] 4.4.14 Display booking statistics on artist dashboard
    - [ ] 4.4.15 Write integration tests for booking flow (**tests**/e2e/booking-flow.spec.ts)

- [ ] **5.0 Moderation, Admin Dashboards & Governance Tools**
  - [ ] 5.1 **Content Reporting**
    - [ ] 5.1.1 Create report button component (on posts, comments, polls)
    - [ ] 5.1.2 Build report form with reason categories (Spam, Harassment, Misinformation, Violence, NSFW, Other)
    - [ ] 5.1.3 Add optional additional context field (max 200 chars)
    - [ ] 5.1.4 Create report submission endpoint (POST /api/reports)
    - [ ] 5.1.5 Store report with content reference and reporter (anonymized)
    - [ ] 5.1.6 Keep reported content visible (no auto-hide in MVP)
    - [ ] 5.1.7 Send notification to community admin and super admin
    - [ ] 5.1.8 Implement rate limiting on reports (prevent spam reporting)
    - [ ] 5.1.9 Write tests for reporting functionality
  - [ ] 5.2 **Community Admin Dashboard**
    - [ ] 5.2.1 Create community admin dashboard page (app/admin/community/[id]/page.tsx)
    - [ ] 5.2.2 Add access control (only community admins can access)
    - [ ] 5.2.3 Build report queue component for community-specific reports
    - [ ] 5.2.4 Create report card showing content preview, reporter reason, timestamp
    - [ ] 5.2.5 Add action buttons: Remove Content, Dismiss Report, View in Context
    - [ ] 5.2.6 Implement content removal with reason selection
    - [ ] 5.2.7 Replace removed content with "[removed by moderator]" placeholder
    - [ ] 5.2.8 Create moderation action endpoint (POST /api/moderation)
    - [ ] 5.2.9 Log all moderation actions to moderation_log table
    - [ ] 5.2.10 Send notification to content author on removal
    - [ ] 5.2.11 Display community statistics (members, posts, reports, growth)
    - [ ] 5.2.12 Add community info editing functionality
    - [ ] 5.2.13 Show list of community members
    - [ ] 5.2.14 Write tests for community admin actions
  - [ ] 5.3 **Super Admin Dashboard**
    - [ ] 5.3.1 Create super admin dashboard home (app/admin/page.tsx)
    - [ ] 5.3.2 Add super admin access control middleware
    - [ ] 5.3.3 Build platform statistics page (app/admin/stats/page.tsx)
    - [ ] 5.3.4 Display key metrics: DAU, MAU, posts/day, active communities, subscribed artists
    - [ ] 5.3.5 Create stats API endpoint (GET /api/admin/stats)
    - [ ] 5.3.6 Build reports queue page (app/admin/reports/page.tsx)
    - [ ] 5.3.7 Show all reports platform-wide with filtering (by status, type, date)
    - [ ] 5.3.8 Add bulk action support (select multiple reports, resolve all)
    - [ ] 5.3.9 Create user management page (app/admin/users/page.tsx)
    - [ ] 5.3.10 Build user table with search and filter
    - [ ] 5.3.11 Add user actions: View Details, Warn, Temporary Ban, Permanent Ban
    - [ ] 5.3.12 Create user ban endpoint (PUT /api/admin/users/[id]/ban)
    - [ ] 5.3.13 Implement ban appeal system (form for users to appeal)
    - [ ] 5.3.14 Create artist management page (app/admin/artists/page.tsx)
    - [ ] 5.3.15 Add artist actions: Approve, Suspend, Manual Refund, View Subscription
    - [ ] 5.3.16 Build communities management page (app/admin/communities/page.tsx)
    - [ ] 5.3.17 Add community actions: Feature, Unfeature, Remove, View Reports
    - [ ] 5.3.18 Create API integration health monitoring dashboard
    - [ ] 5.3.19 Display status of Google News, Reddit, BookMyShow APIs
    - [ ] 5.3.20 Write tests for admin dashboard functionality
  - [ ] 5.4 **Transparent Moderation Log**
    - [ ] 5.4.1 Create public moderation log page (app/communities/[id]/moderation-log/page.tsx)
    - [ ] 5.4.2 Build moderation log table component
    - [ ] 5.4.3 Display: action type, content type, reason, timestamp (no user identities)
    - [ ] 5.4.4 Add filters: date range, action type, content type
    - [ ] 5.4.5 Implement privacy-preserving log display (anonymize all parties)
    - [ ] 5.4.6 Create global moderation log (app/transparency/moderation/page.tsx)
    - [ ] 5.4.7 Add export functionality (CSV download)
    - [ ] 5.4.8 Write tests for moderation log visibility
  - [ ] 5.5 **Governance & Transparency Features**
    - [ ] 5.5.1 Create platform transparency dashboard (app/transparency/page.tsx)
    - [ ] 5.5.2 Build public stats page (app/transparency/stats/page.tsx)
    - [ ] 5.5.3 Display aggregated metrics: total users, communities, posts, artists
    - [ ] 5.5.4 Create moderation transparency page (app/transparency/moderation/page.tsx)
    - [ ] 5.5.5 Show: reports filed, actions taken, response times, appeal outcomes
    - [ ] 5.5.6 Build privacy metrics page (app/transparency/privacy/page.tsx)
    - [ ] 5.5.7 Display: deletion requests processed, account deletions, data breaches (if any)
    - [ ] 5.5.8 Create moderation guidelines public page
    - [ ] 5.5.9 Document content policy with examples
    - [ ] 5.5.10 Explain appeal process clearly
    - [ ] 5.5.11 Write tests for transparency pages

- [ ] **6.0 Polish, Testing & Launch Preparation**
  - [ ] 6.1 **Performance Optimization**
    - [ ] 6.1.1 Implement image optimization (WebP format, lazy loading, responsive srcsets)
    - [ ] 6.1.2 Add code splitting for route-based chunks
    - [ ] 6.1.3 Optimize database queries with proper indexes
    - [ ] 6.1.4 Implement React Query caching strategies (stale-while-revalidate)
    - [ ] 6.1.5 Add service worker for offline support (optional)
    - [ ] 6.1.6 Measure and optimize Core Web Vitals (LCP, FID, CLS)
    - [ ] 6.1.7 Run Lighthouse audits and fix issues
  - [ ] 6.2 **Security Hardening**
    - [ ] 6.2.1 Implement rate limiting on all API routes (100 req/min per user)
    - [ ] 6.2.2 Add CSRF protection
    - [ ] 6.2.3 Configure security headers (CSP, X-Frame-Options, etc.)
    - [ ] 6.2.4 Audit RLS policies for privacy leaks
    - [ ] 6.2.5 Run OWASP Top 10 vulnerability scan
    - [ ] 6.2.6 Implement input sanitization on all user inputs
    - [ ] 6.2.7 Test XSS and SQL injection prevention
    - [ ] 6.2.8 Verify location data privacy (city-level only in public APIs)
    - [ ] 6.2.9 Audit third-party dependencies for vulnerabilities
  - [ ] 6.3 **Comprehensive Testing**
    - [ ] 6.3.1 Write E2E test for complete onboarding flow (**tests**/e2e/onboarding.spec.ts)
    - [ ] 6.3.2 Write E2E test for post creation → comment → vote
    - [ ] 6.3.3 Write E2E test for artist registration → booking flow
    - [ ] 6.3.4 Write E2E test for moderation workflow
    - [ ] 6.3.5 Achieve 80%+ unit test coverage
    - [ ] 6.3.6 Run integration tests for all critical paths
    - [ ] 6.3.7 Perform load testing (1000 concurrent users)
    - [ ] 6.3.8 Test on multiple browsers (Chrome, Firefox, Safari, Edge)
    - [ ] 6.3.9 Test on mobile devices (iOS, Android)
    - [ ] 6.3.10 Test accessibility with screen reader
  - [ ] 6.4 **Documentation**
    - [ ] 6.4.1 Update README.md with setup instructions
    - [ ] 6.4.2 Create DEPLOYMENT.md with deployment guide
    - [ ] 6.4.3 Write CONTRIBUTING.md for future contributors
    - [ ] 6.4.4 Document all API endpoints in API.md
    - [ ] 6.4.5 Create architecture diagram
    - [ ] 6.4.6 Document database schema with ER diagram
    - [ ] 6.4.7 Write privacy policy page (app/privacy/page.tsx)
    - [ ] 6.4.8 Write terms of service page (app/terms/page.tsx)
    - [ ] 6.4.9 Create user guide / FAQ page
  - [ ] 6.5 **Deployment & Monitoring**
    - [ ] 6.5.1 Set up Vercel project and connect GitHub repo
    - [ ] 6.5.2 Configure production environment variables
    - [ ] 6.5.3 Set up Supabase production database
    - [ ] 6.5.4 Run database migrations on production
    - [ ] 6.5.5 Configure custom domain (if available)
    - [ ] 6.5.6 Set up Sentry for error tracking
    - [ ] 6.5.7 Configure Vercel Analytics
    - [ ] 6.5.8 Set up Posthog for privacy-friendly analytics
    - [ ] 6.5.9 Configure Razorpay webhook URL for production
    - [ ] 6.5.10 Set up uptime monitoring (Vercel or external)
    - [ ] 6.5.11 Create staging environment for pre-production testing
    - [ ] 6.5.12 Set up CI/CD pipeline (GitHub Actions)
    - [ ] 6.5.13 Configure automated testing in CI
    - [ ] 6.5.14 Set up database backup verification
  - [ ] 6.6 **Beta Launch**
    - [ ] 6.6.1 Create landing page for beta signup
    - [ ] 6.6.2 Invite 100 beta users
    - [ ] 6.6.3 Set up user feedback mechanism (in-app + email)
    - [ ] 6.6.4 Monitor key metrics daily (DAU, posts, errors)
    - [ ] 6.6.5 Conduct user interviews for feedback
    - [ ] 6.6.6 Fix critical bugs reported by beta users
    - [ ] 6.6.7 Iterate on UX based on feedback
    - [ ] 6.6.8 Prepare for public launch

---

## Implementation Priority

**Sprint 1-2 (Weeks 1-4):** Tasks 1.0 (Foundation)  
**Sprint 3-4 (Weeks 5-8):** Tasks 2.1-2.4 (Auth, Communities, Posts, Feed)  
**Sprint 5-6 (Weeks 9-12):** Tasks 3.0 (Discovery, News, Polls, Events)  
**Sprint 7-8 (Weeks 13-16):** Tasks 4.0 (Artists, Subscriptions, Booking)  
**Sprint 9-10 (Weeks 17-20):** Tasks 5.0 + 6.0 (Moderation, Admin, Polish, Launch)

---

## Notes for Developers

### Architecture Principles

- **Privacy First:** Never expose PII in API responses, use city-level location only
- **Anonymity:** User identity must be unlinkable across communities
- **Transparency:** All moderation actions logged publicly (privacy-preserving)
- **Performance:** Optimize for mobile 4G connections, <3s page load
- **Security:** Implement RLS on all tables, rate limiting on all routes

### Code Standards

- Use TypeScript strictly (no `any` types)
- Validate all inputs with Zod schemas
- Implement error boundaries for React components
- Use React Query for all data fetching
- Follow atomic design: atoms → molecules → organisms
- Write tests alongside implementation (TDD encouraged)
- Maintain WCAG 2.1 AA accessibility compliance

### Database Best Practices

- Always use RLS policies for access control
- Never expose raw coordinates (round to 0.01° ~1km)
- Use geography type for location data
- Index all foreign keys and frequently queried fields
- Use transactions for multi-step operations

### API Route Patterns

- Use Next.js App Router route handlers
- Implement proper error handling with status codes
- Return consistent JSON structure: `{ data, error, message }`
- Add rate limiting middleware on all routes
- Log all errors to monitoring service

### Testing Requirements

- Unit tests for all utilities and complex logic
- Component tests for all UI components
- Integration tests for API routes
- E2E tests for critical user flows
- Aim for 80%+ code coverage

### External API Integration Guidelines

- Always implement caching (15min TTL minimum)
- Graceful degradation if API is down
- Respect rate limits strictly
- Transform external data to unified internal format
- Mock API responses in tests

---

**Total Tasks:** 320+ actionable sub-tasks organized into 5 major phases  
**Estimated Timeline:** 20 weeks (5 months) for MVP completion  
**Team Size:** 2-3 full-stack developers + 1 designer

**Ready to start implementation!** Begin with Task 1.0 (Foundation) and proceed sequentially through the sprints.
