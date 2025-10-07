# Master PRD: Theglocal - Privacy-First Local Community & Creator Platform

**Version:** 2.0  
**Last Updated:** October 7, 2025  
**Status:** Ready for Development

---

## 📋 Executive Summary

**Theglocal** is a privacy-first, hyper-local digital public square designed to be the virtual town square for communities everywhere. We combine the community engagement of Reddit, the event discovery of BookMyShow, and civic participation tools—all while maintaining user anonymity as a first-class feature.

**Mission:** Empower local populations to connect, share, engage, and organize without compromising their identity or privacy.

**Core Pillars:**
1. **Privacy & Anonymity:** No real names, no tracking, no compromises
2. **Hyper-Local Discovery:** Location-aware content that matters to your neighborhood  
3. **Community Governance:** Self-moderated spaces with transparent rules
4. **Creator Economy:** Affordable platform for local artists (₹500/month) to reach audiences
5. **Civic Engagement:** Tools for community polls and local issue discussion

**Core Value Proposition:**
- **For Users:** Anonymously engage with your community, discover local news/events, participate in civic discussions
- **For Artists:** Low-cost visibility (₹500/month), direct booking system, local audience reach
- **For Communities:** Self-governed spaces with transparent moderation and civic tools
- **For Society:** Digital public square that strengthens local democracy and community bonds

---

## 🎯 Product Goals

### Primary Goals
1. Launch a scalable MVP with core features: Communities, News Feed, and Artist Booking
2. Maintain user anonymity as a first-class feature across all interactions
3. Provide seamless location-based content discovery from first launch
4. Enable local artists to monetize their services through a simple subscription model
5. Build a sustainable moderation system via community admins and platform super admins

### Success Metrics

**User Growth & Engagement:**
- **Primary:** 10K+ active users in first 3 months across 3 pilot cities
- **DAU/MAU Ratio:** 30%+ (healthy daily engagement)
- **User Retention:** 60%+ Day 7 retention, 40%+ Day 30 retention
- **Weekly Active Users:** 50%+ of registered users active weekly
- **Avg Session Duration:** 10+ minutes per session
- **Posts/Comments:** Avg 10+ interactions per user/week

**Community Vitality:**
- **Communities Created:** 100+ communities across pilot cities
- **Avg Community Size:** 50+ members per active community
- **Community Engagement:** 5+ posts per community per day
- **Poll Participation:** 30%+ of community members vote on polls
- **Cross-Community Participation:** Users join 3+ communities on average

**Artist Ecosystem:**
- **Artist Adoption:** 100+ subscribed artists in first 3 months
- **Artist Distribution:** Coverage across all service categories
- **Profile Quality:** 80%+ artists have complete profiles (10 images, description)
- **Artist Retention:** 70%+ monthly subscription renewal rate
- **Event Creation:** 3+ events per artist per month

**Booking & Monetization:**
- **Booking Requests:** 50+ per month by month 3
- **Booking Conversion:** 30%+ of requests result in accepted bookings
- **Avg Booking Value:** ₹5,000+ per booking
- **Artist Revenue:** Artists earn 10x their subscription cost on average
- **Platform GMV:** ₹500K+ in facilitated bookings by month 6

**Content Discovery:**
- **News Feed Usage:** 70%+ users check news/discovery feed weekly
- **External Content Shares:** 20+ news/Reddit posts shared to communities daily
- **Event Discovery:** 40%+ users view events feed monthly
- **RSVP Rate:** 15%+ of event viewers RSVP

**Content Health & Safety:**
- **Content Removal Rate:** <5% of total content
- **Moderation Response Time:** <24 hours for 90%+ of reports
- **False Report Rate:** <10% of reports dismissed
- **Appeal Success Rate:** <20% (indicates good initial moderation)
- **User Ban Rate:** <0.5% of users banned

**Privacy & Trust:**
- **Location Permission Grant:** 80%+ users grant location access
- **Account Deletion Rate:** <2% per month (healthy churn)
- **Privacy Concerns:** <1% users report privacy issues
- **Data Breach Incidents:** 0 (absolute requirement)
- **Transparency Report Views:** 1000+ views per quarter

---

## 👥 User Personas

### 1. Anonymous Resident (Primary User)
**Needs:** Stay informed about local news, participate in discussions without revealing identity, discover local events and services

**Pain Points:** Lack of local community spaces, privacy concerns on traditional social media, difficulty finding local services

**Key Behaviors:** Lurking before posting, location-aware browsing, quick anonymous interactions

### 2. Community Admin
**Needs:** Tools to create and moderate communities, manage members, handle reported content

**Pain Points:** Time-consuming moderation, unclear escalation paths, lack of co-admin support

**Key Behaviors:** Regular moderation checks, community guideline enforcement, member approval

### 3. Local Artist/Creator
**Needs:** Affordable platform visibility, booking management, event promotion, direct user engagement

**Pain Points:** High platform fees elsewhere, difficulty reaching local audiences, lack of digital presence

**Key Behaviors:** Profile optimization, event creation, responding to bookings, portfolio updates

### 4. Platform Super Admin
**Needs:** System-wide visibility, escalation handling, payment/subscription management, platform health monitoring

**Pain Points:** Scaling moderation, handling edge cases, balancing free expression with safety

**Key Behaviors:** Dashboard monitoring, policy enforcement, integration management, dispute resolution

---

## 🚀 MVP Feature Scope

### Phase 1: Core MVP (Months 1-3)

#### ✅ Must Have (P0)

**1. User Authentication & Identity**
- Email/phone OTP-based signup (no social login in MVP)
- Auto-generated anonymous display ID (format: "LocalPanda123")
- Basic profile: anonymous handle, avatar, join date
- Location permission request on first launch (with manual fallback)
- Zero PII (Personally Identifiable Information) stored in profiles
- Privacy-first onboarding flow explaining anonymity benefits

**2. Communities**
- Create community (public only in MVP)
- Join/leave community (instant, no approval needed in MVP)
- Community creator auto-becomes admin
- Community page with post feed
- Basic community info (name, description, member count, created date)
- Community rules/guidelines display
- Transparent moderation log (visible to members)

**3. Posts & Comments**
- Create text post within community
- Single image upload per post (optional)
- Comment on posts (nested up to 2 levels)
- Basic reactions (upvote/downvote)
- Report post/comment functionality
- Location metadata on all posts
- Edit history indicator for transparency

