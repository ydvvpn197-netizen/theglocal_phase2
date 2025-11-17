# Monitoring & Observability Guide

Complete guide to monitoring, error tracking, analytics, and performance monitoring for Theglocal platform.

**Last Updated:** January 2025

---

## 📊 Overview

Theglocal uses a comprehensive monitoring stack:

- **Error Tracking:** Sentry for error tracking and performance monitoring
- **Analytics:** Vercel Analytics for web vitals and user metrics
- **Performance:** Core Web Vitals tracking and custom metrics
- **Alerts:** Configured alerts for errors, performance, and system health

---

## 🐛 Error Tracking (Sentry)

### Setup & Configuration

Sentry is configured for client-side, server-side, and edge runtime error tracking.

#### Environment Variables

Add to your `.env.local` (development) and Vercel environment variables (production):

```bash
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ORG=your-org
SENTRY_PROJECT=theglocal
SENTRY_AUTH_TOKEN=your-auth-token
```

#### Configuration Files

- **Client:** `sentry.client.config.ts` - Browser error tracking
- **Server:** `sentry.server.config.ts` - Server-side error tracking
- **Edge:** `sentry.edge.config.ts` - Edge runtime error tracking

#### Initialization

Sentry is automatically initialized in:

- `app/layout.tsx` - Client-side initialization
- `app/error.tsx` - Error boundary integration
- `app/global-error.tsx` - Global error handler

### Features

#### Error Tracking

- Automatic error capture from React components
- Unhandled promise rejections
- API route errors
- Database errors
- External API errors

#### Performance Monitoring

- Transaction tracking for API routes
- Database query performance
- External API call performance
- Page load performance

#### Session Replay

- User session recording on errors
- Privacy-focused (masks sensitive data)
- Helps debug user-reported issues

#### Release Tracking

- Automatic release detection
- Source map upload
- Deployment tracking

### Configuration

#### Client Configuration

```typescript
// sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0, // 100% in development, lower in production
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1, // 10% of sessions
  environment: process.env.NODE_ENV,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
})
```

#### Server Configuration

```typescript
// sentry.server.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
})
```

### Error Alert Configuration

#### Alert Rules

Configure alerts in Sentry Dashboard:

1. **Critical Errors**
   - Trigger: Error rate >10 errors/minute
   - Notify: #alerts-critical Slack channel
   - Action: Page on-call engineer

2. **High Error Rate**
   - Trigger: Error rate >50 errors/hour
   - Notify: #alerts Slack channel
   - Action: Notify development team

3. **New Error Types**
   - Trigger: New error type detected
   - Notify: #alerts Slack channel
   - Action: Review and prioritize

4. **Performance Degradation**
   - Trigger: P95 response time >2s
   - Notify: #performance Slack channel
   - Action: Investigate performance

#### Notification Channels

- **Slack:** Real-time alerts to team channels
- **Email:** Daily error summaries
- **PagerDuty:** Critical alerts (optional)

### Dashboard Setup

#### Sentry Dashboard

1. **Error Overview**
   - Total errors (24h, 7d, 30d)
   - Error rate trend
   - Top error types
   - Affected users

2. **Performance Dashboard**
   - Transaction throughput
   - P50, P75, P95 response times
   - Slowest transactions
   - Database query performance

3. **Release Dashboard**
   - Release health
   - Error rate by release
   - Performance by release

#### Custom Dashboards

Create custom dashboards for:

- API endpoint performance
- Database query performance
- External API health
- User-facing errors

---

## 📈 Analytics

### Vercel Analytics

Vercel Analytics provides automatic web vitals tracking and user analytics.

#### Setup

1. **Enable in Vercel Dashboard**
   - Go to Project Settings → Analytics
   - Enable Web Analytics
   - Enable Speed Insights

2. **View Analytics**
   - Go to Vercel Dashboard → Analytics
   - View real-time and historical data

#### Metrics Tracked

- **Page Views:** Total and unique page views
- **Visitors:** Unique visitors
- **Top Pages:** Most visited pages
- **Referrers:** Traffic sources
- **Countries:** Geographic distribution
- **Devices:** Device types and browsers

