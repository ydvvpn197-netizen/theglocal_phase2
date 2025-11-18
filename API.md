# API Documentation

Complete API reference for Theglocal platform.

**Base URL:** `https://yourdomain.com/api`  
**Authentication:** JWT tokens in httpOnly cookies  
**Content-Type:** `application/json`

---

## 🔐 Authentication

### POST /auth/signup

Create new user account with OTP.

**Body:**

```json
{
  "email": "user@example.com" // OR
  "phone": "+919876543210"
}
```

**Response:**

```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

### POST /auth/verify-otp

Verify OTP and complete registration.

**Body:**

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

### POST /auth/logout

Sign out current user.

---

## 🏘️ Communities

### GET /communities

List communities with optional filtering.

**Query Params:**

- `city` (string): Filter by city
- `search` (string): Search communities
- `limit` (number): Results per page (default: 24)
- `offset` (number): Pagination offset

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Community Name",
      "slug": "community-slug",
      "description": "Description",
      "location_city": "Mumbai",
      "member_count": 150,
      "post_count": 450
    }
  ]
}
```

### POST /communities

Create a new community.

**Body:**

```json
{
  "name": "My Community",
  "description": "About this community",
  "location_city": "Mumbai",
  "rules": "Community rules",
  "is_private": false
}
```

### GET /communities/[slug]

Get community details.

### POST /communities/[slug]/join

Join a community.

### DELETE /communities/[slug]/leave

Leave a community.

### PUT /communities/[slug]/edit

Update community info (admin only).

### GET /communities/[slug]/members

Get community members list.

---

## 📝 Posts

### GET /posts

List posts with filtering and pagination.

**Query Params:**

- `community_id` (string): Filter by community
- `sort` (string): `recent` or `popular`
- `limit` (number): Results per page (default: 20)
- `offset` (number): Pagination offset

### POST /posts

Create a new post.

**Body:**

```json
{
  "community_id": "uuid",
  "title": "Post Title",
  "body": "Post content",
  "image_url": "https://..."
}
```

### GET /posts/[id]

Get post details with comments.

### PUT /posts/[id]

Update post (within 10 minutes, author only).

### DELETE /posts/[id]

Delete post (soft delete, author only).

### POST /posts/[id]/vote

Vote on a post.

**Body:**

```json
{
  "vote_type": "upvote" // or "downvote"
}
```

### GET /posts/[id]/comments

List comments for a post.

### POST /posts/[id]/comments

Add comment to a post.

**Body:**

```json
{
  "body": "Comment text",
  "parent_comment_id": "uuid" // Optional for replies
}
```

---

## 💬 Comments

### PUT /comments/[id]

Update comment (within 10 minutes, author only).

### DELETE /comments/[id]

Delete comment (soft delete, author only).

### POST /comments/[id]/vote

Vote on a comment.

---

## 📊 Polls

### GET /polls

List polls with filtering.

**Query Params:**

- `city` (string): Filter by location
- `category` (string): Poll category
- `status` (string): `active` or `expired`

### POST /polls

Create a poll.

**Body:**

```json
{
  "community_id": "uuid",
  "question": "Poll question?",
  "category": "Infrastructure",
  "options": ["Option 1", "Option 2", "Option 3"],
  "expires_at": "2025-12-31T23:59:59Z",
  "tagged_authority": "Municipal Corporation"
}
```

### GET /polls/[id]

Get poll details.

### POST /polls/[id]/vote

Vote on a poll (anonymous).

**Body:**

```json
{
  "option_id": "uuid"
}
```

### GET /polls/[id]/results

Get poll results.

---

## 🎭 Artists

### GET /artists

List artists with filtering.

**Query Params:**

- `city` (string): Filter by location
- `category` (string): Service category
- `search` (string): Search by name/description
- `limit` (number): Results per page (default: 20)

### POST /artists

Create artist profile (requires authentication).

**Body:**