**4. Location-Based Feed**
- Main feed showing posts from joined communities
- Auto-filtered by user location (city/region level)
- Sort by: Recent, Popular (by upvotes), Trending
- Infinite scroll pagination
- Privacy: city-level accuracy only, never precise GPS in public data

**5. News & Content Aggregation**
- **Google News API** integration for local headlines
- **Reddit API** integration for trending community discussions
- Fetch content based on user location
- Display in unified "Discover" feed with source attribution
- Click to read full article (external link)
- Share news/posts as post to community
- Content refresh every 15 minutes with caching

**6. Polls & Civic Engagement** *(Moved to MVP for civic value)*
- Create polls (single-choice and multiple-choice)
- Vote on polls anonymously
- View real-time poll results
- Set poll expiry dates
- Tag government authorities symbolically (name/handle only)
- Location-based poll discovery
- Poll categories: Infrastructure, Safety, Events, General

**7. Artist Platform**
- Artist account creation (separate from regular user)
- Public artist profile: name, service category, description, portfolio (max 10 images), location, rate range
- Service categories: Musician, DJ, Photographer, Videographer, Makeup Artist, Dancer, Comedian, Chef, Artist, Other
- Monthly subscription: ₹500/month via Razorpay
- 7-day free trial (card required but not charged)
- Profile visibility: active only when subscription is current
- Basic artist discovery page with filters (location, category, rating)

**8. Events Discovery**
- **BookMyShow API** integration for local events
- Artists can create custom event pages (title, date, location, description)
- Event discussion threads (community feature)
- Event RSVP/interest indicator
- Combined feed: BookMyShow events + artist-created events

**9. Booking System**
- Send booking request to artist (includes: date, event type, budget, message)
- Artist receives notification of booking request
- Simple booking status: Pending, Accepted, Declined, Info Requested
- In-app messaging for booking discussion (async only, no real-time)
- Booking history for users and artists
- Payment coordination off-platform (MVP scope)

**10. Moderation System**
- Report button on posts/comments with reason categories
- Flagged content appears in admin dashboard (remains visible to users)
- Community admin dashboard: view reports, remove content, dismiss report
- Super admin dashboard: all reports, global actions, user/artist management
- Transparent action log (publicly visible, privacy-preserving)
- Moderation guidelines publicly accessible

**11. Super Admin Dashboard**
- View all users, artists, communities
- Manage subscription status manually
- Access all reports and take action
- Ban users platform-wide (with appeal process)
- Feature/unfeature communities
- Monitor API integration health (Google News, Reddit, BookMyShow)
- Platform health metrics and analytics

---

### Phase 2: Enhanced Features (Months 4-6)

#### 🎯 Should Have (P1)

**12. Anonymous Chat & Messaging**
- 1-on-1 anonymous DMs
- Group chats within communities
- Ephemeral message options (auto-delete after read/24h)
- Messages follow user's anonymity settings
- Chat moderation and reporting
- Rate limiting to prevent spam (50 messages/day)

**13. Enhanced Communities**
- Private communities with join approval workflow
- Add/remove co-admins
- Enhanced community rules/guidelines editor
- Pin important posts to top
- Community categories/tags for discovery
- Community insights for admins (growth, engagement metrics)

**14. Enhanced Artist Features**
- Full event management (ticket types, pricing via Razorpay)
- Event reminders and notifications
- Artist analytics dashboard (profile views, booking conversion)
- Portfolio video support (max 3 videos, 50MB each)
- Artist verification badges
- Featured artist listings (paid promotion)

**15. Enhanced Moderation**
- Content removal categories (spam, harassment, misinformation, violence, NSFW)
- User warnings system (3 strikes = temporary ban)
- Temporary bans (community level: 1 day, 7 days, 30 days)
- Appeal system for removed content
- Moderation statistics dashboard per community
- Automated spam detection (basic keyword filtering)

**16. Notifications**
- Push notifications for: replies, mentions, booking requests, moderation actions, poll updates
- In-app notification center with categorization
- Configurable notification preferences (granular control)
- Email digest options (daily, weekly)
- Notification muting per community

---

### Phase 3: Advanced Features (Months 7-12)

#### 💡 Nice to Have (P2)

**17. Advanced Discovery & Recommendations**
- AI-powered trending posts algorithm
- Personalized community recommendations
- Nearby events map view (Mapbox integration)
- Global search across posts/communities/artists/events
- "Similar communities" suggestions
- Content feed personalization based on engagement patterns

**18. Government Engagement Dashboard**
- Dedicated dashboard for government authorities (optional opt-in)
- View polls where they're tagged
- Official response system to community issues
- Verified government account badges
- Issue tracking and resolution status updates

**19. Advanced Analytics**
- Artist analytics: profile views, booking funnel, revenue tracking, peak demand times
- Community analytics: growth trends, engagement metrics, top contributors
- User insights: personal contribution history, community impact score
- Platform-wide transparency reports (public metrics)

**20. Gamification & Reputation**
- Anonymous reputation system (points persist across communities)
- Community contribution badges (verified helper, top contributor, etc.)
- Leaderboards per community (optional, community admin controlled)
- Achievement system for milestones
- Special flair for high-reputation users

**21. Premium Features**
- Ad-free experience (₹99/month)
- Advanced notification controls
- Extended post edit window (1 hour vs 10 minutes)
- Priority customer support
- Custom avatar uploads
- Longer poll duration options

---

## 🚫 Explicit Non-Goals

### Out of Scope for v1.0
- ❌ Live streaming or video hosting
- ❌ Direct payment processing for bookings (artists handle payments externally in MVP)
- ❌ Government authority API integrations
- ❌ Advanced AI-powered moderation
- ❌ Advertising system
- ❌ User-to-user following
- ❌ Stories/ephemeral content
- ❌ Complex recommendation algorithms

---

## ⚙️ Functional Requirements

### FR-001: User Registration & Authentication
**Priority:** P0

**Requirements:**
- Email/phone number + OTP verification via Supabase Auth
- Auto-generate anonymous display ID on signup (LocalAdjective+Noun+3digits)
- Store minimal data: ID, handle, email/phone (hashed), location preference, join date
- No real name, photo, or bio required

