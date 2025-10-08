# Deployment Guide

This guide covers deploying Theglocal to production on Vercel with Supabase.

---

## 🎯 Prerequisites

Before deploying, ensure you have:

- [ ] GitHub repository with latest code
- [ ] Vercel account ([vercel.com](https://vercel.com))
- [ ] Supabase production project ([supabase.com](https://supabase.com))
- [ ] Razorpay production account ([razorpay.com](https://razorpay.com))
- [ ] Resend account for emails ([resend.com](https://resend.com))
- [ ] Custom domain (optional)

---

## 📋 Deployment Checklist

### **Phase 1: Database Setup**

1. **Create Supabase Production Project:**
   ```bash
   # Go to https://supabase.com/dashboard
   # Click "New Project"
   # Choose organization and region (closest to users)
   # Note down project URL and keys
   ```

2. **Apply Database Migrations:**
   ```bash
   # Link to production project
   supabase link --project-ref your-project-ref
   
   # Push all migrations
   supabase db push
   
   # Verify migrations
   supabase db remote changes
   ```

3. **Generate TypeScript Types:**
   ```bash
   supabase gen types typescript --project-id your-project-id > lib/types/database.types.ts
   ```

4. **Configure Storage Buckets:**
   - Create `avatars` bucket (public)
   - Create `portfolios` bucket (public)
   - Create `posts` bucket (public)
   - Set size limits (5MB per file)

---

### **Phase 2: External Services Setup**

#### **Razorpay Configuration**

1. **Switch to Live Mode:**
   - Go to Razorpay Dashboard → Settings
   - Switch from Test to Live mode
   - Generate API keys

2. **Create Subscription Plan:**
   ```bash
   # Via Razorpay Dashboard or API
   # Plan: Artist Subscription
   # Amount: ₹500/month
   # Billing cycle: Monthly
   ```

3. **Configure Webhook:**
   - URL: `https://yourdomain.com/api/artists/subscription-webhook`
   - Events: Select all subscription and payment events
   - Copy webhook secret

#### **Resend Configuration**

1. **Add and Verify Domain:**
   ```bash
   # Add your domain in Resend dashboard
   # Add DNS records (SPF, DKIM, DMARC)
   # Wait for verification
   ```

2. **Generate API Key:**
   - Go to API Keys → Create
   - Copy the key

#### **External APIs**

1. **Google News API:**
   - Get key from [newsapi.org](https://newsapi.org)
   
2. **Reddit API:**
   - Create app at [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
   - Get client ID and secret

3. **BookMyShow API:**
   - Contact BookMyShow for partnership/API access

---

### **Phase 3: Vercel Deployment**

#### **1. Connect Repository**

```bash
# Install Vercel CLI (optional)
npm install -g vercel

# Login
vercel login

# Link project
vercel link
```

Or use Vercel Dashboard:
- Go to [vercel.com/new](https://vercel.com/new)
- Import your GitHub repository
- Select Next.js framework preset

#### **2. Configure Environment Variables**

In Vercel Dashboard → Project → Settings → Environment Variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application
NEXT_PUBLIC_APP_URL=https://yourdomain.com
CRON_SECRET=your-random-32char-secret

# Razorpay
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=your-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxx

# Resend
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# External APIs
NEWS_API_KEY=your-news-api-key
REDDIT_CLIENT_ID=your-reddit-id
REDDIT_CLIENT_SECRET=your-reddit-secret
BOOKMYSHOW_API_KEY=your-bms-key
```

**Important:** Add to all environments (Production, Preview, Development)

#### **3. Configure Build Settings**

- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`
- **Node Version:** 18.x

#### **4. Deploy**

```bash
# Via CLI
vercel --prod

# Or via Dashboard
# Push to main branch → automatic deployment
```

---

### **Phase 4: Post-Deployment Configuration**

#### **1. Configure Cron Jobs**

Vercel automatically detects `vercel.json` cron configuration:

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

**Verify cron jobs:**
- Vercel Dashboard → Project → Settings → Cron Jobs
- Test manually: `curl https://yourdomain.com/api/cron/expire-subscriptions -H "Authorization: Bearer YOUR_CRON_SECRET"`

#### **2. Configure Custom Domain**

1. Add domain in Vercel Dashboard
2. Add DNS records from Vercel
3. Wait for SSL certificate (automatic)
4. Update `NEXT_PUBLIC_APP_URL` environment variable

#### **3. Set Up Monitoring**

**Vercel Analytics:**
```bash
# Already enabled by default
# View at: Vercel Dashboard → Project → Analytics
```

**Sentry Error Tracking:**
```bash
npm install @sentry/nextjs

# Configure in sentry.config.js
# Add SENTRY_DSN to environment variables
```

**Uptime Monitoring:**
- Use Vercel's built-in monitoring
- Or external: UptimeRobot, Pingdom, StatusCake

#### **4. Configure Razorpay Webhook**

Update webhook URL to production:
- Razorpay Dashboard → Settings → Webhooks
- Update URL: `https://yourdomain.com/api/artists/subscription-webhook`
- Test webhook delivery

---

## 🔒 Security Checklist

Before going live:

- [ ] All environment variables set in Vercel
- [ ] No secrets committed to Git
- [ ] RLS policies enabled on all tables
- [ ] Rate limiting configured
- [ ] Security headers enabled
- [ ] HTTPS enforced (automatic with Vercel)
- [ ] Webhook signatures verified
- [ ] Input validation on all forms
- [ ] CSRF protection enabled

---

## 🧪 Pre-Launch Testing

### **1. Test Critical Flows**

```bash
# Run all tests
npm test

# Run E2E tests against production
NEXT_PUBLIC_APP_URL=https://yourdomain.com npx playwright test
```

### **2. Manual Testing Checklist**

- [ ] Sign up with email
- [ ] Sign up with phone
- [ ] Create community
- [ ] Post content
- [ ] Comment and vote
- [ ] Report content
- [ ] Register as artist
- [ ] Complete subscription payment
- [ ] Create event
- [ ] Request booking
- [ ] Send messages
- [ ] Moderate content (as admin)
- [ ] View moderation log
- [ ] Check mobile responsiveness

### **3. Performance Testing**

```bash
# Run Lighthouse audit
npx lighthouse https://yourdomain.com --view

# Target scores:
# Performance: 90+
# Accessibility: 95+
# Best Practices: 95+
# SEO: 90+
```

---

## 📊 Monitoring After Launch

### **1. Error Tracking**

Monitor Sentry dashboard for:
- JavaScript errors
- API failures
- Database errors
- Payment issues

### **2. Performance Monitoring**

Track in Vercel Analytics:
- Page load times
- API response times
- Core Web Vitals (LCP, FID, CLS)
- Bandwidth usage

### **3. Business Metrics**

Monitor daily:
- New user signups
- Active communities
- Posts created
- Artist subscriptions
- Booking requests
- Reports submitted

---

## 🔄 Continuous Deployment

### **Automatic Deployments**

Vercel automatically deploys:
- **Production:** Pushes to `main` branch
- **Preview:** All pull requests
- **Development:** Pushes to `dev` branch (if configured)

### **Rollback Procedure**

If issues arise:

1. **Via Vercel Dashboard:**
   - Go to Deployments
   - Find last working deployment
   - Click "Promote to Production"

2. **Via Git:**
   ```bash
   git revert HEAD
   git push origin main
   ```

---

## 🗄️ Database Backups

### **Automated Backups (Supabase)**

Supabase automatically backs up your database:
- **Pro Plan:** Daily backups, 7-day retention
- **Team Plan:** Daily backups, 14-day retention

### **Manual Backup**

```bash
# Backup database
supabase db dump -f backup-$(date +%Y%m%d).sql

# Restore from backup
supabase db restore backup-20250101.sql
```

### **Backup Verification**

Test restore procedure monthly:
```bash
# Create test project
# Restore backup
# Verify data integrity
```

---

## 🚨 Incident Response

### **If Production Goes Down:**

1. **Check Vercel Status:**
   - [status.vercel.com](https://status.vercel.com)

2. **Check Supabase Status:**
   - [status.supabase.com](https://status.supabase.com)

3. **Check Error Logs:**
   - Vercel Dashboard → Project → Logs
   - Supabase Dashboard → Logs
   - Sentry Dashboard

4. **Rollback if Needed:**
   - Follow rollback procedure above

5. **Communicate:**
   - Update status page
   - Email affected users
   - Post on social media

---

## 📈 Scaling Considerations

### **Database:**
- Upgrade Supabase plan as needed (Pro → Team → Enterprise)
- Add read replicas for heavy reads
- Implement connection pooling

### **Application:**
- Vercel scales automatically
- Monitor bandwidth and function invocations
- Upgrade plan if needed

### **External APIs:**
- Monitor API quotas (News, Reddit, BookMyShow)
- Implement fallbacks and caching
- Upgrade plans as traffic grows

---

## ✅ Post-Deployment Verification

After deployment, verify:

1. **Homepage loads:** https://yourdomain.com
2. **Authentication works:** Sign up flow
3. **Database connected:** Can create posts
4. **Payments work:** Test subscription
5. **Emails sending:** Check Resend logs
6. **Cron jobs running:** Check logs after scheduled time
7. **APIs functional:** News, Reddit, Events loading

---

## 🎉 You're Live!

Congratulations! Your platform is now live. 

**Next steps:**
1. Monitor error rates and performance
2. Gather user feedback
3. Iterate based on data
4. Scale as needed

For support during deployment, refer to:
- Vercel Docs: [vercel.com/docs](https://vercel.com/docs)
- Supabase Docs: [supabase.com/docs](https://supabase.com/docs)
- This repository's documentation

---

**Last Updated:** October 8, 2025  
**Version:** 1.0.0-beta

