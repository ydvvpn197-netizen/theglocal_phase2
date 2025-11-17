#!/usr/bin/env node

/**
 * MCP Environment Setup and Validation Script
 * 
 * This script validates the Supabase MCP server configuration
 * and provides helpful error messages for setup issues.
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('🔍 Checking Supabase MCP Configuration...\n');
console.log('=' .repeat(60));

// Check if .env.local exists
if (!existsSync('.env.local')) {
  console.error('❌ .env.local file not found!');
  console.log('\n📋 To create it, run:');
  console.log('   node scripts/setup-env.mjs');
  console.log('\nOr manually create .env.local with:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.log('   SUPABASE_URL=https://your-project.supabase.co');
  process.exit(1);
}

// Validate credentials
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📋 Environment Variables:');
console.log(`   SUPABASE_URL: ${url ? '✅ Set' : '❌ Missing'}`);
console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${key ? '✅ Set' : '❌ Missing'}`);

if (!url || !key) {
  console.error('\n❌ Missing required environment variables!');
  console.log('\n📋 Required variables:');
  console.log('   - SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('\n🔗 Testing Supabase connection...');

// Test connection
const supabase = createClient(url, key);

async function testConnection() {
  try {
    // Try a simple query to test connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      
      if (error.message.includes('JWT')) {
        console.log('\n💡 This might be a JWT/authentication issue.');
        console.log('   Check that your SUPABASE_SERVICE_ROLE_KEY is correct.');
      } else if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('\n💡 This might be a database schema issue.');
        console.log('   Make sure migrations are applied: npm run db:migrate');
      }
      
      return false;
    }
    
    console.log('✅ Connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    return false;
  }
}

async function testMCPFunctions() {
  console.log('\n🧪 Testing MCP helper functions...');
  
  try {
    // Test exec_sql function (migration 0055)
    const { data: execData, error: execError } = await supabase.rpc('exec_sql', {
      query: 'SELECT 1 as test;'
    });
    
    if (execError) {
      console.log('⚠️  exec_sql function not available (migration 0055)');
      console.log('   Some MCP features may be limited.');
    } else {
      console.log('✅ exec_sql function available');
    }
    
    // Test get_all_tables function (migration 0056)
    const { data: tablesData, error: tablesError } = await supabase.rpc('get_all_tables');
    
    if (tablesError) {
      console.log('⚠️  get_all_tables function not available (migration 0056)');
      console.log('   Some MCP features may be limited.');
    } else {
      console.log('✅ get_all_tables function available');
    }
    
    // Test get_table_info function (migration 0056)
    const { data: tableInfoData, error: tableInfoError } = await supabase.rpc('get_table_info', {
      p_table_name: 'users'
    });
    
    if (tableInfoError) {
      console.log('⚠️  get_table_info function not available (migration 0056)');
      console.log('   Some MCP features may be limited.');
    } else {
      console.log('✅ get_table_info function available');
    }
    
  } catch (error) {
    console.log('⚠️  Could not test MCP functions:', error.message);
  }
}

async function main() {
  const connected = await testConnection();
  
  if (connected) {
    await testMCPFunctions();
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 MCP Configuration Complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Restart Cursor to load MCP configuration');
    console.log('   2. Test MCP tools: npm run mcp:test');
    console.log('   3. Try asking Cursor: "List all tables in the database"');
    console.log('\n🔧 If you need to apply missing migrations:');
    console.log('   npm run db:migrate:prod');
  } else {
    console.log('\n' + '=' .repeat(60));
    console.log('❌ MCP Configuration Failed');
    console.log('\n📋 Troubleshooting:');
    console.log('   1. Check your Supabase credentials');
    console.log('   2. Ensure your project is active');
    console.log('   3. Verify database migrations are applied');
    console.log('   4. Check Supabase project settings');
  }
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