#### Web Vitals

- **LCP:** Largest Contentful Paint
- **FID:** First Input Delay (deprecated, use INP)
- **CLS:** Cumulative Layout Shift
- **INP:** Interaction to Next Paint
- **TTFB:** Time to First Byte
- **FCP:** First Contentful Paint

### Custom Analytics

#### Web Vitals Endpoint

Custom Web Vitals tracking via `/api/analytics/web-vitals`:

```typescript
// Automatically called by lib/monitoring/web-vitals.ts
POST /api/analytics/web-vitals
{
  "metric": {
    "name": "LCP",
    "value": 1234,
    "rating": "good"
  },
  "page": {
    "url": "https://theglocal.in/communities",
    "pathname": "/communities"
  }
}
```

#### Custom Metrics

Track custom metrics:

```typescript
import { reportCustomMetric } from '@/lib/monitoring/web-vitals'

// Track component render time
reportCustomMetric('component_render', 150, {
  component: 'PostList',
})

// Track API call duration
reportCustomMetric('api_call', 250, {
  endpoint: '/api/posts',
  status: 200,
})

// Track database query duration
reportCustomMetric('db_query', 50, {
  query: 'get_posts',
  table: 'posts',
})
```

### User Activity Tracking

**Privacy-First Approach:**

- No personal data collection
- Anonymous user IDs only
- Aggregate data only
- No behavioral profiling
- GDPR/CCPA compliant

#### Tracked Events

- Page views (anonymized)
- Feature usage (aggregate)
- Error events
- Performance metrics

---

## ⚡ Performance Monitoring

### Core Web Vitals

#### Thresholds

- **LCP (Largest Contentful Paint):**
  - Good: ≤2.5s
  - Needs Improvement: ≤4.0s
  - Poor: >4.0s

- **INP (Interaction to Next Paint):**
  - Good: ≤200ms
  - Needs Improvement: ≤500ms
  - Poor: >500ms

- **CLS (Cumulative Layout Shift):**
  - Good: ≤0.1
  - Needs Improvement: ≤0.25
  - Poor: >0.25

- **TTFB (Time to First Byte):**
  - Good: ≤800ms
  - Needs Improvement: ≤1800ms
  - Poor: >1800ms

- **FCP (First Contentful Paint):**
  - Good: ≤1.8s
  - Needs Improvement: ≤3.0s
  - Poor: >3.0s

#### Monitoring

Web Vitals are automatically tracked and sent to:

1. **Vercel Analytics** - Automatic tracking
2. **Custom Endpoint** - `/api/analytics/web-vitals`
3. **Sentry** - Performance monitoring

### API Response Time Monitoring

#### Endpoint Performance

Monitor API endpoint performance in Sentry:

- Transaction names: `GET /api/posts`, `POST /api/posts`
- Response time percentiles (P50, P75, P95, P99)
- Error rates per endpoint
- Throughput (requests/second)

#### Database Query Performance

Monitor database query performance:

- Query duration
- Slow query detection
- Query frequency
- Index usage

#### External API Performance

Monitor external API calls:

- Google News API response times
- Reddit API response times
- BookMyShow API response times
- Razorpay API response times
- Resend API response times

### Page Load Time Tracking

Track page load times for:

- Homepage
- Community pages
- Post pages
- Artist profiles
- Event pages
- Admin dashboard

### Custom Performance Metrics

#### Component Render Time

```typescript
import { measureRenderTime } from '@/lib/monitoring/web-vitals'

// In component
const startTime = performance.now()
// ... render logic
const renderTime = performance.now() - startTime
measureRenderTime('PostList', renderTime)
```

#### API Call Duration

```typescript
import { measureAPICall } from '@/lib/monitoring/web-vitals'

const startTime = performance.now()
const response = await fetch('/api/posts')
const duration = performance.now() - startTime
measureAPICall('/api/posts', duration, response.status)
```

#### Database Query Duration

```typescript
import { measureDBQuery } from '@/lib/monitoring/web-vitals'

const startTime = performance.now()
const result = await db.query('SELECT * FROM posts')
const duration = performance.now() - startTime
measureDBQuery('get_posts', duration)
```