**Acceptance Criteria:**
- [ ] User can sign up with email + OTP in <300 seconds
- [ ] Anonymous handle is unique and auto-generated
- [ ] Location permission requested immediately after signup
- [ ] User can manually select city if GPS denied
- [ ] Session persists for 30 days

---

### FR-002: Communities
**Priority:** P0

**Requirements:**
- Any user can create a community (name must be unique per city)
- Creator automatically becomes admin with full permissions
- Users can browse communities by: location, member count, recent activity
- Join community with one click (public communities only in MVP)
- Leave community anytime
- Community feed shows posts in reverse chronological order

**Acceptance Criteria:**
- [ ] Community creation takes <30 seconds
- [ ] Community name is unique within geographic area
- [ ] Community shows member count, post count, creation date
- [ ] Admin badge visible on creator's posts in their community
- [ ] Users can join unlimited communities

**Database Schema:**
```sql
communities (
  id uuid PRIMARY KEY,
  name text UNIQUE,
  description text,
  location_city text,
  location_coordinates geography(point),
  created_at timestamp,
  created_by uuid REFERENCES users(id),
  member_count int DEFAULT 1,
  is_private boolean DEFAULT false
)
```

---

### FR-003: Posts & Comments
**Priority:** P0

**Requirements:**
- Posts contain: title (required, max 300 chars), body (optional, max 10,000 chars), single image (optional, max 5MB)
- Posts automatically tagged with author location and timestamp
- Comments support nested replies (max 2 levels deep)
- Upvote/downvote on posts and comments (one vote per user)
- Edit post/comment within 10 minutes of creation
- Delete own post/comment anytime (content replaced with "[deleted]")

**Acceptance Criteria:**
- [ ] Post creation takes <10 seconds
- [ ] Image upload works on mobile and desktop
- [ ] Vote counts update in real-time
- [ ] Deleted content properly anonymized
- [ ] Location metadata stored but not displayed by default

**Database Schema:**
```sql
posts (
  id uuid PRIMARY KEY,
  community_id uuid REFERENCES communities(id),
  author_id uuid REFERENCES users(id),
  title text NOT NULL,
  body text,
  image_url text,
  location_coordinates geography(point),
  location_city text,
  Like int DEFAULT 0,
  Dislike int DEFAULT 0,
  comment_count int DEFAULT 0,
  created_at timestamp,
  updated_at timestamp,
  is_deleted boolean DEFAULT false
)

comments (
  id uuid PRIMARY KEY,
  post_id uuid REFERENCES posts(id),
  parent_comment_id uuid REFERENCES comments(id),
  author_id uuid REFERENCES users(id),
  body text NOT NULL,
  Like int DEFAULT 0,
  Dislike int DEFAULT 0,
  created_at timestamp,
  is_deleted boolean DEFAULT false
)
```

---

### FR-004: Location-Based Feed
**Priority:** P0

**Requirements:**
- Main feed aggregates posts from user's joined communities
- Filter posts by user location (city/region level, configurable radius)
- Sort options: Recent (default), Popular (by upvote ratio)
- Load 20 posts per page, infinite scroll
- Feed updates every 60 seconds (pull) or on manual refresh
- Show location radius indicator at top of feed

**Acceptance Criteria:**
- [ ] Feed loads within 2 seconds on 4G connection
- [ ] Posts are accurately filtered by location
- [ ] User can adjust location radius (5km, 10km, 25km, 50km, city-wide)
- [ ] Empty state message when no content available
- [ ] Smooth infinite scroll with loading indicators

---

### FR-005: News & Content Aggregation
**Priority:** P0

**Requirements:**
- Integrate Google News API for local headlines
- Integrate Reddit API for trending community posts
- Fetch content based on user's city/region
- Display in unified "Discover" tab with source attribution
- Each item shows: headline/title, source, publish time, thumbnail, snippet
- Click opens full article/post (external link for news, in-app for Reddit)
- "Share to Community" button to create post with content link
- Content caching (15-minute TTL) to respect API rate limits

**Acceptance Criteria:**
- [ ] Discover feed loads within 3 seconds
- [ ] Content refreshes every 15 minutes automatically
- [ ] News articles are relevant to user location (>80% accuracy)
- [ ] Reddit posts show local subreddit content when available
- [ ] Sharing creates pre-filled post with title and link
- [ ] Graceful error handling if APIs are down
- [ ] Source attribution clearly displayed (Google News / Reddit)

**API Integration:**
```javascript
// Google News API
// Endpoint: https://newsapi.org/v2/top-headlines
// Params: country, category, pageSize
// Rate limit: 100 requests/day (free tier) - use caching

// Reddit API  
// Endpoint: https://www.reddit.com/r/{subreddit}/hot.json
// Params: limit, location-based subreddit selection
// Rate limit: 60 requests/minute - use caching

// BookMyShow API (Events)
// Endpoint: Integration via partner API
// Fetch: Local events by city, category
```
```

---

### FR-006: Polls & Civic Engagement
**Priority:** P0

**Requirements:**
- Users can create polls within communities
- Poll types: single-choice, multiple-choice
- Poll fields: question (max 300 chars), options (2-10 choices, max 100 chars each), expiry date (1 day to 30 days)
- Anonymous voting (no user-vote association stored)
- Real-time vote count display
- Users can vote once per poll (tracked via anonymous hash)
- Poll categories: Infrastructure, Safety, Events, Environment, General
- Symbolically tag government authorities (text field: name/handle/email)
- Location-based poll discovery
- Poll results visible to all (with percentage bars)

**Acceptance Criteria:**
- [ ] Poll creation takes <30 seconds
- [ ] Voting updates in real-time
- [ ] Vote anonymity is cryptographically secure
- [ ] Users cannot change vote after submission
- [ ] Expired polls show final results, voting disabled
- [ ] Tagged authorities visible but not notified (MVP)
- [ ] Polls searchable by location and category

**Database Schema:**
```sql
polls (
  id uuid PRIMARY KEY,
  community_id uuid REFERENCES communities(id),
  author_id uuid REFERENCES users(id),
  question text NOT NULL,
  category text,
  location_city text,
  location_coordinates geography(point),
  tagged_authority text, -- symbolic only
  expires_at timestamp,
  created_at timestamp,
  total_votes int DEFAULT 0,
  is_active boolean DEFAULT true
)

