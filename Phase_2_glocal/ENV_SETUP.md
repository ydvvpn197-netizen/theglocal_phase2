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

### External APIs (Add Later)

These can be added as you progress through development:

- **Google News API** - Required for Task 3.2
- **Reddit API** - Required for Task 3.3
- **BookMyShow API** - Required for Task 3.7
- **Razorpay** - Required for Task 4.2

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
