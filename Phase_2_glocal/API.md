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
Razorpay webhook handler (internal).

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
  "data": [{
    "id": "uuid",
    "artist_id": "uuid",
    "event_date": "2025-12-25T19:00:00Z",
    "event_type": "Wedding",
    "location": "Venue",
    "status": "pending",
    "artists": {
      "stage_name": "Artist Name"
    }
  }],
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

### GET /cron/expire-subscriptions
Expire subscriptions and hide profiles (cron job).

**Headers:**
```
Authorization: Bearer CRON_SECRET
```

### GET /cron/send-renewal-reminders
Send email reminders (cron job).

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

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
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
- Standard: 100 requests/minute per user
- Reports: 20 requests/day per user
- Cron jobs: Require `CRON_SECRET` header

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

**API Version:** 1.0.0  
**Last Updated:** October 8, 2025