poll_options (
  id uuid PRIMARY KEY,
  poll_id uuid REFERENCES polls(id),
  option_text text NOT NULL,
  vote_count int DEFAULT 0,
  display_order int
)

poll_votes (
  id uuid PRIMARY KEY,
  poll_id uuid REFERENCES polls(id),
  vote_hash text UNIQUE, -- anonymous user identifier for this poll
  selected_option_ids uuid[], -- array for multiple-choice
  voted_at timestamp
)
```

---

### FR-007: Artist Platform
**Priority:** P0

**Requirements:**
- Artists register as separate account type
- Artist profile fields: stage name, service category (dropdown), description (max 500 chars), portfolio images (max 10, 5MB each), location, rate range, contact preference
- Service categories: Musician, DJ, Photographer, Videographer, Makeup Artist, Dancer, Comedian, Chef, Artist, Other
- Monthly subscription: ₹500/month via Razorpay/paypal (auto-renewal)
- 30-day free trial (card required but not charged)
- Profile active/visible only when subscription current
- Profile inactive/hidden when subscription lapses and 15 days grace period gets over
- Payment gateway integration for subscription management

**Acceptance Criteria:**
- [ ] Artist profile creation takes <5 minutes
- [ ] Payment flow completes in <2 minutes
- [ ] Free trial activates immediately
- [ ] Profile goes live immediately after trial activation
- [ ] Auto-renewal reminder sent 3 days before due date
- [ ] Grace period of 15 days before profile hidden
- [ ] Artist can pause subscription (profile hidden during pause)

**Database Schema:**
```sql
artists (
  id uuid PRIMARY KEY REFERENCES users(id),
  stage_name text NOT NULL,
  service_category text NOT NULL,
  description text,
  portfolio_images text[], -- array of URLs
  location_city text,
  location_coordinates geography(point),
  rate_min int,
  rate_max int,
  subscription_status text, -- trial, active, expired, cancelled
  subscription_start_date date,
  subscription_next_billing_date date,
  trial_ends_at timestamp,
  created_at timestamp,
  profile_views int DEFAULT 0,
  rating_avg decimal DEFAULT 0,
  rating_count int DEFAULT 0
)
```

---

### FR-008: Events Discovery
**Priority:** P0

**Requirements:**
- Integrate BookMyShow API for local event listings
- Artists can create custom event pages
- Event fields: title, date/time, location, description (max 1000 chars), category, ticket info (optional)
- Event discussion threads (comments enabled)
- RSVP/interest indicator ("Interested" button)
- Combined event feed: BookMyShow events + artist-created events
- Filter by: date, category, location radius
- Event categories match artist service categories

**Acceptance Criteria:**
- [ ] Event creation takes <3 minutes
- [ ] BookMyShow events sync every 6 hours
- [ ] Event feed loads within 3 seconds
- [ ] Events accurately filtered by location
- [ ] RSVP count displays in real-time
- [ ] Event reminders sent 24h before (Phase 2)
- [ ] Event discussions support comments and reactions

**Database Schema:**
```sql
events (
  id uuid PRIMARY KEY,
  artist_id uuid REFERENCES artists(id), -- null for BookMyShow events
  external_event_id text, -- BookMyShow event ID if applicable
  title text NOT NULL,
  description text,
  event_date timestamp,
  location_city text,
  location_address text,
  location_coordinates geography(point),
  category text,
  ticket_info text,
  external_booking_url text, -- BookMyShow URL
  created_at timestamp,
  rsvp_count int DEFAULT 0,
  source text -- 'artist' or 'bookmyshow'
)

event_rsvps (
  id uuid PRIMARY KEY,
  event_id uuid REFERENCES events(id),
  user_id uuid REFERENCES users(id),
  created_at timestamp,
  UNIQUE(event_id, user_id)
)
```

---

### FR-009: Booking System
**Priority:** P0

**Requirements:**
- Users can send booking request to artist from artist profile
- Booking request form: event date, event type, location, budget, message (max 500 chars)
- Artist receives in-app notification and email
- Artist can accept, decline, or request more info
- Booking statuses: Pending, Accepted, Declined, Info Requested, Completed
- Basic messaging thread per booking (no real-time chat, async only)
- Users can view their booking history
- Artists can view all booking requests in dashboard

**Acceptance Criteria:**
- [ ] Booking request sent in <30 seconds
- [ ] Artist receives notification within 1 minute
- [ ] Booking status updates reflect immediately
- [ ] Messaging allows text only (no attachments in MVP)
- [ ] Both parties can rate each other after booking marked complete
- [ ] Payment coordination happens off-platform (MVP scope)

**Database Schema:**
```sql
bookings (
  id uuid PRIMARY KEY,
  artist_id uuid REFERENCES artists(id),
  user_id uuid REFERENCES users(id),
  event_date date,
  event_type text,
  location text,
  budget_range text,
  message text,
  status text DEFAULT 'pending',
  created_at timestamp,
  updated_at timestamp
)

booking_messages (
  id uuid PRIMARY KEY,
  booking_id uuid REFERENCES bookings(id),
  sender_id uuid REFERENCES users(id),
  message text,
  created_at timestamp
)
```

---

### FR-010: Content Moderation
**Priority:** P0

**Requirements:**
- Report button on all posts, comments, and polls
- Report reasons: Spam, Harassment, Misinformation, Violence, NSFW, Other
- Optional additional context (max 200 chars)
- Reported content flagged but remains visible (unless severe)
- Community admin sees reports for their community in dashboard
- Super admin sees all reports platform-wide
- Admin actions: Remove Content, Dismiss Report, Warn User, Temporary Ban, Permanent Ban
- Content removal shows "[removed by moderator]" placeholder
- Transparent public moderation log (privacy-preserving)
- User receives notification of moderation actions
- Appeal system for removed content

**Acceptance Criteria:**
- [ ] Report submission takes <15 seconds
- [ ] Reports appear in admin dashboard within 1 minute
- [ ] Admins can process reports in bulk
- [ ] Action log maintained for all moderation decisions (publicly accessible)
- [ ] Users can appeal removals via in-app form
- [ ] Moderation response time <24 hours for 90% of reports
- [ ] Moderation transparency: all actions logged with reason

**Database Schema:**
```sql
reports (
  id uuid PRIMARY KEY,
  content_type text, -- post, comment, poll, message
  content_id uuid,
  reported_by uuid REFERENCES users(id), -- anonymized in logs
  reason text,
  additional_context text,
  status text DEFAULT 'pending', -- pending, reviewed, resolved
  assigned_to uuid REFERENCES users(id), -- admin handling it
  resolution text, -- removed, dismissed, warned, temp_banned, banned
  created_at timestamp,
  resolved_at timestamp
)