```json
{
  "stage_name": "Artist Name",
  "service_category": "Musician",
  "description": "About the artist",
  "location_city": "Mumbai",
  "rate_min": 10000,
  "rate_max": 50000,
  "portfolio_images": ["url1", "url2"]
}
```

### GET /artists/[id]

Get artist profile.

### PUT /artists/[id]

Update artist profile (artist only).

### DELETE /artists/[id]

Delete artist profile (artist only).

### POST /artists/[id]/subscribe

Create subscription order.

**Body:**

```json
{
  "plan": "monthly" // or "yearly"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "order_id": "order_xxx",
    "amount": 50000,
    "currency": "INR"
  }
}
```

### POST /artists/[id]/subscribe/verify

Verify payment and activate subscription.

**Body:**

```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature"
}
```

### POST /artists/subscription-webhook

Razorpay subscription webhook handler (internal).

**Headers:**

```
X-Razorpay-Signature: signature
```

**Body:** Razorpay webhook payload

### POST /artists/paypal-webhook

PayPal subscription webhook handler (internal).

**Headers:**

```
PayPal-Transmission-Id: id
PayPal-Transmission-Sig: signature
```

---

## 📅 Events

### GET /events

List events (BookMyShow + Artist events).

**Query Params:**

- `city` (string): Filter by city
- `category` (string): Event category
- `date` (string): Date filter (`today`, `tomorrow`, `this-week`, `this-month`)

### POST /events

Create event (artists with active subscription only).

**Body:**

```json
{
  "title": "Event Title",
  "description": "Event description",
  "event_date": "2025-12-25T19:00:00Z",
  "location_city": "Mumbai",
  "location_address": "Venue address",
  "category": "Music",
  "ticket_info": "Ticket details"
}
```

### GET /events/[id]

Get event details.

### PUT /events/[id]

Update event (artist owner only).

### DELETE /events/[id]

Delete event (artist owner only).

### POST /events/[id]/rsvp

RSVP to an event.

### GET /events/sync-bookmyshow

Cron job to sync BookMyShow events (internal).

---

## 📦 Bookings

### GET /bookings

List bookings (user's own or artist's requests).

**Query Params:**

- `status` (string): Filter by status
- `limit` (number): Results per page

**Response** (for users):

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "artist_id": "uuid",
      "event_date": "2025-12-25T19:00:00Z",
      "event_type": "Wedding",
      "location": "Venue",
      "status": "pending",
      "artists": {
        "stage_name": "Artist Name"
      }
    }
  ],
  "meta": {
    "is_artist": false
  }
}
```

### POST /bookings

Create booking request.

**Body:**

```json
{
  "artist_id": "uuid",
  "event_date": "2025-12-25T19:00:00Z",
  "event_type": "Wedding Reception",
  "location": "Venue address",
  "budget_range": "₹20,000 - ₹30,000",
  "message": "Additional details"
}
```

### GET /bookings/[id]

Get booking details.

### PUT /bookings/[id]

Update booking status (artist only).

**Body:**

```json
{
  "status": "accepted" // pending, accepted, declined, info_requested, completed
}
```

### DELETE /bookings/[id]

Cancel booking (user only, pending/info_requested only).

### GET /bookings/[id]/messages

List messages for a booking.

### POST /bookings/[id]/messages

Send message in booking thread.

**Body:**

```json
{
  "message": "Message text"
}
```

---

## 🚩 Reports & Moderation

### POST /reports

Submit content report.

**Body:**

```json
{
  "content_type": "post", // post, comment, poll, message, user
  "content_id": "uuid",
  "reason": "Spam", // Spam, Harassment, Misinformation, Violence, NSFW, Other
  "additional_context": "Optional details"
}
```

**Rate Limit:** 20 reports per day per user

### GET /reports

List reports (admin/moderator only).

**Query Params:**

- `status` (string): Filter by status
- `content_type` (string): Filter by content type
- `community_id` (string): Filter by community

### GET /reports/[id]

Get report details (admin only).

### PUT /reports/[id]

Resolve report (admin only).

**Body:**

```json
{
  "status": "dismissed", // pending, reviewed, dismissed, actioned
  "resolution_note": "Reason for decision"
}
```

### POST /moderation

Take moderation action.

**Body:**

```json
{
  "content_type": "post",
  "content_id": "uuid",
  "action": "removed", // removed, dismissed, warned, temp_banned, banned
  "reason": "Spam",
  "report_id": "uuid"
}
```

### GET /moderation/log

Get public moderation log.

**Query Params:**

- `community_id` (string): Filter by community
- `action` (string): Filter by action type
- `limit` (number): Results per page

---

## 📰 Discovery

### GET /discover

Aggregated discovery feed.

**Query Params:**

- `city` (string): Location filter
- `limit` (number): Results per page

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "type": "news",
      "title": "News Article",
      "url": "https://...",
      "source": "News Source",
      "publishedAt": "2025-10-08T10:00:00Z"
    },
    {
      "type": "reddit",
      "title": "Reddit Post",
      "subreddit": "r/mumbai",
      "url": "https://reddit.com/..."
    },
    {
      "type": "event",
      "title": "Concert",
      "venue": "Venue Name",
      "date": "2025-12-25"
    }
  ]
}
```

