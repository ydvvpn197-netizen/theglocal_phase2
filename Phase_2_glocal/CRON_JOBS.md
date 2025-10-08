# Cron Jobs Documentation

## Overview

This application uses Vercel Cron Jobs to run scheduled tasks for maintaining subscription states and artist profile visibility.

## Configured Cron Jobs

### 1. Send Renewal Reminders

**Endpoint:** `/api/cron/send-renewal-reminders`  
**Schedule:** `0 9 * * *` (Daily at 9:00 AM UTC / 2:30 PM IST)  
**Purpose:** Send email reminders and notifications for subscription renewals

#### What It Does:

1. **Sends Renewal Reminders (3 days before):**
   - Finds artists whose subscriptions are renewing in exactly 3 days
   - Sends email reminder with renewal date and amount
   - Tracks when reminder was sent to avoid duplicates

2. **Sends Expiry Notifications:**
   - Finds artists whose subscriptions just expired
   - Sends notification with 15-day grace period information
   - Tracks when notification was sent

#### Email Templates:

- **Renewal Reminder:** Professional email with renewal date, amount, subscription benefits
- **Expiry Notification:** Warning email with grace period end date and reactivation link

### 2. Expire Subscriptions & Hide Profiles

**Endpoint:** `/api/cron/expire-subscriptions`  
**Schedule:** `0 0 * * *` (Daily at midnight UTC)  
**Purpose:** Automatically manages artist subscription lifecycle

#### What It Does:

1. **Updates Expired Subscriptions:**
   - Finds artists with `trial` or `active` status where `subscription_end_date` has passed
   - Updates their status to `expired`

2. **Hides Profiles Past Grace Period:**
   - Finds artists with `expired` status where `subscription_end_date` is more than 15 days ago
   - Updates their status to `cancelled` (effectively hiding them from public view)

#### How It Works:

The cron job calls two PostgreSQL functions:

```sql
-- Updates expired subscriptions
SELECT update_expired_subscriptions();

-- Hides profiles past 15-day grace period
SELECT hide_expired_artist_profiles();
```

#### Profile Visibility Rules:

- **Visible:** `trial`, `active`, or `expired` (within 15-day grace period)
- **Hidden:** `expired` (past 15-day grace period), `cancelled`

## Configuration

### Vercel Configuration

The cron jobs are configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/expire-subscriptions",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/send-renewal-reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### Environment Variables

Add to `.env.local` and Vercel:

```bash
CRON_SECRET=your_random_secret_here
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**Email Service Setup:**
1. Create account at [Resend](https://resend.com)
2. Generate API key from dashboard
3. Add and verify your domain (or use `onboarding@resend.dev` for testing)
4. Add credentials to environment variables

Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Vercel Setup

1. **Enable Cron Jobs:**
   - Vercel automatically detects `vercel.json` and enables cron jobs on deployment

2. **Set Environment Variable:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add `CRON_SECRET` with your generated secret

3. **Configure Cron Secret in Vercel:**
   - Vercel automatically adds the `CRON_SECRET` to the `Authorization` header
   - Format: `Bearer {CRON_SECRET}`

## Security

### Authentication

The cron endpoint is protected by a bearer token:

```typescript
const authHeader = request.headers.get('authorization')
const cronSecret = process.env.CRON_SECRET

if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Best Practices

- ✅ Use a strong, randomly generated secret (32+ characters)
- ✅ Never commit the secret to version control
- ✅ Rotate the secret periodically
- ✅ Monitor cron job execution logs in Vercel

## Manual Execution

For testing or manual maintenance, you can call the endpoints directly:

### Expire Subscriptions

```bash
curl -X GET https://your-domain.com/api/cron/expire-subscriptions \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Response:**
```json
{
  "success": true,
  "expired_count": 5,
  "hidden_count": 2,
  "message": "Subscription expiry cron job completed successfully"
}
```

### Send Renewal Reminders

```bash
curl -X GET https://your-domain.com/api/cron/send-renewal-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Response:**
```json
{
  "success": true,
  "renewal_reminders_sent": 12,
  "expiry_notifications_sent": 3,
  "message": "Renewal reminders cron job completed successfully"
}
```

## Monitoring

### Vercel Logs

View cron job execution logs:
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on a deployment → Logs
3. Filter by `/api/cron/expire-subscriptions`

### Database Monitoring

Check subscription states:

```sql
-- View subscription status distribution
SELECT subscription_status, COUNT(*) 
FROM artists 
GROUP BY subscription_status;

-- Find subscriptions expiring soon
SELECT id, stage_name, subscription_end_date 
FROM artists 
WHERE subscription_status IN ('trial', 'active')
  AND subscription_end_date < (CURRENT_DATE + INTERVAL '7 days');

-- Find profiles in grace period
SELECT id, stage_name, subscription_end_date 
FROM artists 
WHERE subscription_status = 'expired'
  AND subscription_end_date >= (CURRENT_DATE - INTERVAL '15 days');
```

## Subscription Lifecycle

```
┌─────────┐
│  trial  │ ─── 30 days ───> subscription_end_date
└────┬────┘
     │
     │ (payment successful)
     ▼
┌─────────┐
│ active  │ ─── monthly ───> subscription_end_date
└────┬────┘
     │
     │ (payment failed / cancelled)
     ▼
┌─────────┐
│ expired │ ─── 15 days grace period ───> hidden from public
└────┬────┘
     │
     │ (grace period ends)
     ▼
┌───────────┐
│ cancelled │ ─── profile hidden from public view
└───────────┘
```

## Troubleshooting

### Cron Job Not Running

1. **Check Vercel Configuration:**
   - Ensure `vercel.json` is in the project root
   - Verify deployment includes the cron configuration

2. **Verify Environment Variables:**
   - Check `CRON_SECRET` is set in Vercel
   - Ensure it matches your local `.env.local`

3. **Check Logs:**
   - Look for errors in Vercel deployment logs
   - Check for authentication failures

### Subscriptions Not Expiring

1. **Check Database Functions:**
   - Ensure migration `0006_artist_visibility_grace_period.sql` has been applied
   - Verify functions exist: `update_expired_subscriptions()`, `hide_expired_artist_profiles()`

2. **Manual Execution:**
   - Run the cron endpoint manually to test
   - Check the returned counts

3. **Database State:**
   - Verify `subscription_end_date` is properly set
   - Check for timezone issues (dates should be in UTC)

## Email Tracking

The system tracks when emails are sent to avoid duplicates:

```sql
-- View reminder tracking
SELECT 
  stage_name,
  subscription_end_date,
  renewal_reminder_sent_at,
  expiry_notification_sent_at
FROM artists
WHERE renewal_reminder_sent_at IS NOT NULL
  OR expiry_notification_sent_at IS NOT NULL
ORDER BY subscription_end_date DESC;
```

## Future Enhancements

- [x] Email notifications before expiry (3 days warning) ✅
- [x] Email notifications on expiry ✅
- [ ] Email notifications during grace period (7 days remaining)
- [ ] SMS notifications for critical reminders
- [ ] Slack/Discord notifications for monitoring
- [ ] Retry logic for failed email sends
- [ ] Dashboard for subscription and email analytics
- [ ] A/B testing for email templates
- [ ] Personalized email recommendations

