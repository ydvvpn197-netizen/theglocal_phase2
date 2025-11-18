#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const SUPABASE_URL = 'https://tvkoczrfkitgwskauhxf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2a29jenJma2l0Z3dza2F1aHhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTgxNzg1NiwiZXhwIjoyMDc1MzkzODU2fQ.yOc8_6RKNHJOSOsluZPJO4_cE7amzVtQ0isuKddUhYM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchCompleteSchema() {
  console.log('Fetching database schema using Supabase MCP server methods...\n');
  
  // Step 1: Get all tables (like list_tables MCP tool)
  console.log('1. Fetching all tables...');
  const { data: tables, error: tablesError } = await supabase.rpc('get_all_tables');
  
  if (tablesError) {
    console.error('Error fetching tables:', tablesError);
    return;
  }
  
  console.log(`   Found ${tables.length} tables\n`);
  
  // Step 2: Get schema for each table (like get_table_schema MCP tool)
  console.log('2. Fetching schema for each table...');
  const schema = {};
  
  for (const table of tables) {
    const tableName = table.table_name;
    try {
      const { data: tableInfo, error: tableError } = await supabase.rpc('get_table_info', {
        p_table_name: tableName
      });
      
      if (tableError) {
        console.error(`   ❌ Error fetching schema for ${tableName}:`, tableError.message);
        continue;
      }
      
      schema[tableName] = tableInfo;
      console.log(`   ✅ ${tableName} - ${tableInfo.columns?.length || 0} columns`);
    } catch (err) {
      console.error(`   ❌ Error fetching schema for ${tableName}:`, err.message);
    }
  }
  
  // Step 3: Get all policies (like list_policies MCP tool)
  console.log('\n3. Fetching RLS policies...');
  const { data: policies, error: policiesError } = await supabase.rpc('get_all_policies');
  
  if (policiesError) {
    console.error('   Error fetching policies:', policiesError.message);
  } else {
    console.log(`   Found ${policies?.length || 0} policies`);
  }
  
  // Step 4: Get all functions (like list_functions MCP tool)
  console.log('\n4. Fetching database functions...');
  const functionsQuery = `
    SELECT 
      routine_name,
      routine_type,
      data_type as return_type
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_type = 'FUNCTION'
    ORDER BY routine_name;
  `;
  
  let functions = [];
  try {
    const { data: funcData, error: funcError } = await supabase.rpc('exec_sql', {
      query: functionsQuery
    });
    
    if (!funcError && funcData) {
      functions = funcData;
      console.log(`   Found ${functions.length} functions`);
    }
  } catch (err) {
    console.log('   ⚠️  Could not fetch functions (exec_sql may not be available)');
  }
  
  // Compile complete schema
  const completeSchema = {
    fetched_at: new Date().toISOString(),
    tables_count: tables.length,
    tables: tables.map(t => t.table_name),
    schema: schema,
    policies: policies || [],
    functions: functions,
    summary: {
      total_tables: tables.length,
      total_columns: Object.values(schema).reduce((sum, table) => sum + (table.columns?.length || 0), 0),
      total_policies: policies?.length || 0,
      total_functions: functions.length
    }
  };
  
  // Save to file
  const outputPath = 'database-schema-from-mcp.json';
  writeFileSync(outputPath, JSON.stringify(completeSchema, null, 2));
  console.log(`\n✅ Complete schema saved to ${outputPath}`);
  console.log(`\nSummary:`);
  console.log(`   Tables: ${completeSchema.summary.total_tables}`);
  console.log(`   Columns: ${completeSchema.summary.total_columns}`);
  console.log(`   Policies: ${completeSchema.summary.total_policies}`);
  console.log(`   Functions: ${completeSchema.summary.total_functions}`);
  
  return completeSchema;
}

fetchCompleteSchema().catch(console.error);

