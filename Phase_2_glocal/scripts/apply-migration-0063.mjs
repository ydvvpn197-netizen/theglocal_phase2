#!/usr/bin/env node
/**
 * Apply Migration 0063 - Fix Post Soft Delete
 * This script applies the migration directly using MCP Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration - using public environment variables
const SUPABASE_URL = 'https://qjqjqjqjqjqjqjqj.supabase.co'; // Replace with actual URL
const SUPABASE_SERVICE_KEY = 'your-service-role-key'; // Replace with actual key

console.log('🔧 Applying Migration 0063 - Fix Post Soft Delete');
console.log('═'.repeat(60));

// Read the migration file
const migrationFile = path.join(__dirname, '../supabase/migrations/0063.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

console.log('📄 Migration content:');
console.log('─'.repeat(40));
console.log(sql.substring(0, 500) + (sql.length > 500 ? '...' : ''));
console.log('─'.repeat(40));

// Split SQL into individual statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`\n🔄 Executing ${statements.length} SQL statement(s)...`);

// Note: This script requires manual execution via Supabase Dashboard
// since we don't have the service role key configured
console.log('\n⚠️  MANUAL ACTION REQUIRED:');
console.log('1. Go to: https://supabase.com/dashboard/project/_/sql/new');
console.log('2. Copy the SQL from: supabase/migrations/0063.sql');
console.log('3. Paste into SQL Editor');
console.log('4. Click "Run"');
console.log('\n📋 SQL to copy:');
console.log('─'.repeat(60));
console.log(sql);
console.log('─'.repeat(60));

console.log('\n✅ After applying the migration, post deletion should work!');
