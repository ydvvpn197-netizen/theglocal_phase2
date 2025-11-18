# How to Apply Migrations to Your Supabase Project

Follow these steps to apply the database migrations to your Supabase project.

## Quick Steps

### Step 1: Access Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your **theglocal** project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Apply Schema Migration

1. Open the file: `supabase/migrations/0001_initial_schema.sql`
2. **Copy ALL contents** (Ctrl+A, Ctrl+C)
3. **Paste** into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. ✅ You should see: "Success. No rows returned"

**What this does:**

- Creates all 17 tables (users, communities, posts, artists, etc.)
- Enables PostGIS for location features
- Creates 29 indexes for performance
- Sets up triggers for auto-updating counts

### Step 3: Apply RLS Policies

1. Open the file: `supabase/migrations/0002_rls_policies.sql`
2. **Copy ALL contents** (Ctrl+A, Ctrl+C)
3. **Paste** into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. ✅ You should see: "Success. No rows returned"

**What this does:**

- Enables Row Level Security on all tables
- Creates 40+ security policies
- Protects user privacy (poll votes anonymous, etc.)
- Restricts data access based on roles

### Step 4: Verify Success

**Check Tables:**

1. Go to **Database → Tables** in Supabase Dashboard
2. You should see all 16 tables:
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

**Check RLS Policies:**

1. Click on any table (e.g., "users")
2. Click the **Policies** tab
3. You should see multiple policies listed
4. RLS status should show **"Enabled"**

### Step 5: Generate TypeScript Types

Once migrations are applied, generate types for your IDE:

```bash
# Link to your Supabase project (one-time setup)
npx supabase link --project-ref YOUR_PROJECT_REF

# Generate TypeScript types
npm run generate-types
```

**Where to find your project ref:**

- Supabase Dashboard → Settings → General → Reference ID
- Or from your project URL: `https://YOUR_PROJECT_REF.supabase.co`

## Troubleshooting

### Error: "relation already exists"

**Solution:** Table was partially created. Drop it first:

```sql
DROP TABLE IF EXISTS table_name CASCADE;
```

Then re-run the migration.

### Error: "permission denied"

**Solution:** Make sure you're running queries in the SQL Editor (not via client).

### Error: "extension does not exist"

**Solution:** PostGIS might not be available. Contact Supabase support or use their PostGIS-enabled projects.

### Migration seems stuck

**Solution:**

- Check for syntax errors
- Run migrations one at a time (split the file)
- Check Database → Logs for error details

## After Migration Success

✅ **Your database is now production-ready!**

What you have:

- Complete database schema
- Security policies protecting user data
- Performance indexes
- Triggers maintaining data integrity

**Next steps:**

1. Test database connection in your app
2. Start building features!
3. Monitor Database → Logs for any issues

## Alternative: Use Supabase CLI (Advanced)

If you prefer using the CLI:

```bash
# Link your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
npm run db:migrate
```

This automatically applies all migrations from the `supabase/migrations/` folder.

## Need Help?

- Check `DATABASE_SETUP.md` for detailed guide
- Supabase Docs: https://supabase.com/docs/guides/database
- Supabase Discord: https://discord.supabase.com

---

**Once migrations are applied, you're ready to build!** 🚀
