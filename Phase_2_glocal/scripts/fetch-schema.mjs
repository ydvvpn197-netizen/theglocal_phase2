#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tvkoczrfkitgwskauhxf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchSchema() {
  try {
    // Query to get complete schema information
    const schemaQuery = `
      SELECT 
        t.table_name,
        t.table_type,
        c.column_name,
        c.data_type,
        c.character_maximum_length,
        c.is_nullable,
        c.column_default,
        c.ordinal_position
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c 
        ON t.table_schema = c.table_schema 
        AND t.table_name = c.table_name
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name, c.ordinal_position;
    `;

    // Try using exec_sql function first
    const { data, error } = await supabase.rpc('exec_sql', {
      query: schemaQuery
    });

    if (error) {
      console.error('Error using exec_sql:', error);
      
      // Fallback: Use direct query (may not work with RLS)
      console.log('Trying direct information_schema query...');
      const { data: directData, error: directError } = await supabase
        .from('information_schema.columns')
        .select('table_name, column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .order('table_name')
        .order('ordinal_position');
      
      if (directError) {
        console.error('Direct query also failed:', directError);
        return;
      }
      
      console.log(JSON.stringify(directData, null, 2));
      return;
    }

    if (data) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('No data returned');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

fetchSchema();