### GET /discover/news

Google News articles for location.

### GET /discover/reddit

Reddit posts from local subreddits.

### POST /discover/share

Share external content to community.

---

## 🌐 Public/Transparency

### GET /transparency/stats

Get public platform statistics.

**Response:**

```json
{
  "success": true,
  "data": {
    "total_users": 1500,
    "total_communities": 45,
    "total_posts": 3200,
    "total_artists": 120,
    "active_users_7d": 450,
    "active_users_30d": 890,
    "posts_24h": 85,
    "comments_24h": 320
  }
}
```

---

## ⚙️ Internal/Cron

All cron endpoints require `Authorization: Bearer CRON_SECRET` header.

### GET /cron/expire-subscriptions

Expire subscriptions and hide profiles (runs daily at midnight).

**Headers:**

```
Authorization: Bearer CRON_SECRET
```

### GET /cron/send-renewal-reminders

Send email reminders for expiring subscriptions (runs daily at 9 AM).

**Headers:**

```
Authorization: Bearer CRON_SECRET
```

### GET /cron/cleanup-drafts

Clean up old draft posts (runs daily at 2 AM).

**Headers:**

```
Authorization: Bearer CRON_SECRET
```

### GET /cron/send-event-reminders

Send reminders for upcoming events.

**Headers:**

```
Authorization: Bearer CRON_SECRET
```

### GET /cron/handle-grace-period

Handle subscription grace period transitions.

**Headers:**

```
Authorization: Bearer CRON_SECRET
```

### GET /cron/geocode-locations

Process pending location geocoding requests.

**Headers:**

```
Authorization: Bearer CRON_SECRET
```

### POST /cron/cleanup-orphaned-media

Clean up orphaned media files from storage.

**Headers:**

```
Authorization: Bearer CRON_SECRET
```

### GET /cron/sync-subscription-status

Sync subscription status from payment provider.

**Headers:**

```
Authorization: Bearer CRON_SECRET
```

---

## 📤 File Upload

### POST /upload

Upload image file.

**Body:** FormData

```javascript
const formData = new FormData()
formData.append('file', file)
formData.append('folder', 'portfolios') // avatars, portfolios, posts
```

**Response:**

```json
{
  "success": true,
  "data": {
    "url": "https://storage.url/path/to/file.jpg"
  }
}
```

**Limits:**

- Max size: 5MB
- Allowed types: JPEG, PNG, WebP, GIF

**Rate Limit:** 20 requests/minute

### POST /upload/multiple

Upload multiple files at once.

**Body:** FormData

```javascript
const formData = new FormData()
formData.append('files', file1)
formData.append('files', file2)
formData.append('folder', 'portfolios')
```

**Response:**

```json
{
  "success": true,
  "data": {
    "urls": ["https://storage.url/path/to/file1.jpg", "https://storage.url/path/to/file2.jpg"]
  }
}
```

