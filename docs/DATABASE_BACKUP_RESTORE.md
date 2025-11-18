# Database Backup & Restore Strategy

## Overview

Theglocal uses Supabase (PostgreSQL + PostGIS) as the primary database. This document outlines backup, restore, and disaster recovery procedures.

## Automatic Backups (Supabase)

### Daily Backups

- **Frequency:** Daily at 2:00 AM UTC
- **Retention:** 7 days for free tier, 30 days for Pro
- **Scope:** Full database including schemas, data, and RLS policies
- **Location:** Supabase infrastructure (AWS S3)
- **Access:** Via Supabase Dashboard → Database → Backups

### Point-in-Time Recovery (PITR)

- **Available on:** Pro plan and above
- **Retention:** Up to 7 days
- **Granularity:** Restore to any point within retention period
- **Use case:** Recover from accidental data deletion/corruption

## Manual Backups

### Method 1: Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref your-project-ref

# Dump database
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# Dump with data
supabase db dump --data-only -f backup_data_$(date +%Y%m%d_%H%M%S).sql

# Dump schema only
supabase db dump --schema-only -f backup_schema_$(date +%Y%m%d_%H%M%S).sql
```

### Method 2: pg_dump (Direct Connection)

```bash
# Set connection details
export PGHOST=db.your-project.supabase.co
export PGPORT=5432
export PGDATABASE=postgres
export PGUSER=postgres
export PGPASSWORD=your-password

# Full backup
pg_dump -Fc -v -f backup_$(date +%Y%m%d).dump

# SQL format (human-readable)
pg_dump -f backup_$(date +%Y%m%d).sql

# Specific tables
pg_dump -t users -t posts -t communities -f backup_critical_$(date +%Y%m%d).sql
```

### Method 3: Supabase Dashboard

1. Navigate to Database → Backups
2. Click "Create Backup"
3. Enter description
4. Wait for completion
5. Download when ready

## Backup Schedule

### Production

- **Automatic:** Daily via Supabase
- **Manual:** Weekly on Sunday at 00:00 UTC
- **Pre-deployment:** Before major schema changes
- **Pre-migration:** Before running migrations

### Development/Staging

- **Manual:** As needed before risky operations
- **Frequency:** Weekly recommended

## Restore Procedures

### Restore from Supabase Backup

```bash
# Via Dashboard
1. Go to Database → Backups
2. Select backup to restore
3. Click "Restore"
4. Confirm (WARNING: Overwrites current database)

# Via CLI (PITR)
supabase db restore --timestamp "2024-11-14 10:30:00"
```

### Restore from Local Backup

```bash
# From custom format dump
pg_restore -d postgres -v backup_20241114.dump

# From SQL file
psql -d postgres -f backup_20241114.sql

# Restore specific tables
pg_restore -d postgres -t users -t posts backup_20241114.dump
```

### Restore with Migrations

```bash
# If you need to apply migrations after restore
supabase db push

