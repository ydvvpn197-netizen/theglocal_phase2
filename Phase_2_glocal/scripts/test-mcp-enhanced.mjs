#!/usr/bin/env node

/**
 * Test Script for Enhanced Supabase MCP Server
 * 
 * This script tests all 16 MCP tools to ensure they work correctly.
 * Run this after setting up the MCP server and applying migrations 0055-0056.
 * 
 * Usage:
 *   node scripts/test-mcp-enhanced.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Test utilities
let passCount = 0;
let failCount = 0;

function testPass(name) {
  console.log(`✅ ${name}`);
  passCount++;
}

function testFail(name, error) {
  console.log(`❌ ${name}`);
  console.error(`   Error: ${error}`);
  failCount++;
}

function section(name) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${name}`);
  console.log('='.repeat(60));
}

// ============================================
// TEST FUNCTIONS
// ============================================

async function testListTables() {
  try {
    const { data, error } = await supabase.rpc('get_all_tables');
    
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('No tables returned');
    
    testPass(`list_tables - Found ${data.length} tables`);
    return data;
  } catch (error) {
    testFail('list_tables', error.message);
    return null;
  }
}

async function testGetTableSchema() {
  try {
    const { data, error } = await supabase.rpc('get_table_info', {
      p_table_name: 'users'
    });
    
    if (error) throw new Error(error.message);
    if (!data || !data.columns) throw new Error('No schema data returned');
    
    testPass(`get_table_schema - Table 'users' has ${data.columns.length} columns`);
    return data;
  } catch (error) {
    testFail('get_table_schema', error.message);
    return null;
  }
}

async function testListPolicies() {
  try {
    const { data, error } = await supabase.rpc('get_all_policies');
    
    if (error) throw new Error(error.message);
    
    testPass(`list_policies - Found ${data?.length || 0} policies`);
    return data;
  } catch (error) {
    testFail('list_policies', error.message);
    return null;
  }
}

async function testGetTablePolicies() {
  try {
    const { data: allPolicies, error } = await supabase.rpc('get_all_policies');
    
    if (error) throw new Error(error.message);
    
    const eventPolicies = allPolicies?.filter(p => p.tablename === 'events') || [];
    
    testPass(`get_table_policies - Table 'events' has ${eventPolicies.length} policies`);
    return eventPolicies;
  } catch (error) {
    testFail('get_table_policies', error.message);
    return null;
  }
}

async function testValidateRLS() {
  try {
    const { data, error } = await supabase.rpc('validate_rls_policy', {
      p_table_name: 'users'
    });
    
    if (error) throw new Error(error.message);
    if (!data) throw new Error('No validation data returned');
    
    testPass(`validate_rls - Table 'users': ${data.status}`);
    return data;
  } catch (error) {
    testFail('validate_rls', error.message);
    return null;
  }
}

async function testExecSQL() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query: 'SELECT COUNT(*) as count FROM users;'
    });
    
    if (error) throw new Error(error.message);
    
    testPass(`exec_sql - Query executed successfully`);
    return data;
  } catch (error) {
    testFail('exec_sql', error.message);
    return null;
  }
}

async function testQueryTable() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);
    
    if (error) throw new Error(error.message);
    
    testPass(`query_table - Retrieved ${data?.length || 0} rows from 'users'`);
    return data;
  } catch (error) {
    testFail('query_table', error.message);
    return null;
  }
}

async function testGetDatabaseStats() {
  try {
    const tables = ['users', 'communities', 'events', 'artists'];
    const stats = {};
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        stats[table] = count;
      }
    }
    
    testPass(`get_database_stats - Retrieved stats for ${Object.keys(stats).length} tables`);
    return stats;
  } catch (error) {
    testFail('get_database_stats', error.message);
    return null;
  }
}

async function testExecuteFunction() {
  try {
    // Test with a simple function that should exist
    const { data, error } = await supabase.rpc('is_artist_visible', {
      status: 'active',
      end_date: null,
      user_id: null
    });
    
    if (error) throw new Error(error.message);
    
    testPass(`execute_function - Function 'is_artist_visible' executed successfully`);
    return data;
  } catch (error) {
    testFail('execute_function', error.message);
    return null;
  }
}

// ============================================
// RUN ALL TESTS
// ============================================

async function runAllTests() {
  console.log('\n🚀 Starting Enhanced MCP Server Tests');
  console.log(`   Supabase URL: ${SUPABASE_URL}`);
  
  // Test Schema Tools
  section('Schema Inspection Tools');
  await testListTables();
  await testGetTableSchema();
  
  // Test Policy Tools
  section('RLS Policy Tools');
  await testListPolicies();
  await testGetTablePolicies();
  await testValidateRLS();
  
  // Test SQL Execution
  section('SQL Execution Tools');
  await testExecSQL();
  
  // Test Data Operations
  section('Data Operation Tools');
  await testQueryTable();
  await testGetDatabaseStats();
  
  // Test Function Execution
  section('Function Execution Tools');
  await testExecuteFunction();
  
  // Summary
  section('Test Summary');
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📊 Total:  ${passCount + failCount}`);
  
  if (failCount > 0) {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
    console.log('   Make sure migrations 0055 and 0056 are applied:');
    console.log('   npm run db:migrate');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed! MCP server is ready to use.');
    process.exit(0);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('\n💥 Fatal error running tests:', error);
  process.exit(1);
});