### POST /upload/video

Upload video file (for events/portfolios).

**Body:** FormData

```javascript
const formData = new FormData()
formData.append('file', videoFile)
formData.append('folder', 'portfolios')
```

**Limits:**

- Max size: 50MB
- Allowed types: MP4, WebM, MOV

### POST /upload/message-attachment

Upload file attachment for messages.

**Body:** FormData

```javascript
const formData = new FormData()
formData.append('file', file)
formData.append('conversation_id', 'uuid')
```

### POST /upload/chunked/init

Initialize chunked upload for large files.

**Body:**

```json
{
  "filename": "large-file.jpg",
  "size": 10485760,
  "mime_type": "image/jpeg",
  "folder": "portfolios"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "upload_id": "uuid",
    "chunk_size": 5242880
  }
}
```

### POST /upload/chunked/chunk

Upload a chunk of a file.

**Body:** FormData

```javascript
const formData = new FormData()
formData.append('upload_id', 'uuid')
formData.append('chunk_index', '0')
formData.append('chunk', chunkBlob)
```

### POST /upload/chunked/complete

Complete chunked upload.

**Body:**

```json
{
  "upload_id": "uuid",
  "total_chunks": 3
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "url": "https://storage.url/path/to/file.jpg"
  }
}
```

---

## 🔔 Notifications

### GET /notifications

List user notifications.

**Query Params:**

- `limit` (number): Results per page (default: 20)
- `offset` (number): Pagination offset
- `unread_only` (boolean): Filter unread only

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "post_reply",
      "title": "New reply to your post",
      "body": "User replied to your post",
      "read": false,
      "created_at": "2025-10-08T10:00:00Z",
      "metadata": {
        "post_id": "uuid",
        "comment_id": "uuid"
      }
    }
  ]
}
```

### GET /notifications/unread-count

Get count of unread notifications.

**Response:**

```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

### GET /notifications/summary

Get notification summary (unread count by type).

**Response:**

```json
{
  "success": true,
  "data": {
    "total_unread": 5,
    "by_type": {
      "post_reply": 2,
      "booking_request": 1,
      "message": 2
    }
  }
}
```

### PUT /notifications/[id]

Mark notification as read.

**Response:**

```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### GET /notifications/preferences

Get notification preferences.

**Response:**

```json
{
  "success": true,
  "data": {
    "email_enabled": true,
    "push_enabled": true,
    "preferences": {
      "post_reply": true,
      "booking_request": true,
      "message": true
    }
  }
}
```

### PUT /notifications/preferences

Update notification preferences.

**Body:**

```json
{
  "email_enabled": true,
  "push_enabled": false,
  "preferences": {
    "post_reply": true,
    "booking_request": false
  }
}
```

### POST /notifications/cleanup

Clean up old notifications (admin only).

---

## 👤 Profile

### GET /profile

Get current user profile.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "handle": "user123",
    "avatar_url": "https://...",
    "location_city": "Mumbai",
    "created_at": "2025-01-01T00:00:00Z",
    "stats": {
      "posts_count": 10,
      "comments_count": 25,
      "communities_count": 3
    }
  }
}
```

### PUT /profile

Update user profile.

**Body:**

```json
{
  "avatar_url": "https://...",
  "location_city": "Delhi",
  "bio": "User bio"
}
```

### GET /profile/activity

Get user activity feed.

**Query Params:**

- `type` (string): Filter by type (posts, comments, votes)
- `limit` (number): Results per page
- `offset` (number): Pagination offset

### DELETE /profile

Delete user account (soft delete).

**Response:**

```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

---

## 📝 Drafts

### GET /drafts

List user draft posts.

**Query Params:**

- `limit` (number): Results per page
- `offset` (number): Pagination offset

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Draft title",
      "body": "Draft content",
      "community_id": "uuid",
      "updated_at": "2025-10-08T10:00:00Z"
    }
  ]
}
```

### POST /drafts

Create or update draft.

