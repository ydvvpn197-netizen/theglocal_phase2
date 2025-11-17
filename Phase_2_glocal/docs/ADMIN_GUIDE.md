# Admin Guide

Complete guide for administrators and moderators managing Theglocal platform.

**Last Updated:** January 2025

---

## 🎯 Overview

Theglocal admin dashboard provides tools for:

- User management
- Community management
- Content moderation
- Artist subscription management
- Analytics and reporting
- System health monitoring

**Access:** Admin dashboard is available at `/admin` (admin role required)

---

## 👥 User Management

### Viewing Users

1. **Access User List**
   - Go to Admin Dashboard → Users
   - View all registered users
   - Search by handle or email
   - Filter by status (active, banned, deleted)

2. **User Details**
   - Click on a user to view details
   - See user profile information
   - View user activity (posts, comments, communities)
   - View moderation history

### User Actions

#### Ban User

1. **Ban a User**
   - Go to user details page
   - Click "Ban User"
   - Enter ban reason
   - Set ban duration (temporary or permanent)
   - Confirm ban

2. **Ban Types**
   - **Temporary:** Ban for specified days
   - **Permanent:** Permanent ban
   - **Appealable:** User can appeal the ban

3. **Ban Effects**
   - User cannot log in
   - User's content is hidden
   - User cannot create new content

#### Unban User

1. **Unban a User**
   - Go to user details page
   - Click "Unban User"
   - Confirm unban
   - User access is restored

### User Statistics

- Total users
- Active users (7d, 30d)
- New users (24h, 7d, 30d)
- Banned users
- Deleted users

---

## 🏘️ Community Management

### Viewing Communities

1. **Access Community List**
   - Go to Admin Dashboard → Communities
   - View all communities
   - Search communities
   - Filter by status (active, archived, orphaned)

2. **Community Details**
   - Click on a community to view details
   - See community information
   - View community members
   - View community posts
   - View moderation history

### Community Actions

#### Feature Community

1. **Feature a Community**
   - Go to community details page
   - Click "Feature Community"
   - Featured communities appear prominently
   - Unfeature to remove from featured list

#### Archive Community

1. **Archive a Community**
   - Go to community details page
   - Click "Archive Community"
   - Archived communities are hidden but not deleted
   - Restore to unarchive

#### Delete Community

1. **Delete a Community**
   - Go to community details page
   - Click "Delete Community"
   - Confirm deletion
   - Community is permanently deleted

#### Orphaned Communities

1. **Find Orphaned Communities**
   - Go to Admin Dashboard → Communities → Orphaned
   - View communities with no admins
   - Assign new admins or archive

### Community Statistics

- Total communities
- Active communities
- New communities (24h, 7d, 30d)
- Communities by city
- Average members per community

---

## 🛡️ Content Moderation

### Reports Management

1. **View Reports**
   - Go to Admin Dashboard → Reports
   - View all content reports
   - Filter by status (pending, reviewed, dismissed, actioned)
   - Filter by content type (post, comment, poll, message, user)
   - Filter by community

2. **Report Details**
   - Click on a report to view details
   - See reported content
   - See reporter information
   - See report reason and context
   - View moderation history

### Moderation Actions

#### Review Report

1. **Review a Report**
   - Go to report details page
   - Review the reported content
   - Check report reason and context
   - Decide on action

2. **Report Resolution**
   - **Dismiss:** Report is invalid, no action needed
   - **Action:** Take moderation action on content
   - **Review:** Mark as reviewed for later action

#### Take Moderation Action

1. **Moderate Content**
   - Go to report details or content page
   - Click "Moderate"
   - Select action:
     - **Remove:** Remove content
     - **Dismiss:** Dismiss report
     - **Warn:** Warn user
     - **Temp Ban:** Temporarily ban user
     - **Ban:** Permanently ban user

2. **Action Details**
   - Enter reason for action
   - Link to report (if applicable)
   - Action is logged in moderation log

### Moderation Log

1. **View Moderation Log**
   - Go to Admin Dashboard → Moderation → Log
   - View all moderation actions
   - Filter by action type
   - Filter by community
   - Filter by moderator

2. **Moderation Transparency**
   - All moderation actions are public
   - Users can view moderation log
   - Appeals process available

### Appeals Process

1. **Review Appeals**
   - Go to Admin Dashboard → Appeals
   - View user appeals
   - Review appeal details
   - Review original moderation action

2. **Appeal Resolution**
   - **Uphold:** Original action stands
   - **Overturn:** Reverse original action
   - **Modify:** Modify original action

---

## 🎭 Artist Subscription Management

### Viewing Artists

1. **Access Artist List**
   - Go to Admin Dashboard → Artists
   - View all artist profiles
   - Filter by subscription status
   - Search artists

2. **Artist Details**
   - Click on an artist to view details
   - See artist profile
   - View subscription status
   - View subscription history
   - View events and bookings

### Subscription Management

1. **View Subscriptions**
   - Go to Admin Dashboard → Subscriptions
   - View all subscriptions
   - Filter by status (active, expired, cancelled)
   - View subscription analytics

2. **Subscription Actions**
   - **View Details:** See subscription information
   - **Cancel Subscription:** Cancel user subscription
   - **Extend Subscription:** Extend subscription period
   - **Refund:** Process refund (if applicable)

### Subscription Analytics

- Total subscriptions
- Active subscriptions
- Expired subscriptions
- Revenue metrics
- Subscription trends

---

## 📊 Analytics & Reporting

### Dashboard Overview

