# Environment Variables Setup

## Quick Setup

1. **Copy the template file:**

   ```bash
   cp .env.local.template .env.local
   ```

2. **Add your Supabase credentials:**

   Open `.env.local` and replace the placeholder values with your actual Supabase credentials from the dashboard.

3. **Verify the setup:**
   ```bash
   npm run dev
   ```

## Required Environment Variables

### Supabase (Required Now)

| Variable                        | Where to find                               | Description                            |
| ------------------------------- | ------------------------------------------- | -------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase Dashboard → Project Settings → API | Your project URL                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API | Public anon key (safe for client-side) |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase Dashboard → Project Settings → API | Service role key (keep secret!)        |

### Application Secrets

| Variable             | Where to find                             | Description                         |
| -------------------- | ----------------------------------------- | ----------------------------------- |
| `CRON_SECRET`        | Generate a random string (32+ characters) | Secret for authenticating cron jobs |
| `SUPER_ADMIN_EMAILS` | Comma-separated list of admin emails      | Emails with super admin access      |

**Generate CRON_SECRET:**

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use any secure random string generator
```

### External APIs (Add Later)

These can be added as you progress through development:

#### Google News API (Task 3.2)

| Variable       | Where to find                     | Description  |
| -------------- | --------------------------------- | ------------ |
| `NEWS_API_KEY` | https://newsapi.org → Get API Key | News API key |

#### Reddit API (Task 3.3)

| Variable               | Where to find                     | Description         |
| ---------------------- | --------------------------------- | ------------------- |
| `REDDIT_CLIENT_ID`     | https://www.reddit.com/prefs/apps | OAuth app client ID |
| `REDDIT_CLIENT_SECRET` | https://www.reddit.com/prefs/apps | OAuth app secret    |

#### BookMyShow API (Task 3.7)

| Variable             | Where to find                | Description |
| -------------------- | ---------------------------- | ----------- |
| `BOOKMYSHOW_API_KEY` | BookMyShow Partner Dashboard | API key     |

#### Razorpay Payment Gateway (Task 4.2)

| Variable                      | Where to find                            | Description                           |
| ----------------------------- | ---------------------------------------- | ------------------------------------- |
| `RAZORPAY_KEY_ID`             | Razorpay Dashboard → Settings → API Keys | API Key ID (server-side)              |
| `RAZORPAY_KEY_SECRET`         | Razorpay Dashboard → Settings → API Keys | API Secret (keep secret!)             |
| `RAZORPAY_WEBHOOK_SECRET`     | Razorpay Dashboard → Settings → Webhooks | Webhook signature secret              |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same as RAZORPAY_KEY_ID                  | API Key ID (client-side for checkout) |

**Razorpay Setup Steps:**

1. Create account at https://razorpay.com
2. Go to Settings → API Keys → Generate Keys
3. Create webhook: Settings → Webhooks → Add Webhook URL
4. Set webhook URL to: `https://yourdomain.com/api/artists/subscription-webhook`
5. Copy the webhook secret and add to environment variables

#### Resend Email Service (Task 4.2)

| Variable            | Where to find                | Description                                       |
| ------------------- | ---------------------------- | ------------------------------------------------- |
| `RESEND_API_KEY`    | Resend Dashboard → API Keys  | API key for sending emails                        |
| `RESEND_FROM_EMAIL` | Your configured email domain | From email address (e.g., noreply@yourdomain.com) |

**Resend Setup Steps:**

1. Create account at https://resend.com (Free tier: 100 emails/day, 3,000/month)
2. Go to API Keys → Create API Key
3. Add your domain: Domains → Add Domain
4. Verify domain ownership (DNS records)
5. Set `RESEND_FROM_EMAIL` to an address on your verified domain
6. For testing, you can use Resend's test domain: `onboarding@resend.dev`

## Security Notes

⚠️ **IMPORTANT:**

- `.env.local` is already in `.gitignore` - DO NOT commit it
- `NEXT_PUBLIC_*` variables are exposed to the browser (safe for public use)
- Service role key has admin access - never expose to clients
- Store production credentials in Vercel environment variables

## Troubleshooting

### Build fails with "environment variable not found"

- Ensure `.env.local` exists in project root
- Check for typos in variable names
- Restart dev server after adding new variables

### Supabase connection fails

- Verify URL format: `https://xxxxx.supabase.co`
- Check that keys don't have extra spaces
- Ensure Supabase project is not paused

### Variables not updating

- Restart the development server (`npm run dev`)
- Clear Next.js cache: `rm -rf .next`

## Environment-Specific Setup

### Development

Use `.env.local` (already configured)

### Production (Vercel)

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add all variables from `.env.local`
3. Mark sensitive keys as "Encrypted"

### Testing

Use `.env.test.local` for test-specific values