---

## 🚨 Alerts Configuration

### Error Rate Alerts

#### Critical Error Rate

- **Trigger:** >10 errors/minute for 5 minutes
- **Severity:** Critical
- **Notification:** Slack #alerts-critical, PagerDuty
- **Action:** Page on-call engineer

#### High Error Rate

- **Trigger:** >50 errors/hour
- **Severity:** High
- **Notification:** Slack #alerts
- **Action:** Notify development team

#### New Error Types

- **Trigger:** New error type detected
- **Severity:** Medium
- **Notification:** Slack #alerts
- **Action:** Review and prioritize

### Performance Degradation Alerts

#### API Response Time

- **Trigger:** P95 response time >2s for 10 minutes
- **Severity:** High
- **Notification:** Slack #performance
- **Action:** Investigate performance

#### Page Load Time

- **Trigger:** Average page load time >5s for 15 minutes
- **Severity:** Medium
- **Notification:** Slack #performance
- **Action:** Review page performance

#### Database Query Performance

- **Trigger:** P95 query time >1s for 10 minutes
- **Severity:** High
- **Notification:** Slack #database
- **Action:** Optimize slow queries

### Database Connection Alerts

#### Connection Pool Exhaustion

- **Trigger:** Connection pool >90% utilized
- **Severity:** Critical
- **Notification:** Slack #database, PagerDuty
- **Action:** Scale database or optimize connections

#### Database Errors

- **Trigger:** Database error rate >5 errors/minute
- **Severity:** High
- **Notification:** Slack #database
- **Action:** Investigate database issues

### Payment Failure Alerts

#### Razorpay API Failures

- **Trigger:** Razorpay API error rate >1 error/minute
- **Severity:** Critical
- **Notification:** Slack #payments, PagerDuty
- **Action:** Check Razorpay status, investigate

#### Payment Processing Failures

- **Trigger:** Payment failure rate >5% for 10 minutes
- **Severity:** Critical
- **Notification:** Slack #payments, PagerDuty
- **Action:** Investigate payment processing

### External API Failure Alerts

#### Google News API

- **Trigger:** API error rate >10 errors/hour
- **Severity:** Medium
- **Notification:** Slack #external-apis
- **Action:** Check API status, implement fallback

#### Reddit API

- **Trigger:** API error rate >10 errors/hour
- **Severity:** Medium
- **Notification:** Slack #external-apis
- **Action:** Check API status, implement fallback

#### BookMyShow API

- **Trigger:** API error rate >10 errors/hour
- **Severity:** Medium
- **Notification:** Slack #external-apis
- **Action:** Check API status, implement fallback

### System Health Alerts

#### Uptime Monitoring

- **Trigger:** Site down for >1 minute
- **Severity:** Critical
- **Notification:** Slack #uptime, PagerDuty
- **Action:** Check Vercel status, investigate

#### High CPU Usage

- **Trigger:** CPU usage >80% for 10 minutes
- **Severity:** Medium
- **Notification:** Slack #infrastructure
- **Action:** Scale resources or optimize

#### High Memory Usage

- **Trigger:** Memory usage >80% for 10 minutes
- **Severity:** Medium
- **Notification:** Slack #infrastructure
- **Action:** Scale resources or optimize

---

## 📊 Dashboard Setup

### Sentry Dashboard

#### Error Dashboard

1. **Create Dashboard**
   - Go to Sentry → Dashboards → Create Dashboard
   - Name: "Error Overview"

2. **Add Widgets**
   - Total Errors (24h)
   - Error Rate Trend
   - Top Error Types
   - Affected Users
   - Error Distribution by Release

#### Performance Dashboard

1. **Create Dashboard**
   - Name: "Performance Overview"

2. **Add Widgets**
   - Transaction Throughput
   - P95 Response Time
   - Slowest Transactions
   - Database Query Performance
   - External API Performance

### Vercel Analytics Dashboard

1. **Access Dashboard**
   - Go to Vercel Dashboard → Analytics
   - View real-time and historical data

