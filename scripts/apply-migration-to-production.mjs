#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration(migrationFile) {
  console.log(`\n📝 Applying migration: ${path.basename(migrationFile)}`);
  
  try {
    // Read the migration file
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    console.log('📄 SQL content:');
    console.log('─'.repeat(60));
    console.log(sql.substring(0, 500) + (sql.length > 500 ? '...' : ''));
    console.log('─'.repeat(60));
    
    // Split SQL into individual statements (basic split by semicolon)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`\n🔄 Executing ${statements.length} SQL statement(s)...`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';
      console.log(`\n  Statement ${i + 1}/${statements.length}:`);
      console.log(`  ${stmt.substring(0, 100)}...`);
      
      // Execute using PostgreSQL REST API
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ query: stmt })
      });
      
      // Try alternative: direct execution via supabase client's internal method
      if (!response.ok) {
        console.log('  ⚠️  REST API approach failed, trying direct execution...');
        
        // Use the raw query method if available
        try {
          const { data, error } = await supabase.rpc('exec_sql', { query: stmt });
          
          if (error) {
            console.error(`  ❌ Error:`, error);
            throw error;
          }
          
          console.log('  ✅ Success (via RPC)');
        } catch (rpcError) {
          // If RPC doesn't exist yet, that's expected for the first migration
          console.log('  ℹ️  exec_sql RPC not available yet (will be after this migration)');
          console.log('  ⚠️  Please run this migration manually via Supabase Dashboard SQL Editor');
          console.log('\n📋 Copy this SQL to your dashboard:\n');
          console.log(sql);
          return false;
        }
      } else {
        console.log('  ✅ Success');
      }
    }
    
    console.log('\n✅ Migration applied successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return false;
  }
}

async function main() {
  const migrationFile = process.argv[2] || 
    path.join(__dirname, '../supabase/migrations/0032_exec_sql_helper.sql');
  
  console.log('🚀 Production Migration Script');
  console.log('═'.repeat(60));
  console.log(`📁 Migration file: ${migrationFile}`);
  console.log(`🌐 Supabase URL: ${SUPABASE_URL}`);
  console.log('═'.repeat(60));
  
  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Migration file not found: ${migrationFile}`);
    process.exit(1);
  }
  
  const success = await applyMigration(migrationFile);
  
  if (!success) {
    console.log('\n⚠️  MANUAL ACTION REQUIRED:');
    console.log('1. Go to: https://supabase.com/dashboard/project/_/sql/new');
    console.log(`2. Paste the SQL from: ${migrationFile}`);
    console.log('3. Click "Run"');
    console.log('4. Then re-run this script to verify');
    process.exit(1);
  }
  
  console.log('\n🎉 All done! You can now use the execute_sql tool via MCP.');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