1. **Admin Dashboard**
   - Go to Admin Dashboard → Overview
   - View key metrics:
     - Total users
     - Total communities
     - Total posts
     - Total artists
     - Active users (7d, 30d)
     - Posts (24h, 7d, 30d)
     - Comments (24h, 7d, 30d)

### User Analytics

- User growth trends
- User activity metrics
- User engagement metrics
- User retention metrics
- Geographic distribution

### Community Analytics

- Community growth trends
- Community activity metrics
- Community engagement metrics
- Top communities by activity
- Communities by city

### Content Analytics

- Post creation trends
- Comment trends
- Vote trends
- Content engagement metrics
- Popular content

### Artist Analytics

- Artist subscription trends
- Artist profile views
- Event creation trends
- Booking request trends
- Artist revenue metrics

### Performance Analytics

- API response times
- Page load times
- Database query performance
- Error rates
- System health metrics

---

## 🏥 System Health Monitoring

### Health Dashboard

1. **System Health**
   - Go to Admin Dashboard → Health
   - View system status:
     - Database connection
     - External API status
     - Storage status
     - Cron job status

### Performance Monitoring

1. **Performance Metrics**
   - Go to Admin Dashboard → Performance
   - View performance metrics:
     - API response times
     - Database query times
     - Page load times
     - Error rates

### Error Monitoring

1. **Error Dashboard**
   - View error logs
   - Filter by error type
   - Filter by severity
   - View error trends

### Database Monitoring

1. **Database Health**
   - View database connection status
   - View query performance
   - View slow queries
   - View database size

### External API Monitoring

1. **API Status**
   - Google News API status
   - Reddit API status
   - BookMyShow API status
   - Razorpay API status
   - Resend API status

---

## 🔧 System Management

### Background Jobs

1. **View Jobs**
   - Go to Admin Dashboard → Jobs
   - View background job status
   - View job execution history
   - View job errors

2. **Job Types**
   - Subscription expiration
   - Renewal reminders
   - Event reminders
   - Draft cleanup
   - Geocoding processing
   - Media cleanup

### Geocoding Management

1. **Geocoding Stats**
   - Go to Admin Dashboard → Geocoding → Stats
   - View geocoding statistics
   - View pending geocoding requests
   - Process geocoding queue

### Data Management

1. **Recalculate Counts**
   - Go to Admin Dashboard → Recalculate Counts
   - Recalculate community member counts
   - Recalculate post counts
   - Recalculate comment counts

2. **Cleanup Tasks**
   - Clean up old drafts
   - Clean up orphaned media
   - Clean up old notifications

---

## 🔒 Security & RLS Policies

### Row Level Security (RLS)

1. **RLS Overview**
   - All tables have RLS enabled
   - Policies control data access
   - User context determines access

2. **Policy Management**
   - View RLS policies in Supabase
   - Policies are managed via migrations
   - Test policies before deployment

### Security Best Practices

1. **Access Control**
   - Admin endpoints require admin role
   - User endpoints require authentication
   - Public endpoints are read-only

2. **Data Protection**
   - Input validation on all inputs
   - XSS protection
   - SQL injection protection
   - Rate limiting on all endpoints

3. **Audit Logging**
   - All admin actions are logged
   - Moderation actions are logged
   - User actions are logged (anonymized)

---

## 🚨 Emergency Procedures

### Critical Issues

1. **Site Down**
   - Check Vercel status
   - Check Supabase status
   - Check error logs
   - Notify team
   - Follow rollback procedure if needed

2. **Data Breach**
   - Immediately assess scope
   - Notify security team
   - Notify affected users
   - Document incident
   - Implement fixes

3. **Payment Issues**
   - Check Razorpay status
   - Check payment logs
   - Notify finance team
   - Process refunds if needed

### Rollback Procedure

1. **When to Rollback**
   - Critical errors affecting users
   - Payment processing failures
   - Data loss or corruption
   - Security breach
   - Performance degradation

2. **Rollback Steps**
   - Identify last working deployment
   - Promote previous deployment in Vercel
   - Verify rollback successful
   - Notify team
   - Document incident

---

## 📝 Troubleshooting

### Common Issues

#### Users Cannot Log In

1. **Check Authentication**
   - Verify Supabase Auth is working
   - Check OTP delivery
   - Check session management

2. **Check User Status**
   - Verify user is not banned
   - Verify user account exists
   - Check user permissions

#### Content Not Appearing

1. **Check RLS Policies**
   - Verify RLS policies are correct
   - Check user context
   - Test policies

2. **Check Content Status**
   - Verify content is not deleted
   - Verify content is not hidden
   - Check moderation status

#### Performance Issues

1. **Check Database**
   - View slow queries
   - Check database connections
   - Optimize queries

2. **Check External APIs**
   - Verify API status
   - Check API rate limits
   - Implement caching

#### Payment Issues

1. **Check Razorpay**
   - Verify Razorpay status
   - Check webhook delivery
   - Verify API keys

2. **Check Subscriptions**
   - Verify subscription status
   - Check payment logs
   - Process manual updates if needed

---

## 📚 Additional Resources

### Documentation

- [API Documentation](../API.md)
- [Deployment Guide](../DEPLOYMENT.md)
- [Monitoring Guide](./MONITORING.md)
- [User Guide](./USER_GUIDE.md)

### Support

- **Admin Support:** admin@theglocal.com
- **Technical Support:** tech@theglocal.com
- **Emergency:** emergency@theglocal.com

---

**Last Updated:** January 2025