2. **Key Metrics**
   - Page Views
   - Unique Visitors
   - Top Pages
   - Web Vitals
   - Geographic Distribution

### Custom Monitoring Dashboards

#### Grafana (Optional)

If using Grafana for custom dashboards:

1. **Connect Data Sources**
   - Sentry API
   - Vercel Analytics API
   - Database metrics
   - Custom metrics

2. **Create Dashboards**
   - System Health
   - API Performance
   - User Activity
   - Business Metrics

---

## 🔔 Alert Notification Channels

### Slack Integration

#### Channels

- **#alerts-critical:** Critical alerts only
- **#alerts:** All alerts
- **#performance:** Performance alerts
- **#database:** Database alerts
- **#payments:** Payment alerts
- **#external-apis:** External API alerts
- **#infrastructure:** Infrastructure alerts

#### Setup

1. **Sentry Slack Integration**
   - Go to Sentry → Settings → Integrations → Slack
   - Connect workspace
   - Configure channel routing

2. **Vercel Slack Integration**
   - Go to Vercel → Settings → Integrations → Slack
   - Connect workspace
   - Configure notifications

### Email Notifications

- **Daily Error Summary:** Sent at 9 AM daily
- **Weekly Performance Report:** Sent Monday mornings
- **Critical Alerts:** Immediate email notification

### PagerDuty Integration (Optional)

For critical alerts:

1. **Connect PagerDuty**
   - Go to Sentry → Settings → Integrations → PagerDuty
   - Connect account
   - Configure escalation policies

2. **Alert Routing**
   - Critical errors → PagerDuty
   - Payment failures → PagerDuty
   - Database issues → PagerDuty

---

## 📝 Monitoring Best Practices

### Error Tracking

1. **Categorize Errors**
   - Use error tags for categorization
   - Group similar errors
   - Prioritize by impact

2. **Context Information**
   - Include user context (anonymized)
   - Include request context
   - Include environment information

3. **Error Resolution**
   - Mark errors as resolved
   - Add notes to errors
   - Track error trends

### Performance Monitoring

1. **Set Baselines**
   - Establish performance baselines
   - Track performance trends
   - Identify regressions

2. **Optimize Slow Queries**
   - Identify slow database queries
   - Add indexes where needed
   - Optimize query logic

3. **Monitor External APIs**
   - Track external API performance
   - Implement fallbacks
   - Cache responses when possible

### Alert Management

1. **Avoid Alert Fatigue**
   - Set appropriate thresholds
   - Use alert grouping
   - Review and adjust alerts regularly

2. **Alert Response**
   - Respond to alerts promptly
   - Document resolutions
   - Update alert thresholds if needed

3. **Alert Review**
   - Review alerts weekly
   - Remove unnecessary alerts
   - Add missing alerts

---

## 🔧 Troubleshooting

### Sentry Not Receiving Errors

1. **Check DSN**
   - Verify `NEXT_PUBLIC_SENTRY_DSN` is set
   - Check DSN format
   - Verify project access

2. **Check Configuration**
   - Verify Sentry initialization
   - Check error boundaries
   - Verify source maps

3. **Check Network**
   - Verify Sentry API access
   - Check firewall rules
   - Verify DNS resolution

### Analytics Not Tracking

1. **Check Vercel Analytics**
   - Verify analytics is enabled
   - Check project settings
   - Verify domain configuration

2. **Check Custom Analytics**
   - Verify endpoint is accessible
   - Check endpoint logs
   - Verify metric collection

### Alerts Not Firing

1. **Check Alert Configuration**
   - Verify alert rules
   - Check thresholds
   - Verify notification channels

2. **Check Integrations**
   - Verify Slack integration
   - Check email configuration
   - Verify PagerDuty integration

---

## 📚 Additional Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Vercel Analytics Documentation](https://vercel.com/docs/analytics)
- [Web Vitals Documentation](https://web.dev/vitals/)
- [Launch Checklist](./LAUNCH_CHECKLIST.md)
- [Deployment Guide](../DEPLOYMENT.md)

---

**Last Updated:** January 2025