**Body:**

```json
{
  "title": "Draft title",
  "body": "Draft content",
  "community_id": "uuid",
  "image_url": "https://..."
}
```

### GET /drafts/[id]

Get draft by ID.

### PUT /drafts/[id]

Update draft.

### DELETE /drafts/[id]

Delete draft.

---

## 📰 Feed

### GET /feed

Get personalized feed.

**Query Params:**

- `limit` (number): Results per page (default: 20)
- `offset` (number): Pagination offset
- `sort` (string): `recent` or `popular`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "type": "post",
      "post": {
        /* post object */
      },
      "community": {
        /* community object */
      }
    }
  ]
}
```

### GET /v2/feed

Enhanced feed with better filtering.

**Query Params:**

- `communities` (string[]): Filter by community IDs
- `types` (string[]): Filter by content types
- `limit` (number): Results per page
- `cursor` (string): Pagination cursor

---

## 🔍 Search

### GET /v2/search

Global search across all content.

**Query Params:**

- `q` (string): Search query (required)
- `type` (string): Filter by type (posts, communities, artists, events)
- `city` (string): Filter by city
- `limit` (number): Results per page
- `offset` (number): Pagination offset

**Response:**

```json
{
  "success": true,
  "data": {
    "posts": [
      /* post results */
    ],
    "communities": [
      /* community results */
    ],
    "artists": [
      /* artist results */
    ],
    "events": [
      /* event results */
    ],
    "total": 150
  }
}
```

### GET /v2/search/suggestions

Get search suggestions/autocomplete.

**Query Params:**

- `q` (string): Search query
- `limit` (number): Number of suggestions

**Response:**

```json
{
  "success": true,
  "data": {
    "suggestions": ["Mumbai events", "Mumbai communities", "Mumbai artists"]
  }
}
```

---

## 📍 Locations

### GET /locations/saved

Get user's saved locations.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Home",
      "city": "Mumbai",
      "is_primary": true,
      "coordinates": {
        "lat": 19.076,
        "lng": 72.8777
      }
    }
  ]
}
```

### GET /v2/locations

List locations with filtering.

**Query Params:**

- `city` (string): Filter by city
- `search` (string): Search locations
- `limit` (number): Results per page

### GET /v2/locations/[id]

Get location details.

### PUT /v2/locations/[id]

Update location.

### PUT /v2/locations/[id]/set-primary

Set location as primary.

---

## 💼 Jobs

### GET /jobs

List job postings.

**Query Params:**

- `city` (string): Filter by city
- `category` (string): Filter by category
- `limit` (number): Results per page

### GET /jobs/[id]

Get job details.

---

## 🗺️ Geocoding

### GET /geocoding/process

Process pending geocoding requests (admin only).

---

## 📊 Statistics

### GET /stats/public

Get public platform statistics.

**Response:**

```json
{
  "success": true,
  "data": {
    "total_users": 1500,
    "total_communities": 45,
    "total_posts": 3200
  }
}
```

---

## 🔧 Admin Endpoints

All admin endpoints require admin role.

### GET /admin/stats

Get admin dashboard statistics.

### GET /admin/health

Get system health status.

### GET /admin/users

List all users.

**Query Params:**

- `search` (string): Search by handle/email
- `status` (string): Filter by status
- `limit` (number): Results per page

### GET /admin/users/[id]

Get user details.

### POST /admin/users/[id]/ban

Ban a user.

**Body:**

```json
{
  "reason": "Violation of terms",
  "duration_days": 30
}
```

### POST /admin/users/[id]/unban

Unban a user.

### GET /admin/communities

List all communities.

### GET /admin/communities/orphaned

Find orphaned communities (no admins).

### POST /admin/communities/[id]/feature

Feature/unfeature a community.

**Body:**

```json
{
  "featured": true
}
```

### GET /admin/artists

List all artists with subscription status.

### GET /admin/subscriptions

Get subscription analytics.

### GET /admin/reports

List all reports (same as GET /reports for admins).

### GET /admin/performance