moderation_log (
  id uuid PRIMARY KEY,
  report_id uuid REFERENCES reports(id),
  content_type text,
  content_id uuid,
  action_by uuid REFERENCES users(id), -- anonymized for community admins
  action_type text,
  reason text,
  is_public boolean DEFAULT true,
  created_at timestamp
)
```

---

### FR-011: Admin Dashboards
**Priority:** P0

**Requirements:**

**Community Admin Dashboard:**
- View all reports for their community
- See community statistics (members, posts, growth)
- Remove posts/comments
- Add/remove co-admins (Phase 2)
- Edit community info

**Super Admin Dashboard:**
- View all users, artists, communities
- Global reports queue
- User management: ban, warn, delete
- Artist management: approve, suspend, refund
- Subscription overview and manual adjustments
- Platform statistics: DAU, posts/day, bookings/day
- API integration health monitoring

**Acceptance Criteria:**
- [ ] Dashboard loads within 3 seconds
- [ ] Real-time stat updates every 30 seconds
- [ ] Bulk action support (select multiple reports)
- [ ] Export reports as CSV
- [ ] Activity log for all admin actions
- [ ] Mobile-responsive dashboard

---

## 🎨 Design System

### Visual Identity
- **Style:** Minimal, clean, modern (inspired by X/Twitter + Reddit)
- **Color Palette:**
  - Primary: Deep blue (#1E3A8A)
  - Secondary: Warm orange (#F97316)
  - Background: Light gray (#F9FAFB)
  - Text: Dark gray (#111827)
  - Accent: Teal (#14B8A6) for actions
- **Typography:**
  - Headers: Inter Bold
  - Body: Inter Regular
  - Code/usernames: JetBrains Mono
- **Spacing:** 8px base unit system
- **Corners:** 8px border radius for cards, 4px for buttons

### Key UI Components
1. **Anonymous Avatar System:** Geometric patterns + color based on user ID hash
2. **Post Cards:** Clean white cards with clear hierarchy (title → body → metadata)
3. **Location Badge:** Small pill showing distance/city at top of posts
4. **Reaction Bar:** Minimalist upvote/downvote + comment count
5. **Community Badge:** Colored community identifier on posts
6. **Artist Profile Card:** Portfolio grid + key info + CTA button

### Responsive Breakpoints
- Mobile: 320px - 640px (single column)
- Tablet: 641px - 1024px (two column where appropriate)
- Desktop: 1025px+ (three column: sidebar + feed + widgets)

### Accessibility Requirements
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader optimized
- Min contrast ratio: 4.5:1
- Touch targets: min 44x44px

---

## 🧠 Technical Architecture

### Frontend Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5.x
- **Styling:** TailwindCSS 3.x
- **Components:** shadcn/ui (Radix UI primitives)
- **State Management:** React Context + React Query for server state
- **Forms:** React Hook Form + Zod validation
- **Maps:** Mapbox GL JS (for location visualization)
- **Image Upload:** Cloudinary or Supabase Storage

### Backend Stack
- **Database:** Supabase (PostgreSQL 15+)
- **Authentication:** Supabase Auth (OTP-based)
- **Storage:** Supabase Storage (images, avatars)
- **Real-time:** Supabase Realtime (for notifications in Phase 2)
- **API:** Next.js API Routes (server-side)
- **Payment:** Razorpay SDK for subscriptions

### External Integrations
- **News:** Google News API (newsapi.org) for local headlines and breaking news
- **Social Content:** Reddit API for trending community discussions
- **Events:** BookMyShow API for local event listings and discovery
- **Payments:** Razorpay SDK for artist subscriptions and payments
- **Geolocation:** Browser Geolocation API + IP fallback (ipapi.co)
- **Email:** Resend or SendGrid (transactional emails, OTPs)
- **Analytics:** Vercel Analytics + Posthog (privacy-friendly, no tracking)
- **Storage:** Supabase Storage or Cloudinary for images
- **Maps:** Mapbox GL JS (Phase 3) for event/artist location visualization

### Database Architecture

**Key Tables:**
- `users` - base user accounts (minimal PII, anonymized)
- `artists` - artist-specific data (extends users)
- `communities` - community metadata
- `community_members` - many-to-many join table
- `posts` - user posts
- `comments` - nested comments
- `votes` - upvotes/downvotes (anonymized)
- `polls` - community polls
- `poll_options` - poll choices
- `poll_votes` - anonymous poll responses
- `reports` - content reports
- `bookings` - artist booking requests
- `subscriptions` - payment tracking
- `events` - artist and BookMyShow events
- `moderation_log` - transparent action log
- `messages` - chat messages (Phase 2)

**Row Level Security (RLS):**
- Users can only edit their own content
- Users cannot view PII (email/phone) of other users
- Artists can only manage their own profile and bookings
- Community admins can moderate their community only
- Super admins bypass all RLS policies
- Public read access to non-deleted, non-flagged content
- Poll votes are completely anonymized (no user association)
- Location data stored at city level only in public schemas

### Performance Requirements
- **Page Load:** <3s on 4G connection
- **Time to Interactive:** <5s
- **API Response:** <500ms for 95th percentile
- **Image Optimization:** WebP format, lazy loading, responsive srcsets
- **Database Queries:** Indexed on location, timestamps, IDs
- **Caching:** Redis/Supabase cache for news, trending posts (15min TTL)

### Scalability Plan
- **Phase 1 (0-10K users):** Supabase free tier sufficient
- **Phase 2 (10K-100K users):** Upgrade to Supabase Pro, CDN caching
- **Phase 3 (100K+ users):** Read replicas, connection pooling, edge functions
- **Geographic Distribution:** Consider multi-region deployment by region

### Security Requirements
- **Data Encryption:** TLS 1.3 in transit, AES-256 at rest
- **Authentication:** OTP-based (no passwords), JWT tokens (7-day expiry)
- **Rate Limiting:** 100 req/min per user, 1000 req/min per IP
- **Content Validation:** XSS prevention, SQL injection protection (via Supabase RLS)
- **Anonymous Privacy:** Never expose user email/phone in API responses
- **Payment Security:** PCI-DSS compliant via Razorpay

---

## 📱 User Flows

### Flow 1: New User Onboarding
1. Land on homepage → "Get Started" CTA
2. Enter email/phone → Receive OTP
3. Enter OTP → Account created, anonymous handle assigned
4. Location permission prompt → GPS enabled or manual city selection
5. "Discover Communities" screen → Browse suggested communities
6. Join 2-3 communities
7. Arrive at main feed with personalized content

**Goal:** Complete onboarding in <2 minutes

---

### Flow 2: Creating a Post
1. From feed → "+" FAB or "Create Post" button
2. Select community (dropdown of joined communities)
3. Enter title (required)
4. Enter body text (optional)
5. Upload image (optional) → Preview
6. Location auto-detected → Option to adjust
7. "Post" button → Post created
8. Redirect to post detail page
9. Notification sent to community members (Phase 2)

**Goal:** Post creation in <60 seconds

---

### Flow 3: Booking an Artist
1. Navigate to "Artists" tab
2. Filter by location + category
3. Browse artist cards → Click artist of interest
4. View artist profile (portfolio, rates, reviews)
5. "Request Booking" button → Booking form
6. Fill: date, event type, budget, message
7. Submit → Confirmation screen
8. Artist receives notification
9. Artist responds → User gets notification
10. Booking confirmed via message thread

**Goal:** Booking request in <3 minutes

---

### Flow 4: Moderating Content (Community Admin)
1. Receive notification of reported content
2. Navigate to admin dashboard
3. View report details (content, reporter reason, timestamp)
4. Review reported content in context
5. Decision: Remove or Dismiss
6. If remove: Select reason, add note
7. Action logged, user notified
8. Report marked resolved

**Goal:** Process report in <2 minutes

---

## 🧪 Testing Strategy

### Unit Tests
- Utility functions (location calculations, ID generation)
- Component logic (form validation, state management)
- API route handlers
- Database queries (via Supabase client)

**Target:** 80% code coverage

### Integration Tests
- User registration flow
- Post creation and retrieval
- Booking request flow
- Payment subscription flow
- Moderation actions

**Target:** Cover all critical paths

### E2E Tests (Playwright)
- Complete onboarding flow
- Create post → Comment → Report
- Artist profile creation → Booking
- Admin moderation workflow

**Target:** Run on every deployment

### Performance Tests
- Load testing: 1000 concurrent users
- Database query performance (<100ms for indexed queries)
- Image upload and delivery (<3s for 5MB image)

### Security Tests
- OWASP Top 10 vulnerability scanning
- RLS policy verification
- Rate limiting effectiveness
- XSS/SQL injection attempts

---

## 🚢 Deployment & DevOps

### Environments
- **Development:** Local + Supabase dev project
- **Staging:** Vercel preview + Supabase staging
- **Production:** Vercel production + Supabase production

### CI/CD Pipeline
1. Push to feature branch → Run linting + unit tests
2. Open PR → Run integration tests + preview deployment
3. Merge to main → Run E2E tests
4. On success → Auto-deploy to production
5. Post-deployment smoke tests

### Monitoring
- **Uptime:** Vercel status monitoring
- **Errors:** Sentry for error tracking
- **Performance:** Vercel Analytics for Web Vitals
- **User Analytics:** Posthog (privacy-friendly)
- **Database:** Supabase metrics dashboard
- **Payments:** Razorpay webhook monitoring

### Backup Strategy
- **Database:** Supabase automated daily backups (7-day retention)
- **Images:** Supabase Storage redundancy
- **Code:** Git repository (GitHub)

---

## 📅 Development Roadmap

### Sprint 1-2 (Weeks 1-4): Foundation
- [ ] Project setup (Next.js + Supabase + Tailwind)
- [ ] Design system implementation
- [ ] User authentication (OTP)
- [ ] Anonymous handle generation
- [ ] Basic routing and navigation

### Sprint 3-4 (Weeks 5-8): Core Features
- [ ] Communities (create, join, list)
- [ ] Posts & comments
- [ ] Upvote/downvote system
- [ ] Location-based feed
- [ ] Report functionality

### Sprint 5-6 (Weeks 9-12): News & Artists
- [ ] Google News API integration
- [ ] News feed UI
- [ ] Artist profile creation
- [ ] Razorpay subscription integration
- [ ] Artist discovery page

### Sprint 7-8 (Weeks 13-16): Booking & Moderation
- [ ] Booking request system
- [ ] Booking messaging
- [ ] Community admin dashboard
- [ ] Super admin dashboard
- [ ] Moderation workflows

### Sprint 9-10 (Weeks 17-20): Polish & Launch
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation
- [ ] Beta launch with 100 users

---

## ❓ Open Questions & Decisions Needed

### Technical Decisions
- [ ] **Q:** Should we use Mapbox or Google Maps for location visualization?  
  **Recommendation:** Google Maps

- [ ] **Q:** How to handle image storage scaling?  
  **Recommendation:** Start with Supabase Storage, migrate to Cloudinary if >10K images/day

- [ ] **Q:** Real-time updates via polling or WebSockets?  
  **Recommendation:** Polling for MVP (60s interval), WebSockets in Phase 2

### Product Decisions
- [ ] **Q:** Should users be able to delete their account and all content?  
  **Recommendation:** Yes, GDPR compliance requirement

- [ ] **Q:** How to handle artist disputes/refunds?  
  **Recommendation:** Manual process via super admin in MVP, automated in Phase 2

- [ ] **Q:** Rate limiting strategy for post creation?  
  **Recommendation:** 10 posts per day, 50 comments per day to prevent spam

- [ ] **Q:** Should we allow editing posts after comments exist?  
  **Recommendation:** Allow edit but show "edited" indicator with timestamp

- [ ] **Q:** How to handle offensive usernames (auto-generated)?  
  **Recommendation:** Maintain blocklist of inappropriate words in generator

### Business Decisions
- [ ] **Q:** Artist subscription pricing - monthly or quarterly?  
  **Recommendation:** Monthly in MVP, offer quarterly discount in Phase 2

- [ ] **Q:** Revenue split for future booking fees?  
  **Recommendation:** 0% in MVP (artists coordinate payment externally), 10% in Phase 2

- [ ] **Q:** Free trial period for artists?  
  **Recommendation:** 30-day free trial, card required but not charged

---

## 📚 Appendices

### A. Glossary
- **Anonymous Handle:** Auto-generated username (e.g., "LocalPanda123")
- **Community:** Location-based group for discussion
- **Feed:** Personalized stream of posts and news
- **RLS:** Row Level Security (database access control)
- **OTP:** One-Time Password for authentication
- **DAU:** Daily Active Users
- **MAU:** Monthly Active Users

### B. API Endpoints Reference

**Authentication:**
- `POST /api/auth/signup` - Create account
- `POST /api/auth/verify-otp` - Verify OTP code
- `POST /api/auth/logout` - End session

**Communities:**
- `GET /api/communities` - List communities
- `POST /api/communities` - Create community
- `GET /api/communities/:id` - Get community details
- `POST /api/communities/:id/join` - Join community
- `DELETE /api/communities/:id/leave` - Leave community

**Posts:**
- `GET /api/posts` - Get feed
- `POST /api/posts` - Create post
- `GET /api/posts/:id` - Get post details
- `PUT /api/posts/:id` - Edit post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/vote` - Upvote/downvote
- `POST /api/posts/:id/report` - Report post

