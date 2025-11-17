#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('🚀 Applying Artist Verification Status Migration\n');
  
  const statements = [
    {
      name: 'Add verification_status column',
      sql: `ALTER TABLE artists ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending'`
    },
    {
      name: 'Backfill verified status',
      sql: `UPDATE artists SET verification_status = 'verified' WHERE subscription_status IN ('trial', 'active')`
    },
    {
      name: 'Backfill pending status',
      sql: `UPDATE artists SET verification_status = 'pending' WHERE subscription_status NOT IN ('trial', 'active')`
    },
    {
      name: 'Create index',
      sql: `CREATE INDEX IF NOT EXISTS idx_artists_verification_status ON artists(verification_status)`
    },
    {
      name: 'Drop old policy (with grace period)',
      sql: `DROP POLICY IF EXISTS "Anyone can view active artists with grace period" ON artists`
    },
    {
      name: 'Drop old policy (simple)',
      sql: `DROP POLICY IF EXISTS "Anyone can view active artists" ON artists`
    },
    {
      name: 'Create new RLS policy',
      sql: `CREATE POLICY "Anyone can view verified artists or own pending" ON artists FOR SELECT USING (verification_status = 'verified' OR (verification_status = 'pending' AND auth.uid() = id))`
    }
  ];
  
  for (const stmt of statements) {
    console.log(`📝 ${stmt.name}...`);
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: stmt.sql });
      
      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
        console.error(`   SQL: ${stmt.sql}`);
      } else {
        console.log(`   ✅ Success`);
      }
    } catch (err) {
      console.error(`   ❌ Exception: ${err.message}`);
    }
  }
  
  // Verify the column exists
  console.log('\n🔍 Verifying migration...');
  const { data, error } = await supabase.from('artists').select('id, verification_status').limit(1);
  
  if (error) {
    console.error(`❌ Verification failed: ${error.message}`);
  } else {
    console.log('✅ Migration verified successfully!');
    console.log(`   Sample data: ${JSON.stringify(data)}`);
  }
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

