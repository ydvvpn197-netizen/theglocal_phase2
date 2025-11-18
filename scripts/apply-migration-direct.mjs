#!/usr/bin/env node
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

async function executeSql(sql) {
  // Use Supabase's PostgREST SQL endpoint
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql })
  });

  const text = await response.text();
  return { ok: response.ok, status: response.status, body: text };
}

async function runMigration() {
  console.log('🚀 Applying Artist Verification Status Migration\n');
  console.log('⚠️  If this fails, please apply the migration manually via Supabase Dashboard');
  console.log('   See: scripts/manual-migration-instructions.md\n');
  
  const fullSQL = `
    ALTER TABLE artists ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';
    UPDATE artists SET verification_status = 'verified' WHERE subscription_status IN ('trial', 'active');
    UPDATE artists SET verification_status = 'pending' WHERE subscription_status NOT IN ('trial', 'active');
    CREATE INDEX IF NOT EXISTS idx_artists_verification_status ON artists(verification_status);
    DROP POLICY IF EXISTS "Anyone can view active artists with grace period" ON artists;
    DROP POLICY IF EXISTS "Anyone can view active artists" ON artists;
    CREATE POLICY "Anyone can view verified artists or own pending" ON artists FOR SELECT USING (verification_status = 'verified' OR (verification_status = 'pending' AND auth.uid() = id));
  `.trim();

  console.log('📝 Executing migration SQL...\n');
  const result = await executeSql(fullSQL);
  
  console.log(`Status: ${result.status}`);
  console.log(`Response: ${result.body}\n`);
  
  if (!result.ok) {
    console.error('❌ Migration failed via REST API');
    console.error('\n📋 Please apply the migration manually:');
    console.error('1. Go to: https://supabase.com/dashboard/project/tvkoczrfkitgwskauhxf/sql/new');
    console.error('2. Copy SQL from: supabase/migrations/0048_add_artist_verification_status.sql');
    console.error('3. Click "Run"');
    console.error('\nOr see: scripts/manual-migration-instructions.md');
    process.exit(1);
  }
  
  console.log('✅ Migration completed successfully!');
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

