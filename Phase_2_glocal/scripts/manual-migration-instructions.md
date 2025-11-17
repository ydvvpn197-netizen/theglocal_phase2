# Manual Migration Instructions

## Artist Verification Status Migration

The automated migration script requires the `exec_sql` RPC function which may not be available yet. Please apply this migration manually:

### Steps:

1. Go to your Supabase Dashboard SQL Editor:
   https://supabase.com/dashboard/project/tvkoczrfkitgwskauhxf/sql/new

2. Copy and paste the following SQL:

```sql
-- Add verification_status column to artists table
ALTER TABLE artists ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

-- Set verified for artists with active/trial subscriptions
UPDATE artists SET verification_status = 'verified' WHERE subscription_status IN ('trial', 'active');

-- Set pending for all other artists
UPDATE artists SET verification_status = 'pending' WHERE subscription_status NOT IN ('trial', 'active');

-- Index on verification_status for faster queries
CREATE INDEX IF NOT EXISTS idx_artists_verification_status ON artists(verification_status);

-- Drop old artist visibility policy
DROP POLICY IF EXISTS "Anyone can view active artists with grace period" ON artists;

-- Drop old artist visibility policy (alternative name)
DROP POLICY IF EXISTS "Anyone can view active artists" ON artists;

-- Create new policy: Verified artists visible to all, pending visible only to creator
CREATE POLICY "Anyone can view verified artists or own pending" ON artists FOR SELECT USING (verification_status = 'verified' OR (verification_status = 'pending' AND auth.uid() = id));

-- Add comments
COMMENT ON COLUMN artists.verification_status IS 'Artist verification status: pending (only visible to creator) or verified (visible to all after payment)';

-- Add policy comment
COMMENT ON POLICY "Anyone can view verified artists or own pending" ON artists IS 'Verified artists are publicly visible; pending artists are only visible to their creator';
```

3. Click **RUN** to execute the migration

4. Verify the migration was successful by running:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'artists' AND column_name = 'verification_status';
```

You should see the `verification_status` column with type `text` and default `'pending'::text`.

### After Migration

Once the migration is applied, the following will work:

- ✅ New artist profiles will be created with `verification_status: 'pending'`
- ✅ Pending artists will only be visible to their creators
- ✅ After payment completion, artists will be set to `verification_status: 'verified'`
- ✅ Verified artists will be visible to all users
