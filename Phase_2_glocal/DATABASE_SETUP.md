# Database Setup Guide

This guide will help you set up the Supabase database and apply migrations.

## Prerequisites

- Supabase account (created in SUPABASE_SETUP.md)
- Supabase project credentials in `.env.local`
- Supabase CLI installed (already done via npm)

## Method 1: Apply Migrations via Supabase Dashboard (Recommended for Production)

### Step 1: Access SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Apply Schema Migration

1. Open `supabase/migrations/0001_initial_schema.sql`
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **Run** or press `Ctrl+Enter`
5. Verify: You should see "Success. No rows returned"

### Step 3: Apply RLS Policies

1. Open `supabase/migrations/0002_rls_policies.sql`
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **Run** or press `Ctrl+Enter`
5. Verify: Check **Database > Tables** to see all tables

### Step 4: Generate TypeScript Types

Once migrations are applied:

```bash
# Link to your remote project (one-time setup)
npx supabase link --project-ref your-project-ref

# Generate types from remote database
npm run generate-types
```

Your project ref can be found in:

- Supabase Dashboard → Project Settings → General → Reference ID

## Method 2: Local Development with Supabase CLI

### Step 1: Initialize Supabase Locally

```bash
# Start local Supabase (requires Docker)
npm run db:start
```

This will:

- Start PostgreSQL database locally
- Apply all migrations automatically
- Start Supabase Studio on http://localhost:54323

### Step 2: Update Local Environment

The local Supabase uses different URLs:

```bash
# Add to .env.local for local development
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key-from-terminal>
```

### Step 3: Generate Types from Local Database

```bash
npm run generate-types
```

### Useful Local Commands

```bash
# Stop local Supabase
npm run db:stop

# Reset database (reapply all migrations)
npm run db:reset

# Push new migrations
npm run db:migrate
```

## Verifying the Setup

### Check Tables Exist

In Supabase Dashboard → Database → Tables, you should see:

- ✅ users
- ✅ communities
- ✅ community_members
- ✅ posts
- ✅ comments
- ✅ votes
- ✅ polls
- ✅ poll_options
- ✅ poll_votes
- ✅ artists
- ✅ events
- ✅ event_rsvps
- ✅ bookings
- ✅ booking_messages
- ✅ reports
- ✅ moderation_log

### Check RLS is Enabled

In Supabase Dashboard → Database → Tables → Select any table:

- Go to **Policies** tab
- You should see multiple policies for each table
- RLS should show as **Enabled**

### Test Database Connection

Create a simple test:

```typescript
import { createClient } from '@/lib/supabase/client'

async function testConnection() {
  const supabase = createClient()
  const { data, error } = await supabase.from('communities').select('count')

  if (error) {
    console.error('Database connection failed:', error)
  } else {
    console.log('Database connected successfully!')
  }
}
```

## Creating New Migrations

When you need to make database changes:

### Step 1: Create Migration File

```bash
# Create a new migration file
npx supabase migration new your_migration_name
```

### Step 2: Write SQL

Edit the generated file in `supabase/migrations/`:

```sql
-- Example: Add new column
ALTER TABLE users ADD COLUMN last_login TIMESTAMPTZ;

-- Create index
CREATE INDEX idx_users_last_login ON users(last_login);
```

### Step 3: Apply Migration

**Local:**

```bash
npm run db:reset  # Reapplies all migrations
```

**Production:**

- Copy migration SQL
- Paste in Supabase SQL Editor
- Run

**Or use Supabase CLI:**

```bash
npm run db:migrate
```

## Troubleshooting

### "relation already exists" Error

This means the migration was partially applied. To fix:

1. Drop the affected tables manually
2. Or use `DROP TABLE IF EXISTS` in migrations

### RLS Policies Blocking Queries

If you're getting permission denied errors:

1. Check that RLS policies are correct
2. Verify user is authenticated
3. Test with service role key (bypasses RLS) to confirm query works

### Types Not Generating

Make sure:

```bash
# Link your project first
npx supabase link --project-ref your-ref

# Then generate
npm run generate-types
```

### Local Supabase Won't Start

Requires Docker Desktop:

- Windows/Mac: Install Docker Desktop
- Linux: Install Docker Engine

## Best Practices

### Development Workflow

1. **Local Development:**
   - Use `npm run db:start` for local testing
   - Test migrations locally first
   - Generate types from local database

2. **Staging:**
   - Apply migrations to staging database
   - Test thoroughly
   - Verify RLS policies work

3. **Production:**
   - Backup database first
   - Apply migrations during low-traffic period
   - Monitor for errors
   - Have rollback plan ready

### Migration Guidelines

- ✅ Always use transactions for complex migrations
- ✅ Test migrations locally first
- ✅ Include rollback instructions in comments
- ✅ Never delete data in migrations (use soft deletes)
- ✅ Add indexes for new columns that will be queried

### RLS Policy Testing

Always test RLS policies as different users:

```typescript
// Test as regular user
const { data, error } = await supabase.from('posts').select('*')

// Test should only return posts from joined communities
```

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostGIS Documentation](https://postgis.net/documentation/)
