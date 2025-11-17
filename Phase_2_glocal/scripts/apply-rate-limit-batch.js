/**
 * Helper script to apply rate limiting to a batch of routes
 * This script shows the pattern to apply
 */

const fs = require('fs')
const path = require('path')

// Routes to update with their handler functions
const routes = [
  { file: 'app/api/posts/[id]/view/route.ts', handlers: ['POST'] },
  { file: 'app/api/posts/[id]/pin/route.ts', handlers: ['POST'] },
  { file: 'app/api/posts/[id]/edit-history/route.ts', handlers: ['GET'] },
  { file: 'app/api/posts/[id]/announcement/route.ts', handlers: ['POST'] },
  { file: 'app/api/posts/[id]/comments/enhanced/route.ts', handlers: ['GET', 'POST'] },
  { file: 'app/api/polls/[id]/route.ts', handlers: ['GET'] },
  { file: 'app/api/polls/[id]/vote/route.ts', handlers: ['POST'] },
  { file: 'app/api/polls/[id]/results/route.ts', handlers: ['GET'] },
  { file: 'app/api/polls/[id]/analytics/route.ts', handlers: ['GET', 'POST'] },
  { file: 'app/api/polls/[id]/comments/route.ts', handlers: ['GET', 'POST'] },
  { file: 'app/api/comments/[id]/vote/route.ts', handlers: ['POST'] },
  { file: 'app/api/notifications/[id]/route.ts', handlers: ['PATCH', 'DELETE'] },
  { file: 'app/api/notifications/unread-count/route.ts', handlers: ['GET'] },
  { file: 'app/api/notifications/summary/route.ts', handlers: ['GET'] },
  { file: 'app/api/notifications/preferences/route.ts', handlers: ['GET', 'PATCH'] },
  { file: 'app/api/notifications/cleanup/route.ts', handlers: ['GET', 'POST'] },
  { file: 'app/api/messages/[messageId]/route.ts', handlers: ['PATCH', 'DELETE'] },
  { file: 'app/api/messages/search/route.ts', handlers: ['GET'] },
  { file: 'app/api/messages/presence/route.ts', handlers: ['POST', 'GET'] },
  { file: 'app/api/messages/[messageId]/read/route.ts', handlers: ['POST'] },
  { file: 'app/api/messages/[messageId]/reactions/route.ts', handlers: ['POST', 'DELETE'] },
  { file: 'app/api/messages/conversations/[id]/route.ts', handlers: ['GET', 'DELETE'] },
  { file: 'app/api/messages/conversations/[id]/messages/route.ts', handlers: ['GET', 'POST'] },
  { file: 'app/api/bookings/[id]/route.ts', handlers: ['GET', 'PUT', 'DELETE'] },
  { file: 'app/api/bookings/[id]/messages/route.ts', handlers: ['GET', 'POST'] },
  { file: 'app/api/reports/[id]/route.ts', handlers: ['GET', 'PUT'] },
  { file: 'app/api/moderation/log/route.ts', handlers: ['GET'] },
  { file: 'app/api/profile/delete/route.ts', handlers: ['POST'] },
  { file: 'app/api/profile/activity/route.ts', handlers: ['GET'] },
  { file: 'app/api/drafts/[id]/route.ts', handlers: ['GET', 'DELETE'] },
  { file: 'app/api/events/[id]/route.ts', handlers: ['GET', 'PUT', 'DELETE'] },
  { file: 'app/api/events/[id]/rsvp/route.ts', handlers: ['POST'] },
  { file: 'app/api/v2/locations/[id]/route.ts', handlers: ['PUT', 'DELETE'] },
  { file: 'app/api/v2/locations/[id]/set-primary/route.ts', handlers: ['PUT'] },
]

console.log(`Found ${routes.length} route files to update`)
console.log('\nPattern to apply:')
console.log("1. Add import: import { withRateLimit } from '@/lib/middleware/with-rate-limit'")
console.log(
  '2. Wrap each handler: export const METHOD = withRateLimit(async function METHOD(...) {'
)
console.log('3. Close with })\n')