# Or manually
psql -d postgres -f supabase/migrations/*.sql
```

## Disaster Recovery Plan

### Scenario 1: Accidental Data Deletion

**RTO:** 15 minutes  
**RPO:** Up to 1 day

**Steps:**

1. Identify affected tables/records
2. Use PITR to restore to point before deletion
3. Export affected data
4. Merge with current database
5. Verify data integrity

### Scenario 2: Database Corruption

**RTO:** 30 minutes  
**RPO:** Up to 1 day

**Steps:**

1. Stop all writes (maintenance mode)
2. Restore from latest backup
3. Re-apply recent migrations if needed
4. Verify schema integrity
5. Run data validation queries
6. Resume operations

### Scenario 3: Complete Database Loss

**RTO:** 1 hour  
**RPO:** Up to 1 day

**Steps:**

1. Create new Supabase project
2. Configure RLS policies (from git)
3. Apply migrations (`supabase db push`)
4. Restore data from latest backup
5. Update environment variables
6. Verify all functionality
7. Switch DNS/deployment

### Scenario 4: Schema Migration Failure

**RTO:** 10 minutes  
**RPO:** Real-time (rollback)

**Steps:**

1. Immediately rollback migration
2. Restore from pre-migration backup
3. Fix migration script
4. Test in staging
5. Re-apply corrected migration

## Data Retention Policy

### User Data

- **Active users:** Indefinite
- **Deleted accounts:** 30 days soft delete, then hard delete
- **Backup retention:** 30 days

### Content (Posts, Comments)

- **Active content:** Indefinite
- **Deleted content:** 90 days soft delete (for recovery)
- **Moderated content:** Archived indefinitely

### Transactional Data

- **Payment records:** 7 years (legal requirement)
- **Event logs:** 1 year
- **Analytics:** 2 years aggregated

## Backup Testing

### Monthly Test

- **Frequency:** First Sunday of each month
- **Process:**
  1. Download latest backup
  2. Restore to test environment
  3. Run test suite
  4. Verify critical queries
  5. Document results

### Quarterly Disaster Recovery Drill

- **Frequency:** Quarterly (Jan, Apr, Jul, Oct)
- **Process:**
  1. Simulate complete database loss
  2. Execute full recovery procedure
  3. Measure RTO/RPO
  4. Update runbook

## Backup Storage

### Primary

- **Location:** Supabase infrastructure (AWS S3)
- **Encryption:** AES-256
- **Access Control:** Supabase dashboard authentication

### Secondary (Recommended)

- **Location:** Separate cloud storage (AWS S3, Google Cloud Storage)
- **Frequency:** Weekly
- **Encryption:** Encrypted before upload
- **Access:** IAM credentials (not in version control)

```bash
# Upload to S3 (example)
aws s3 cp backup_$(date +%Y%m%d).sql.gz s3://theglocal-backups/ --sse AES256
```

## Backup Security

### Encryption

- All backups encrypted at rest
- Use strong passwords for backup files
- Never commit backup credentials to git

### Access Control

- Limit backup access to database admins
- Use IAM roles, not access keys
- Enable MFA for backup storage access
- Log all backup/restore operations

### Compliance

- GDPR: Backups retain personal data - document in privacy policy
- Right to be forgotten: Remove from backups after 30 days
- Data breach: Backups included in breach assessment

## Monitoring & Alerts

### Backup Health

- **Monitor:** Daily backup completion
- **Alert:** If backup fails 2 consecutive days
- **Action:** Investigate and manual backup

### Storage Space

- **Monitor:** Backup storage usage
- **Alert:** If >80% capacity
- **Action:** Cleanup old backups or increase quota

### Integrity Checks

- **Frequency:** Weekly
- **Method:** Restore to test environment, run validation
- **Alert:** If restore fails or data inconsistent

## Emergency Contacts

### Supabase Support

- **Email:** support@supabase.com
- **Dashboard:** https://app.supabase.com/support
- **Priority:** Pro plan includes priority support

### Internal Team

- **Database Admin:** [Primary contact]
- **Backup Admin:** [Secondary contact]
- **On-call:** [Rotation schedule]

## Backup Automation Script

```bash
#!/bin/bash
# backup-database.sh
# Add to cron: 0 2 * * 0 /path/to/backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/theglocal"
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql.gz"

# Dump database
supabase db dump | gzip > "$BACKUP_FILE"

# Upload to S3
aws s3 cp "$BACKUP_FILE" s3://theglocal-backups/ --sse AES256

# Cleanup old local backups (keep 7 days)
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete

# Send notification
echo "Backup completed: $BACKUP_FILE" | mail -s "Database Backup Success" admin@theglocal.com
```

## Verification Checklist

After any restore:

- [ ] Database accessible
- [ ] All tables present
- [ ] Row counts match expectations
- [ ] RLS policies active
- [ ] Functions and triggers working
- [ ] PostGIS extensions loaded
- [ ] Authentication working
- [ ] Critical queries returning correct data
- [ ] Application connecting successfully
- [ ] No data corruption visible

## Recovery Time Objectives (RTO)

| Scenario                   | RTO Target | Current RTO |
| -------------------------- | ---------- | ----------- |
| Single table restore       | 15 min     | 10 min      |
| Full database restore      | 1 hour     | 45 min      |
| Complete disaster recovery | 4 hours    | 2 hours     |
| Schema rollback            | 10 min     | 5 min       |

## Recovery Point Objectives (RPO)

| Data Type                       | RPO Target      | Achievable RPO |
| ------------------------------- | --------------- | -------------- |
| Critical data (users, payments) | 1 hour          | 15 min (PITR)  |
| Content (posts, comments)       | 4 hours         | 15 min (PITR)  |
| Analytics/logs                  | 24 hours        | 24 hours       |
| Session data                    | Acceptable loss | N/A            |

## Version History

| Date       | Version | Changes               |
| ---------- | ------- | --------------------- |
| 2024-11-14 | 1.0     | Initial documentation |

## Next Review

**Scheduled:** February 14, 2025  
**Responsibility:** Database Admin  
**Focus:** Update RTO/RPO based on actual incidents