**Polls:**
- `GET /api/polls` - Get polls feed (location-based)
- `POST /api/polls` - Create poll
- `GET /api/polls/:id` - Get poll details
- `POST /api/polls/:id/vote` - Submit vote (anonymous)
- `GET /api/polls/:id/results` - Get poll results

**News & Discovery:**
- `GET /api/discover` - Get aggregated content (news, Reddit, events)
- `GET /api/news` - Get Google News articles
- `GET /api/reddit/:subreddit` - Get Reddit posts
- `POST /api/discover/share` - Share external content as post

**Events:**
- `GET /api/events` - List events (BookMyShow + artist events)
- `POST /api/events` - Create artist event
- `GET /api/events/:id` - Get event details
- `POST /api/events/:id/rsvp` - RSVP to event
- `DELETE /api/events/:id/rsvp` - Remove RSVP

**Artists:**
- `GET /api/artists` - List artists (with filters)
- `POST /api/artists` - Create artist profile
- `GET /api/artists/:id` - Get artist details
- `PUT /api/artists/:id` - Update profile
- `POST /api/artists/:id/subscribe` - Start subscription

**Bookings:**
- `POST /api/bookings` - Create booking request
- `GET /api/bookings` - List user bookings
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id` - Update booking status
- `POST /api/bookings/:id/messages` - Send message in booking thread

**Admin:**
- `GET /api/admin/reports` - List reports
- `PUT /api/admin/reports/:id` - Resolve report
- `GET /api/admin/stats` - Platform statistics
- `GET /api/admin/users` - List users
- `PUT /api/admin/users/:id/ban` - Ban user
- `GET /api/admin/moderation-log` - Public moderation log

### C. Database ER Diagram
```
users (1) ──< (M) community_members (M) >── (1) communities
users (1) ──< (M) posts (M) >── (1) communities
posts (1) ──< (M) comments
users (1) ──< (M) polls (M) >── (1) communities
polls (1) ──< (M) poll_options
polls (1) ──< (M) poll_votes (anonymous)
users (1) ──< (1) artists
artists (1) ──< (M) bookings >── (M) users
artists (1) ──< (M) events
events (1) ──< (M) event_rsvps >── (M) users
users (1) ──< (M) reports
posts/comments/polls (1) ──< (M) reports
users (1) ──< (M) moderation_log (admin actions)
```

---

## 🏛️ Community Governance & Transparency

### Governance Model

**Three-Tier Governance:**
1. **Community Admins:** Elected by community creators, moderate their specific communities
2. **Platform Moderators:** Handle cross-community issues and escalations
3. **Super Admins:** Platform-wide oversight, policy enforcement, technical management

### Community Self-Governance

**Community Admin Powers:**
- Remove posts/comments within their community
- Temporary ban users from community (1-30 days)
- Add/remove co-admins
- Set community rules and guidelines
- Pin important posts
- Access community insights and analytics

**Community Admin Responsibilities:**
- Respond to reports within 24 hours
- Enforce community guidelines consistently
- Document moderation decisions with clear reasons
- Engage with community members on policy questions
- Escalate complex cases to super admins

**Checks & Balances:**
- All moderation actions logged publicly
- Users can appeal to super admins
- Community members can vote to remove admin (Phase 2)
- Admins cannot ban users platform-wide
- Super admin review of high-impact decisions

### Transparent Moderation

**Public Moderation Log:**
- Accessible at `/community/{id}/moderation-log`
- Shows: action type, content type, reason, timestamp
- Privacy-preserving: no user identities revealed
- Filterable by date, action type, content type

**Moderation Guidelines (Public):**
- Clear content policy accessible to all users
- Specific examples of violations
- Escalation procedures documented
- Appeal process clearly explained
- Regular updates based on community feedback

**Community Moderation Reports:**
- Each community shows moderation stats
- Reports/month, actions taken, response time
- Builds trust and accountability

### Platform Transparency

**Public Dashboards:**
1. **Platform Stats:** `/transparency/stats`
   - Total users (aggregated)
   - Posts/comments per day
   - Active communities
   - Artists subscribed
   - Bookings completed

2. **Moderation Transparency:** `/transparency/moderation`
   - Content reports filed (by category)
   - Moderation actions (by type)
   - Average response time
   - Appeal outcomes

3. **Privacy Metrics:** `/transparency/privacy`
   - Data deletion requests processed
   - Account deletions completed
   - Government data requests (if any)
   - Security incidents (if any)

**Quarterly Transparency Reports:**
- Published every 3 months
- Detailed breakdown of platform health
- Community feedback summary
- Planned improvements
- Privacy/security updates

### Community Feedback Loops

**User Voice:**
- Dedicated feedback community
- Monthly community surveys
- Feature voting system (Phase 2)
- Open roadmap (what we're building next)
- Regular AMAs with founders/team

**Policy Changes:**
- All policy changes announced 14 days before implementation
- Community comment period
- Rationale clearly explained
- Changes documented in changelog

---

## 🔐 Privacy & Compliance

### Privacy Architecture

**Core Privacy Principles:**
1. **Anonymity by Default:** No real names, photos, or identifiable information required
2. **Zero-Knowledge Design:** Platform doesn't need to know who users are to function
3. **Location Privacy:** City-level only in public data; precise coordinates never exposed
4. **Transparent Moderation:** All moderation actions logged publicly (privacy-preserving)
5. **Data Minimization:** Collect only what's absolutely necessary
6. **No Tracking:** Zero third-party trackers, no behavioral profiling
7. **User Control:** Delete account and all data anytime

### Anonymous Identity System

**How It Works:**
- Auto-generated handle: `LocalAdjective+Noun+3digits` (e.g., "LocalPanda547")
- Deterministic avatar: Geometric pattern generated from user ID hash
- No profile photos, real names, or bios
- Email/phone stored encrypted and hashed, never exposed via API
- Vote patterns anonymized using one-way hashes

**Privacy Guarantees:**
- No user-to-user identity correlation possible
- Even admins cannot see email/phone without super admin access
- Poll votes mathematically provable as anonymous
- Location data: city name only, coordinates rounded to 0.01° (~1km)

### Data Protection Implementation

**Authentication:**
- OTP-based (no passwords to leak)
- JWT tokens with 7-day expiry
- Tokens stored in httpOnly cookies
- No session tracking across devices

**Database Security:**
- Row Level Security (RLS) on all tables
- PII stored in separate encrypted table
- Poll votes use anonymous hash identifier
- Email/phone: bcrypt hashed before storage
- Location coordinates: PostGIS geography type, public views rounded

**API Security:**
- Rate limiting: 100 req/min per user
- No PII in API responses
- Location data sanitized before response
- CORS restricted to known domains
- Input validation and sanitization

### GDPR & Global Privacy Compliance

**GDPR (EU Users):**
- ✅ Explicit consent for location tracking (prompt on first launch)
- ✅ Right to access: Export all user data via dashboard
- ✅ Right to erasure: Delete account → all content anonymized
- ✅ Right to portability: JSON export of all user data
- ✅ Privacy by design: Anonymity built into architecture
- ✅ Data minimization: Only essential data collected
- ✅ Transparent processing: Public privacy policy and terms

**CCPA (California Users):**
- ✅ Right to know what data is collected
- ✅ Right to delete personal information
- ✅ Right to opt-out of data sale (we don't sell data)
- ✅ No discrimination for exercising privacy rights

**India DPDP Act 2023:**
- ✅ Consent for data processing (location, OTP auth)
- ✅ Purpose limitation: Data used only for stated purposes
- ✅ Data security safeguards in place
- ✅ Right to correction and deletion
- ✅ Parental consent for users under 18 (age gate)

### Data Retention & Deletion

**Retention Periods:**
- **User accounts:** Until user requests deletion
- **Posts/comments:** Indefinitely, but anonymized upon account deletion
- **Poll votes:** Anonymized, retained for statistical integrity
- **Booking data:** 2 years after completion (tax/legal requirements)
- **Moderation logs:** 2 years (transparency/audit trail)
- **Payment data:** Per Razorpay retention policy (PCI-DSS)
- **System logs:** 90 days
- **Analytics:** Aggregated only, no individual tracking

**Account Deletion Process:**
1. User initiates deletion via settings
2. Confirmation email sent with 7-day grace period
3. After 7 days: PII permanently deleted
4. Content transformed: "[deleted user]" replaces handle
5. Votes/polls remain (anonymized)
6. Moderation log entries anonymized
7. Deletion cannot be reversed

### Transparency Commitments

**Public Transparency Reports (Quarterly):**
- Number of active users (aggregated)
- Number of content reports filed
- Moderation actions taken (by category)
- Government data requests (if any)
- Security incidents (if any)

**Transparent Moderation:**
- All moderation actions logged
- Logs accessible at `/transparency/moderation-log`
- User anonymity preserved in logs
- Reasons for actions clearly stated

**Open Source Commitment (Phase 2):**
- Core privacy components open-sourced
- Third-party security audits published
- Bug bounty program for privacy/security issues

---

## 📝 Version 2.0 Changelog

**Major Improvements from v1.0:**

### New Features Added to MVP (Phase 1):
1. **Polls & Civic Engagement** - Moved from Phase 2 to MVP for stronger community value
2. **News & Content Aggregation** - Enhanced with Reddit API integration
3. **Events Discovery** - Added BookMyShow API integration
4. **Enhanced Privacy Architecture** - Comprehensive privacy-first design documented
5. **Community Governance** - New section on transparent, community-driven moderation

### Enhanced Sections:
- **Executive Summary** - Clearer articulation of privacy-first mission and core pillars
- **Success Metrics** - Comprehensive KPIs across all feature areas
- **External Integrations** - Added Reddit API and BookMyShow API
- **Database Architecture** - Added polls, events, and enhanced privacy schemas
- **Privacy & Compliance** - Massively expanded with detailed privacy architecture
- **API Endpoints** - Complete reference including polls, events, and discovery
- **Governance & Transparency** - New dedicated section

### Technical Enhancements:
- Poll voting system with cryptographic anonymity guarantees
- Events schema supporting both BookMyShow and artist-created events
- Enhanced RLS policies for privacy protection
- Transparent moderation log architecture
- GDPR/CCPA/DPDP compliance documentation

### Strategic Shifts:
- Stronger emphasis on privacy as core competitive advantage
- Community self-governance as scaling strategy
- Transparency as trust-building mechanism
- Civic engagement tools in MVP for social impact
- Multi-source content aggregation for richer feeds

**Rationale for Changes:**
- **Privacy-First:** Aligns with founding vision of anonymous, safe community spaces
- **Civic Value:** Polls enable real community organization from day one
- **Content Richness:** Reddit + News + Events = compelling discovery experience
- **Transparency:** Builds trust and differentiates from closed platforms
- **Governance:** Enables community scaling without centralized moderation bottleneck

---

**End of Document**

**Version:** 2.0  
**Authors:** Product Team  
**Approved by:** [Pending Founder Review]  
**Next Review:** Sprint 3 (Week 6)  
**Questions/Feedback:** Contact product team

---

*This PRD is a living document and will be updated as we learn from user feedback and technical constraints during development. All decisions prioritize user privacy, community engagement, and transparent governance.*