Get performance metrics.

### GET /admin/geocoding/stats

Get geocoding statistics.

### POST /admin/recalculate-counts

Recalculate community/post counts.

### GET /admin/jobs

List background jobs status.

---

## 🔗 Webhooks

### POST /artists/subscription-webhook

Razorpay subscription webhook handler.

**Headers:**

```
X-Razorpay-Signature: signature
```

**Body:** Razorpay webhook payload

### POST /artists/paypal-webhook

PayPal subscription webhook handler.

**Headers:**

```
PayPal-Transmission-Id: id
PayPal-Transmission-Sig: signature
```

---

## 📊 Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    /* response data */
  },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "details": {} // Optional validation errors
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not authorized)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## 🔒 Security

### Authentication

All protected endpoints require valid JWT token in cookies.

### Rate Limiting

Rate limits are applied per user/IP and vary by endpoint category:

- **HIGH_TRAFFIC** (Feed, Posts, Discover, Search): 100 requests/minute
- **STANDARD** (Most endpoints): 60 requests/minute
- **EXPENSIVE** (Upload, Analytics, Admin, Geocoding): 20 requests/minute
- **AUTH** (Authentication, Webhooks): 10 requests/minute
- **CRON**: No limits (requires `CRON_SECRET` header)
- **Reports**: 20 requests/day per user

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1633024800
```

When rate limit is exceeded, returns `429 Too Many Requests` with:

```json
{
  "error": "RateLimitError",
  "message": "Too many requests, please try again later",
  "retryAfter": 60
}
```

### Input Validation

All inputs validated with Zod schemas.

### SQL Injection Protection

- Supabase client escapes all queries
- No raw SQL from user input
- Parameterized queries only

### XSS Protection

- Input sanitization on all user content
- CSP headers configured
- React auto-escapes output

---

## 🧪 Testing APIs

### Using cURL

```bash
# Get communities
curl https://yourdomain.com/api/communities

# Create post (with auth)
curl -X POST https://yourdomain.com/api/posts \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"community_id":"uuid","title":"Test","body":"Content"}'
```

### Using Postman/Insomnia

Import our API collection (coming soon).

---

## 📚 Additional Resources

- [Database Schema](./SUPABASE_SETUP.md)
- [Authentication Flow](./ENV_SETUP.md#authentication)
- [Testing Guide](./TESTING.md)

---

---

## 📄 Pagination

Most list endpoints support pagination using `limit` and `offset` query parameters:

- `limit`: Number of results per page (default: 20, max: 100)
- `offset`: Number of results to skip

**Response with pagination:**

```json
{
  "success": true,
  "data": [
    /* results */
  ],
  "meta": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

Some endpoints use cursor-based pagination:

```json
{
  "success": true,
  "data": [
    /* results */
  ],
  "meta": {
    "cursor": "next_cursor_token",
    "has_more": true
  }
}
```

---

## 🔐 Webhooks

### Razorpay Webhook

**Endpoint:** `POST /api/artists/subscription-webhook`

**Verification:** Webhook signature is verified using `RAZORPAY_WEBHOOK_SECRET`

**Events Handled:**

- `subscription.activated`
- `subscription.charged`
- `subscription.cancelled`
- `subscription.paused`
- `subscription.resumed`

**Example Payload:**

```json
{
  "entity": "event",
  "account_id": "acc_xxx",
  "event": "subscription.activated",
  "contains": ["subscription"],
  "payload": {
    "subscription": {
      "entity": {
        "id": "sub_xxx",
        "status": "active"
      }
    }
  }
}
```

### PayPal Webhook

**Endpoint:** `POST /api/artists/paypal-webhook`

**Verification:** Webhook signature is verified using PayPal's verification API

**Events Handled:**

- `BILLING.SUBSCRIPTION.ACTIVATED`
- `BILLING.SUBSCRIPTION.CANCELLED`
- `PAYMENT.SALE.COMPLETED`

---

**API Version:** 1.0.0  
**Last Updated:** January 2025
