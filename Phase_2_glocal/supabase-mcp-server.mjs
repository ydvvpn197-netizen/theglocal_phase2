#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to find .env.local relative to the script, then try project root
const envPaths = [
  join(__dirname, '.env.local'),
  resolve(__dirname, '.env.local'),
  '.env.local',
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.error('Warning: .env.local file not found. Attempted paths:', envPaths);
}

// Get Supabase credentials from environment
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Create MCP server
const server = new Server(
  {
    name: 'supabase-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'query_table',
        description: 'Query a Supabase table with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Name of the table to query',
            },
            columns: {
              type: 'string',
              description: 'Comma-separated list of columns to select (default: *)',
            },
            filters: {
              type: 'array',
              description: 'Array of filter objects with column, operator, and value',
              items: {
                type: 'object',
                properties: {
                  column: { type: 'string' },
                  operator: { type: 'string' },
                  value: { type: 'string' },
                },
              },
            },
            limit: {
              type: 'number',
              description: 'Maximum number of rows to return',
            },
          },
          required: ['table'],
        },
      },
      {
        name: 'insert_row',
        description: 'Insert a new row into a Supabase table',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Name of the table',
            },
            data: {
              type: 'object',
              description: 'Row data to insert',
            },
          },
          required: ['table', 'data'],
        },
      },
      {
        name: 'update_row',
        description: 'Update rows in a Supabase table',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Name of the table',
            },
            data: {
              type: 'object',
              description: 'Data to update',
            },
            filters: {
              type: 'array',
              description: 'Array of filter objects to identify rows to update',
              items: {
                type: 'object',
                properties: {
                  column: { type: 'string' },
                  operator: { type: 'string' },
                  value: { type: 'string' },
                },
              },
            },
          },
          required: ['table', 'data', 'filters'],
        },
      },
      {
        name: 'delete_row',
        description: 'Delete rows from a Supabase table',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Name of the table',
            },
            filters: {
              type: 'array',
              description: 'Array of filter objects to identify rows to delete',
              items: {
                type: 'object',
                properties: {
                  column: { type: 'string' },
                  operator: { type: 'string' },
                  value: { type: 'string' },
                },
              },
            },
          },
          required: ['table', 'filters'],
        },
      },
      {
        name: 'execute_sql',
        description: 'Execute raw SQL query (service role only)',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'SQL query to execute',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_tables',
        description: 'List all tables in the public schema',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_table_schema',
        description: 'Get schema information for a specific table',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Name of the table',
            },
          },
          required: ['table'],
        },
      },
      {
        name: 'list_policies',
        description: 'List all RLS policies in the database',
        inputSchema: {
          type: 'object',
          properties: {
            schema: {
              type: 'string',
              description: 'Schema name (default: public)',
            },
          },
        },
      },
      {
        name: 'get_table_policies',
        description: 'Get RLS policies for a specific table',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Name of the table',
            },
          },
          required: ['table'],
        },
      },
      {
        name: 'create_policy',
        description: 'Create a new RLS policy on a table',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Name of the table',
            },
            policy_name: {
              type: 'string',
              description: 'Name of the policy',
            },
            command: {
              type: 'string',
              description: 'Command type: ALL, SELECT, INSERT, UPDATE, DELETE',
            },
            using_expression: {
              type: 'string',
              description: 'USING clause for the policy',
            },
            with_check_expression: {
              type: 'string',
              description: 'WITH CHECK clause for the policy (optional)',
            },
            roles: {
              type: 'array',
              description: 'Roles to apply policy to (default: [public])',
              items: {
                type: 'string',
              },
            },
          },
          required: ['table', 'policy_name', 'command'],
        },
      },
      {
        name: 'drop_policy',
        description: 'Drop an RLS policy from a table',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Name of the table',
            },
            policy_name: {
              type: 'string',
              description: 'Name of the policy to drop',
            },
          },
          required: ['table', 'policy_name'],
        },
      },
      {
        name: 'list_functions',
        description: 'List all custom functions in the database',
        inputSchema: {
          type: 'object',
          properties: {
            schema: {
              type: 'string',
              description: 'Schema name (default: public)',
            },
          },
        },
      },
      {
        name: 'get_function_definition',
        description: 'Get the complete definition of a function',
        inputSchema: {
          type: 'object',
          properties: {
            function_name: {
              type: 'string',
              description: 'Name of the function',
            },
            schema: {
              type: 'string',
              description: 'Schema name (default: public)',
            },
          },
          required: ['function_name'],
        },
      },
      {
        name: 'execute_function',
        description: 'Execute a database function with parameters',
        inputSchema: {
          type: 'object',
          properties: {
            function_name: {
              type: 'string',
              description: 'Name of the function to execute',
            },
            args: {
              type: 'object',
              description: 'Function arguments as key-value pairs',
            },
          },
          required: ['function_name'],
        },
      },
      {
        name: 'bulk_insert',
        description: 'Insert multiple rows into a table at once',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Name of the table',
            },
            rows: {
              type: 'array',
              description: 'Array of row objects to insert',
              items: {
                type: 'object',
              },
            },
          },
          required: ['table', 'rows'],
        },
      },
      {
        name: 'get_table_count',
        description: 'Get the count of rows in a table with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Name of the table',
            },
            filters: {
              type: 'array',
              description: 'Array of filter objects',
              items: {
                type: 'object',
                properties: {
                  column: { type: 'string' },
                  operator: { type: 'string' },
                  value: { type: 'string' },
                },
              },
            },
          },
          required: ['table'],
        },
      },
      {
        name: 'get_database_stats',
        description: 'Get statistics for all tables in the database',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_storage_buckets',
        description: 'List all storage buckets',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_bucket_details',
        description: 'Get detailed information about a specific storage bucket',
        inputSchema: {
          type: 'object',
          properties: {
            bucket_name: {
              type: 'string',
              description: 'Name of the storage bucket',
            },
          },
          required: ['bucket_name'],
        },
      },
      {
        name: 'create_storage_bucket',
        description: 'Create a new storage bucket',
        inputSchema: {
          type: 'object',
          properties: {
            bucket_name: {
              type: 'string',
              description: 'Name of the storage bucket to create',
            },
            public: {
              type: 'boolean',
              description: 'Whether the bucket should be public (default: false)',
            },
            file_size_limit: {
              type: 'number',
              description: 'Maximum file size in bytes (optional)',
            },
            allowed_mime_types: {
              type: 'array',
              description: 'List of allowed MIME types (optional)',
              items: {
                type: 'string',
              },
            },
          },
          required: ['bucket_name'],
        },
      },
      {
        name: 'update_storage_bucket',
        description: 'Update storage bucket settings',
        inputSchema: {
          type: 'object',
          properties: {
            bucket_name: {
              type: 'string',
              description: 'Name of the storage bucket to update',
            },
            public: {
              type: 'boolean',
              description: 'Whether the bucket should be public',
            },
            file_size_limit: {
              type: 'number',
              description: 'Maximum file size in bytes',
            },
            allowed_mime_types: {
              type: 'array',
              description: 'List of allowed MIME types',
              items: {
                type: 'string',
              },
            },
          },
          required: ['bucket_name'],
        },
      },
      {
        name: 'delete_storage_bucket',
        description: 'Delete a storage bucket',
        inputSchema: {
          type: 'object',
          properties: {
            bucket_name: {
              type: 'string',
              description: 'Name of the storage bucket to delete',
            },
          },
          required: ['bucket_name'],
        },
      },
      {
        name: 'list_bucket_objects',
        description: 'List objects in a storage bucket',
        inputSchema: {
          type: 'object',
          properties: {
            bucket_name: {
              type: 'string',
              description: 'Name of the storage bucket',
            },
            folder: {
              type: 'string',
              description: 'Folder path within the bucket (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of objects to return',
            },
            offset: {
              type: 'number',
              description: 'Number of objects to skip',
            },
          },
          required: ['bucket_name'],
        },
      },
      {
        name: 'get_signed_url',
        description: 'Get a signed URL for accessing a file',
        inputSchema: {
          type: 'object',
          properties: {
            bucket_name: {
              type: 'string',
              description: 'Name of the storage bucket',
            },
            file_path: {
              type: 'string',
              description: 'Path to the file in the bucket',
            },
            expires_in: {
              type: 'number',
              description: 'Expiration time in seconds (default: 3600)',
            },
          },
          required: ['bucket_name', 'file_path'],
        },
      },
      {
        name: 'delete_storage_object',
        description: 'Delete an object from storage bucket',
        inputSchema: {
          type: 'object',
          properties: {
            bucket_name: {
              type: 'string',
              description: 'Name of the storage bucket',
            },
            file_path: {
              type: 'string',
              description: 'Path to the file in the bucket',
            },
          },
          required: ['bucket_name', 'file_path'],
        },
      },
      {
        name: 'get_bucket_policies',
        description: 'Get RLS policies for storage bucket',
        inputSchema: {
          type: 'object',
          properties: {
            bucket_name: {
              type: 'string',
              description: 'Name of the storage bucket',
            },
          },
          required: ['bucket_name'],
        },
      },
      {
        name: 'create_storage_policy',
        description: 'Create RLS policy for storage bucket',
        inputSchema: {
          type: 'object',
          properties: {
            bucket_name: {
              type: 'string',
              description: 'Name of the storage bucket',
            },
            policy_name: {
              type: 'string',
              description: 'Name of the policy',
            },
            command: {
              type: 'string',
              description: 'Command type: SELECT, INSERT, UPDATE, DELETE',
            },
            using_expression: {
              type: 'string',
              description: 'USING clause for the policy',
            },
            roles: {
              type: 'array',
              description: 'Roles to apply policy to (default: [public])',
              items: {
                type: 'string',
              },
            },
          },
          required: ['bucket_name', 'policy_name', 'command'],
        },
      },
      {
        name: 'drop_storage_policy',
        description: 'Drop RLS policy from storage bucket',
        inputSchema: {
          type: 'object',
          properties: {
            bucket_name: {
              type: 'string',
              description: 'Name of the storage bucket',
            },
            policy_name: {
              type: 'string',
              description: 'Name of the policy to drop',
            },
          },
          required: ['bucket_name', 'policy_name'],
        },
      },
      {
        name: 'list_users',
        description: 'Get list of authenticated users with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (default: 50)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get user details by ID or email',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID (UUID)',
            },
            email: {
              type: 'string',
              description: 'User email address',
            },
          },
        },
      },
      {
        name: 'update_user',
        description: 'Update user metadata or email',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID (UUID)',
            },
            email: {
              type: 'string',
              description: 'New email address',
            },
            user_metadata: {
              type: 'object',
              description: 'User metadata object',
            },
            app_metadata: {
              type: 'object',
              description: 'App metadata object',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'delete_user',
        description: 'Delete a user account',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID (UUID)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_user_sessions',
        description: 'List active sessions for a user',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID (UUID)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'spatial_query',
        description: 'Execute PostGIS spatial queries (distance, contains, within)',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Name of the table with geometry column',
            },
            geometry_column: {
              type: 'string',
              description: 'Name of the geometry column (default: location)',
            },
            query_type: {
              type: 'string',
              description: 'Type of spatial query: distance, contains, within, intersects',
            },
            point: {
              type: 'object',
              description: 'Point coordinates {lat, lng}',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
              },
            },
            radius: {
              type: 'number',
              description: 'Radius in meters (for distance queries)',
            },
            geometry: {
              type: 'string',
              description: 'WKT geometry string (for contains/within queries)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
            },
          },
          required: ['table', 'query_type'],
        },
      },
      {
        name: 'nearby_locations',
        description: 'Find nearby locations within radius',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Name of the table with location data',
            },
            geometry_column: {
              type: 'string',
              description: 'Name of the geometry column (default: location)',
            },
            lat: {
              type: 'number',
              description: 'Latitude of center point',
            },
            lng: {
              type: 'number',
              description: 'Longitude of center point',
            },
            radius_meters: {
              type: 'number',
              description: 'Radius in meters',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 50)',
            },
            columns: {
              type: 'string',
              description: 'Comma-separated list of columns to select (default: *)',
            },
          },
          required: ['table', 'lat', 'lng', 'radius_meters'],
        },
      },
      {
        name: 'geocode_address',
        description: 'Convert address to coordinates using PostGIS geocoding (requires pg_trgm extension)',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Address to geocode',
            },
            city: {
              type: 'string',
              description: 'City name (optional)',
            },
            country: {
              type: 'string',
              description: 'Country name (optional, default: India)',
            },
          },
          required: ['address'],
        },
      },
      {
        name: 'list_indexes',
        description: 'Get all indexes for a table or database',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Table name (optional, if not provided, returns all indexes)',
            },
            schema: {
              type: 'string',
              description: 'Schema name (default: public)',
            },
          },
        },
      },
      {
        name: 'create_index',
        description: 'Create database index',
        inputSchema: {
          type: 'object',
          properties: {
            index_name: {
              type: 'string',
              description: 'Name of the index',
            },
            table: {
              type: 'string',
              description: 'Table name',
            },
            columns: {
              type: 'array',
              description: 'Array of column names to index',
              items: { type: 'string' },
            },
            unique: {
              type: 'boolean',
              description: 'Whether the index should be unique (default: false)',
            },
            method: {
              type: 'string',
              description: 'Index method: btree, hash, gist, gin, brin (default: btree)',
            },
            schema: {
              type: 'string',
              description: 'Schema name (default: public)',
            },
          },
          required: ['index_name', 'table', 'columns'],
        },
      },
      {
        name: 'drop_index',
        description: 'Drop database index',
        inputSchema: {
          type: 'object',
          properties: {
            index_name: {
              type: 'string',
              description: 'Name of the index to drop',
            },
            schema: {
              type: 'string',
              description: 'Schema name (default: public)',
            },
            if_exists: {
              type: 'boolean',
              description: 'Do not error if index does not exist (default: true)',
            },
          },
          required: ['index_name'],
        },
      },
      {
        name: 'list_foreign_keys',
        description: 'Get foreign key relationships',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Table name (optional, if not provided, returns all foreign keys)',
            },
            schema: {
              type: 'string',
              description: 'Schema name (default: public)',
            },
          },
        },
      },
      {
        name: 'list_triggers',
        description: 'List database triggers',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Table name (optional, if not provided, returns all triggers)',
            },
            schema: {
              type: 'string',
              description: 'Schema name (default: public)',
            },
          },
        },
      },
      {
        name: 'list_views',
        description: 'List database views and their definitions',
        inputSchema: {
          type: 'object',
          properties: {
            schema: {
              type: 'string',
              description: 'Schema name (default: public)',
            },
            view_name: {
              type: 'string',
              description: 'Specific view name (optional)',
            },
          },
        },
      },
      {
        name: 'list_realtime_channels',
        description: 'Get active Realtime channels (Note: Realtime status requires Supabase API access)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of channels to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'list_edge_functions',
        description: 'List deployed Edge Functions (Note: Requires Supabase CLI or Management API access)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'query_table': {
        let query = supabase.from(args.table).select(args.columns || '*');
        
        if (args.filters && Array.isArray(args.filters)) {
          for (const filter of args.filters) {
            query = query.filter(filter.column, filter.operator, filter.value);
          }
        }
        
        if (args.limit) {
          query = query.limit(args.limit);
        }
        
        const { data, error } = await query;
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'insert_row': {
        const { data, error } = await supabase
          .from(args.table)
          .insert(args.data)
          .select();
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully inserted: ${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case 'update_row': {
        let query = supabase.from(args.table).update(args.data);
        
        if (args.filters && Array.isArray(args.filters)) {
          for (const filter of args.filters) {
            query = query.filter(filter.column, filter.operator, filter.value);
          }
        }
        
        const { data, error } = await query.select();
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully updated: ${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case 'delete_row': {
        let query = supabase.from(args.table).delete();
        
        if (args.filters && Array.isArray(args.filters)) {
          for (const filter of args.filters) {
            query = query.filter(filter.column, filter.operator, filter.value);
          }
        }
        
        const { data, error } = await query.select();
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted: ${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case 'execute_sql': {
        const { data, error } = await supabase.rpc('exec_sql', {
          query: args.query,
        });
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'list_tables': {
        // Query information_schema directly using a table we know exists
        const { data, error } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .order('table_name');
        
        if (error) {
          // Alternative: Use pg_catalog
          const { data: pgData, error: pgError } = await supabase.rpc('get_all_tables');
          
          if (pgError) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error listing tables: ${error.message}\n\nNote: Run migration 0056 to add helper functions.`,
                },
              ],
            };
          }
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(pgData, null, 2),
              },
            ],
          };
        }
        
        const tables = data.map(row => row.table_name);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ tables, count: tables.length }, null, 2),
            },
          ],
        };
      }

      case 'get_table_schema': {
        // Try using helper function first
        const { data: helperData, error: helperError } = await supabase.rpc('get_table_info', {
          p_table_name: args.table
        });
        
        if (!helperError && helperData) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(helperData, null, 2),
              },
            ],
          };
        }
        
        // Fallback: Query information_schema directly
        const { data, error } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable, column_default, character_maximum_length')
          .eq('table_schema', 'public')
          .eq('table_name', args.table)
          .order('ordinal_position');
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting schema for table '${args.table}': ${error.message}\n\nNote: Run migration 0056 to add helper functions for enhanced metadata.`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ table: args.table, columns: data, column_count: data.length }, null, 2),
            },
          ],
        };
      }

      case 'bulk_insert': {
        const { data, error } = await supabase
          .from(args.table)
          .insert(args.rows)
          .select();
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully inserted ${data.length} rows: ${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case 'get_table_count': {
        let query = supabase.from(args.table).select('*', { count: 'exact', head: true });
        
        if (args.filters && Array.isArray(args.filters)) {
          for (const filter of args.filters) {
            query = query.filter(filter.column, filter.operator, filter.value);
          }
        }
        
        const { count, error } = await query;
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Table '${args.table}' has ${count} rows${args.filters ? ' matching filters' : ''}`,
            },
          ],
        };
      }

      case 'get_database_stats': {
        const tables = ['users', 'communities', 'posts', 'comments', 'artists', 'events', 'polls', 'bookings'];
        const stats = {};
        
        for (const table of tables) {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          if (!error) {
            stats[table] = count;
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Database Statistics:\n${JSON.stringify(stats, null, 2)}`,
            },
          ],
        };
      }

      case 'list_policies': {
        const schema = args.schema || 'public';
        
        // Try using helper function first
        const { data: helperData, error: helperError } = await supabase.rpc('get_all_policies');
        
        if (!helperError && helperData) {
          const filtered = schema ? helperData.filter(p => p.schemaname === schema) : helperData;
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ schema, policies: filtered, count: filtered.length }, null, 2),
              },
            ],
          };
        }
        
        // Fallback: Query pg_policies directly
        const { data, error } = await supabase
          .from('pg_policies')
          .select('*')
          .eq('schemaname', schema);
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error listing policies: ${error.message}\n\nNote: Run migration 0056 to add helper functions.`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ schema, policies: data, count: data.length }, null, 2),
            },
          ],
        };
      }

      case 'get_table_policies': {
        const { data, error } = await supabase
          .from('pg_policies')
          .select('*')
          .eq('schemaname', 'public')
          .eq('tablename', args.table);
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting policies for table '${args.table}': ${error.message}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ table: args.table, policies: data, count: data.length }, null, 2),
            },
          ],
        };
      }

      case 'create_policy': {
        const roles = args.roles || ['public'];
        const rolesStr = roles.join(', ');
        
        let policySQL = `CREATE POLICY "${args.policy_name}" ON ${args.table}`;
        
        if (args.command && args.command !== 'ALL') {
          policySQL += ` FOR ${args.command.toUpperCase()}`;
        }
        
        policySQL += ` TO ${rolesStr}`;
        
        if (args.using_expression) {
          policySQL += ` USING (${args.using_expression})`;
        }
        
        if (args.with_check_expression) {
          policySQL += ` WITH CHECK (${args.with_check_expression})`;
        }
        
        policySQL += ';';
        
        // Execute using exec_sql if available
        const { data, error } = await supabase.rpc('exec_sql', {
          query: policySQL
        });
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error creating policy: ${error.message}\n\nSQL attempted:\n${policySQL}\n\nNote: Run migration 0055 to ensure exec_sql function exists.`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully created policy '${args.policy_name}' on table '${args.table}':\n\n${policySQL}`,
            },
          ],
        };
      }

      case 'drop_policy': {
        const dropSQL = `DROP POLICY IF EXISTS "${args.policy_name}" ON ${args.table};`;
        
        const { data, error } = await supabase.rpc('exec_sql', {
          query: dropSQL
        });
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error dropping policy: ${error.message}\n\nSQL attempted:\n${dropSQL}\n\nNote: Run migration 0055 to ensure exec_sql function exists.`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully dropped policy '${args.policy_name}' from table '${args.table}'`,
            },
          ],
        };
      }

      case 'list_functions': {
        const schema = args.schema || 'public';
        
        // Try using exec_sql for better function information
        const functionQuery = `
          SELECT 
            p.proname as function_name,
            n.nspname as schema_name,
            pg_catalog.pg_get_function_result(p.oid) as return_type,
            pg_catalog.pg_get_function_arguments(p.oid) as arguments,
            CASE 
              WHEN p.prokind = 'f' THEN 'function'
              WHEN p.prokind = 'p' THEN 'procedure'
              WHEN p.prokind = 'a' THEN 'aggregate'
              WHEN p.prokind = 'w' THEN 'window'
              ELSE 'unknown'
            END as function_kind,
            l.lanname as language,
            CASE 
              WHEN p.provolatile = 'i' THEN 'IMMUTABLE'
              WHEN p.provolatile = 's' THEN 'STABLE'
              WHEN p.provolatile = 'v' THEN 'VOLATILE'
              ELSE 'unknown'
            END as volatility,
            obj_description(p.oid, 'pg_proc') as description
          FROM pg_catalog.pg_proc p
          JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
          LEFT JOIN pg_catalog.pg_language l ON l.oid = p.prolang
          WHERE n.nspname = $1
            AND p.proname NOT LIKE 'pg_%'
            AND p.proname NOT LIKE '_pg_%'
          ORDER BY p.proname;
        `;
        
        const { data: execData, error: execError } = await supabase.rpc('exec_sql', {
          query: functionQuery.replace('$1', `'${schema}'`)
        });
        
        if (!execError && execData) {
          // If exec_sql returns an array directly
          let functions = Array.isArray(execData) ? execData : [];
          
          // If exec_sql returns a result object, extract the array
          if (execData && typeof execData === 'object' && !Array.isArray(execData)) {
            functions = execData.rows || execData.data || [];
          }
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ 
                  schema, 
                  functions: functions, 
                  count: functions.length 
                }, null, 2),
              },
            ],
          };
        }
        
        // Fallback: Query information_schema.routines directly
        const { data, error } = await supabase
          .from('information_schema.routines')
          .select('routine_name, routine_type, data_type as return_type, routine_definition')
          .eq('routine_schema', schema)
          .order('routine_name');
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error listing functions: ${error.message}\n\nNote: Run migration 0055 to ensure exec_sql function exists for enhanced function metadata.`,
              },
            ],
          };
        }
        
        // Filter out PostgreSQL internal functions
        const customFunctions = (data || []).filter(func => 
          func.routine_name && 
          !func.routine_name.startsWith('pg_') &&
          !func.routine_name.startsWith('_pg_')
        );
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ 
                schema, 
                functions: customFunctions, 
                count: customFunctions.length 
              }, null, 2),
            },
          ],
        };
      }

      case 'get_function_definition': {
        const schema = args.schema || 'public';
        
        // Use pg_get_functiondef to get the complete function definition
        const { data, error } = await supabase.rpc('exec_sql', {
          query: `SELECT pg_get_functiondef(oid) as definition 
                  FROM pg_proc 
                  WHERE proname = '${args.function_name}' 
                  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = '${schema}');`
        });
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting function definition: ${error.message}\n\nNote: Run migration 0055 to ensure exec_sql function exists.`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: data ? JSON.stringify(data, null, 2) : `Function '${args.function_name}' not found in schema '${schema}'`,
            },
          ],
        };
      }

      case 'execute_function': {
        const { data, error } = await supabase.rpc(args.function_name, args.args || {});
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error executing function '${args.function_name}': ${error.message}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Function '${args.function_name}' executed successfully:\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case 'list_storage_buckets': {
        const { data, error } = await supabase.storage.listBuckets();
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error listing buckets: ${error.message}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ buckets: data, count: data.length }, null, 2),
            },
          ],
        };
      }

      case 'get_bucket_details': {
        const { data, error } = await supabase.storage.getBucket(args.bucket_name);
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting bucket details: ${error.message}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'create_storage_bucket': {
        const bucketOptions = {
          public: args.public || false,
        };
        
        if (args.file_size_limit) {
          bucketOptions.fileSizeLimit = args.file_size_limit;
        }
        
        if (args.allowed_mime_types) {
          bucketOptions.allowedMimeTypes = args.allowed_mime_types;
        }
        
        const { data, error } = await supabase.storage.createBucket(args.bucket_name, bucketOptions);
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error creating bucket: ${error.message}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully created bucket '${args.bucket_name}': ${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case 'update_storage_bucket': {
        const bucketOptions = {};
        
        if (args.public !== undefined) {
          bucketOptions.public = args.public;
        }
        
        if (args.file_size_limit) {
          bucketOptions.fileSizeLimit = args.file_size_limit;
        }
        
        if (args.allowed_mime_types) {
          bucketOptions.allowedMimeTypes = args.allowed_mime_types;
        }
        
        const { data, error } = await supabase.storage.updateBucket(args.bucket_name, bucketOptions);
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error updating bucket: ${error.message}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully updated bucket '${args.bucket_name}': ${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case 'delete_storage_bucket': {
        const { data, error } = await supabase.storage.deleteBucket(args.bucket_name);
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error deleting bucket: ${error.message}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted bucket '${args.bucket_name}'`,
            },
          ],
        };
      }

      case 'list_bucket_objects': {
        const listOptions = {};
        
        if (args.limit) {
          listOptions.limit = args.limit;
        }
        
        if (args.offset) {
          listOptions.offset = args.offset;
        }
        
        const { data, error } = await supabase.storage
          .from(args.bucket_name)
          .list(args.folder || '', listOptions);
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error listing objects: ${error.message}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ 
                bucket: args.bucket_name, 
                folder: args.folder || '/', 
                objects: data, 
                count: data.length 
              }, null, 2),
            },
          ],
        };
      }

      case 'get_signed_url': {
        const expiresIn = args.expires_in || 3600;
        
        const { data, error } = await supabase.storage
          .from(args.bucket_name)
          .createSignedUrl(args.file_path, expiresIn);
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error creating signed URL: ${error.message}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                bucket: args.bucket_name,
                file_path: args.file_path,
                signed_url: data.signedUrl,
                expires_in: expiresIn
              }, null, 2),
            },
          ],
        };
      }

      case 'delete_storage_object': {
        const { data, error } = await supabase.storage
          .from(args.bucket_name)
          .remove([args.file_path]);
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error deleting object: ${error.message}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted '${args.file_path}' from bucket '${args.bucket_name}': ${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case 'get_bucket_policies': {
        // Storage policies are stored in the storage.objects table with RLS
        const { data, error } = await supabase
          .from('pg_policies')
          .select('*')
          .eq('schemaname', 'storage')
          .eq('tablename', 'objects');
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting storage policies: ${error.message}`,
              },
            ],
          };
        }
        
        // Filter policies that mention the bucket name
        const bucketPolicies = data.filter(policy => 
          policy.qual && policy.qual.includes(args.bucket_name)
        );
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ 
                bucket: args.bucket_name, 
                policies: bucketPolicies, 
                count: bucketPolicies.length 
              }, null, 2),
            },
          ],
        };
      }

      case 'create_storage_policy': {
        const roles = args.roles || ['public'];
        const rolesStr = roles.join(', ');
        
        let policySQL = `CREATE POLICY "${args.policy_name}" ON storage.objects`;
        
        if (args.command && args.command !== 'ALL') {
          policySQL += ` FOR ${args.command.toUpperCase()}`;
        }
        
        policySQL += ` TO ${rolesStr}`;
        
        if (args.using_expression) {
          // Add bucket name filter to the using expression
          const bucketFilter = `bucket_id = '${args.bucket_name}'`;
          const fullExpression = args.using_expression.includes('bucket_id') 
            ? args.using_expression 
            : `(${bucketFilter}) AND (${args.using_expression})`;
          policySQL += ` USING (${fullExpression})`;
        } else {
          policySQL += ` USING (bucket_id = '${args.bucket_name}')`;
        }
        
        policySQL += ';';
        
        const { data, error } = await supabase.rpc('exec_sql', {
          query: policySQL
        });
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error creating storage policy: ${error.message}\n\nSQL attempted:\n${policySQL}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully created storage policy '${args.policy_name}' for bucket '${args.bucket_name}':\n\n${policySQL}`,
            },
          ],
        };
      }

      case 'drop_storage_policy': {
        const dropSQL = `DROP POLICY IF EXISTS "${args.policy_name}" ON storage.objects;`;
        
        const { data, error } = await supabase.rpc('exec_sql', {
          query: dropSQL
        });
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error dropping storage policy: ${error.message}\n\nSQL attempted:\n${dropSQL}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully dropped storage policy '${args.policy_name}' from storage.objects`,
            },
          ],
        };
      }

      case 'list_users': {
        const limit = args.limit || 50;
        const page = args.page || 1;
        
        const { data, error } = await supabase.auth.admin.listUsers({
          page,
          perPage: limit,
        });
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error listing users: ${error.message}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                users: data.users,
                count: data.users.length,
                total: data.total,
              }, null, 2),
            },
          ],
        };
      }

      case 'get_user': {
        if (!args.user_id && !args.email) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Either user_id or email must be provided',
              },
            ],
          };
        }

        let userData;
        
        if (args.user_id) {
          const { data, error } = await supabase.auth.admin.getUserById(args.user_id);
          if (error) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error getting user: ${error.message}`,
                },
              ],
            };
          }
          userData = data.user;
        } else if (args.email) {
          const { data, error } = await supabase.auth.admin.getUserByEmail(args.email);
          if (error) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error getting user: ${error.message}`,
                },
              ],
            };
          }
          userData = data.user;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(userData, null, 2),
            },
          ],
        };
      }

      case 'update_user': {
        const updateData = {};
        
        if (args.email) {
          updateData.email = args.email;
        }
        if (args.user_metadata) {
          updateData.user_metadata = args.user_metadata;
        }
        if (args.app_metadata) {
          updateData.app_metadata = args.app_metadata;
        }
        
        const { data, error } = await supabase.auth.admin.updateUserById(
          args.user_id,
          updateData
        );
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error updating user: ${error.message}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully updated user: ${JSON.stringify(data.user, null, 2)}`,
            },
          ],
        };
      }

      case 'delete_user': {
        const { data, error } = await supabase.auth.admin.deleteUser(args.user_id);
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error deleting user: ${error.message}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted user: ${args.user_id}`,
            },
          ],
        };
      }

      case 'get_user_sessions': {
        const { data, error } = await supabase.auth.admin.listUserSessions(args.user_id);
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting user sessions: ${error.message}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                user_id: args.user_id,
                sessions: data.sessions,
                count: data.sessions?.length || 0,
              }, null, 2),
            },
          ],
        };
      }

      case 'spatial_query': {
        const geomColumn = args.geometry_column || 'location';
        const limit = args.limit || 50;
        let sqlQuery = '';
        
        if (args.query_type === 'distance' && args.point && args.radius) {
          // Use ST_DWithin for distance queries
          const point = `ST_SetSRID(ST_MakePoint(${args.point.lng}, ${args.point.lat}), 4326)`;
          sqlQuery = `
            SELECT *, ST_Distance(
              ${geomColumn}::geography,
              ${point}::geography
            ) as distance_meters
            FROM ${args.table}
            WHERE ST_DWithin(
              ${geomColumn}::geography,
              ${point}::geography,
              ${args.radius}
            )
            ORDER BY ${geomColumn} <-> ${point}
            LIMIT ${limit}
          `;
        } else if (args.query_type === 'contains' && args.geometry) {
          const geom = `ST_GeomFromText('${args.geometry}', 4326)`;
          sqlQuery = `
            SELECT *
            FROM ${args.table}
            WHERE ST_Contains(${geom}, ${geomColumn})
            LIMIT ${limit}
          `;
        } else if (args.query_type === 'within' && args.geometry) {
          const geom = `ST_GeomFromText('${args.geometry}', 4326)`;
          sqlQuery = `
            SELECT *
            FROM ${args.table}
            WHERE ST_Within(${geomColumn}, ${geom})
            LIMIT ${limit}
          `;
        } else if (args.query_type === 'intersects' && args.geometry) {
          const geom = `ST_GeomFromText('${args.geometry}', 4326)`;
          sqlQuery = `
            SELECT *
            FROM ${args.table}
            WHERE ST_Intersects(${geomColumn}, ${geom})
            LIMIT ${limit}
          `;
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Invalid query_type or missing required parameters for ${args.query_type}`,
              },
            ],
          };
        }
        
        const { data, error } = await supabase.rpc('exec_sql', {
          query: sqlQuery
        });
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error executing spatial query: ${error.message}\n\nSQL: ${sqlQuery}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ results: data, count: Array.isArray(data) ? data.length : 0 }, null, 2),
            },
          ],
        };
      }

      case 'nearby_locations': {
        const geomColumn = args.geometry_column || 'location';
        const limit = args.limit || 50;
        const columns = args.columns || '*';
        
        const point = `ST_SetSRID(ST_MakePoint(${args.lng}, ${args.lat}), 4326)`;
        const sqlQuery = `
          SELECT ${columns}, 
                 ST_Distance(
                   ${geomColumn}::geography,
                   ${point}::geography
                 ) as distance_meters
          FROM ${args.table}
          WHERE ST_DWithin(
            ${geomColumn}::geography,
            ${point}::geography,
            ${args.radius_meters}
          )
          ORDER BY ${geomColumn} <-> ${point}
          LIMIT ${limit}
        `;
        
        const { data, error } = await supabase.rpc('exec_sql', {
          query: sqlQuery
        });
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error finding nearby locations: ${error.message}\n\nSQL: ${sqlQuery}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                table: args.table,
                center: { lat: args.lat, lng: args.lng },
                radius_meters: args.radius_meters,
                results: data,
                count: Array.isArray(data) ? data.length : 0,
              }, null, 2),
            },
          ],
        };
      }

      case 'geocode_address': {
        // Note: This requires a geocoding service or function in the database
        // For now, we'll use a simple approach with existing PostGIS functions
        // In production, you'd integrate with a geocoding API like Nominatim
        const addressParts = [];
        if (args.address) addressParts.push(args.address);
        if (args.city) addressParts.push(args.city);
        if (args.country) addressParts.push(args.country);
        
        const fullAddress = addressParts.join(', ');
        
        // This is a placeholder - actual geocoding would require external API or database function
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                address: fullAddress,
                note: 'Geocoding requires integration with a geocoding service (e.g., Nominatim, Google Geocoding API). This tool is a placeholder and needs implementation based on your geocoding setup.',
                suggestion: 'Create a database function that calls your geocoding service or use an external API integration.',
              }, null, 2),
            },
          ],
        };
      }

      case 'list_indexes': {
        const schema = args.schema || 'public';
        let sqlQuery = `
          SELECT
            i.relname as index_name,
            t.relname as table_name,
            a.attname as column_name,
            ix.indisunique as is_unique,
            am.amname as index_method,
            ix.indkey as key_attrs,
            pg_get_indexdef(i.oid) as index_definition
          FROM pg_class i
          JOIN pg_am am ON i.relam = am.oid
          JOIN pg_index ix ON i.oid = ix.indexrelid
          JOIN pg_class t ON ix.indrelid = t.oid
          JOIN pg_namespace n ON t.relnamespace = n.oid
          LEFT JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
          WHERE n.nspname = '${schema}'
            AND i.relkind = 'i'
        `;
        
        if (args.table) {
          sqlQuery += ` AND t.relname = '${args.table}'`;
        }
        
        sqlQuery += ` ORDER BY t.relname, i.relname`;
        
        const { data, error } = await supabase.rpc('exec_sql', {
          query: sqlQuery
        });
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error listing indexes: ${error.message}\n\nSQL: ${sqlQuery}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                schema,
                table: args.table || 'all tables',
                indexes: data,
                count: Array.isArray(data) ? data.length : 0,
              }, null, 2),
            },
          ],
        };
      }

      case 'create_index': {
        const schema = args.schema || 'public';
        const unique = args.unique ? 'UNIQUE' : '';
        const method = args.method || 'btree';
        const columns = args.columns.join(', ');
        
        const indexSQL = `
          CREATE ${unique} INDEX ${args.index_name}
          ON ${schema}.${args.table} USING ${method} (${columns})
        `;
        
        const { data, error } = await supabase.rpc('exec_sql', {
          query: indexSQL
        });
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error creating index: ${error.message}\n\nSQL: ${indexSQL}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully created index '${args.index_name}' on ${schema}.${args.table}:\n\n${indexSQL}`,
            },
          ],
        };
      }

      case 'drop_index': {
        const schema = args.schema || 'public';
        const ifExists = args.if_exists !== false ? 'IF EXISTS' : '';
        
        const dropSQL = `DROP INDEX ${ifExists} ${schema}.${args.index_name}`;
        
        const { data, error } = await supabase.rpc('exec_sql', {
          query: dropSQL
        });
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error dropping index: ${error.message}\n\nSQL: ${dropSQL}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully dropped index '${args.index_name}' from schema '${schema}'`,
            },
          ],
        };
      }

      case 'list_foreign_keys': {
        const schema = args.schema || 'public';
        let sqlQuery = `
          SELECT
            tc.constraint_name as foreign_key_name,
            tc.table_name as table_name,
            kcu.column_name as column_name,
            ccu.table_name as referenced_table_name,
            ccu.column_name as referenced_column_name,
            rc.update_rule,
            rc.delete_rule
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name
            AND tc.table_schema = rc.constraint_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = '${schema}'
        `;
        
        if (args.table) {
          sqlQuery += ` AND tc.table_name = '${args.table}'`;
        }
        
        sqlQuery += ` ORDER BY tc.table_name, tc.constraint_name`;
        
        const { data, error } = await supabase.rpc('exec_sql', {
          query: sqlQuery
        });
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error listing foreign keys: ${error.message}\n\nSQL: ${sqlQuery}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                schema,
                table: args.table || 'all tables',
                foreign_keys: data,
                count: Array.isArray(data) ? data.length : 0,
              }, null, 2),
            },
          ],
        };
      }

      case 'list_triggers': {
        const schema = args.schema || 'public';
        let sqlQuery = `
          SELECT
            t.trigger_name,
            t.event_manipulation,
            t.event_object_table as table_name,
            t.action_statement,
            t.action_timing,
            t.action_orientation,
            t.action_condition
          FROM information_schema.triggers t
          WHERE t.trigger_schema = '${schema}'
        `;
        
        if (args.table) {
          sqlQuery += ` AND t.event_object_table = '${args.table}'`;
        }
        
        sqlQuery += ` ORDER BY t.event_object_table, t.trigger_name`;
        
        const { data, error } = await supabase.rpc('exec_sql', {
          query: sqlQuery
        });
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error listing triggers: ${error.message}\n\nSQL: ${sqlQuery}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                schema,
                table: args.table || 'all tables',
                triggers: data,
                count: Array.isArray(data) ? data.length : 0,
              }, null, 2),
            },
          ],
        };
      }

      case 'list_views': {
        const schema = args.schema || 'public';
        let sqlQuery = `
          SELECT
            v.table_name as view_name,
            v.view_definition,
            v.view_definition as definition
          FROM information_schema.views v
          WHERE v.table_schema = '${schema}'
        `;
        
        if (args.view_name) {
          sqlQuery += ` AND v.table_name = '${args.view_name}'`;
        }
        
        sqlQuery += ` ORDER BY v.table_name`;
        
        const { data, error } = await supabase.rpc('exec_sql', {
          query: sqlQuery
        });
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error listing views: ${error.message}\n\nSQL: ${sqlQuery}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                schema,
                view: args.view_name || 'all views',
                views: data,
                count: Array.isArray(data) ? data.length : 0,
              }, null, 2),
            },
          ],
        };
      }

      case 'list_realtime_channels': {
        // Note: Supabase Realtime channels are not directly queryable via the JS client
        // This would require Management API or database query to pubsub channels
        // For now, we'll query the database for Realtime publication info
        const limit = args.limit || 50;
        const sqlQuery = `
          SELECT
            schemaname,
            tablename,
            pubname as publication_name
          FROM pg_publication_tables
          WHERE pubname LIKE 'supabase_realtime%'
          ORDER BY schemaname, tablename
          LIMIT ${limit}
        `;
        
        const { data, error } = await supabase.rpc('exec_sql', {
          query: sqlQuery
        });
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  note: 'Realtime channel information requires access to PostgreSQL publications. Active channels cannot be directly queried via Supabase JS client.',
                  suggestion: 'Use Supabase Management API or query pg_publication_tables directly for publication information.',
                  publication_tables: null,
                  error: error.message,
                }, null, 2),
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                note: 'This shows Realtime publication tables. Active channel subscriptions are managed client-side.',
                publication_tables: data,
                count: Array.isArray(data) ? data.length : 0,
              }, null, 2),
            },
          ],
        };
      }

      case 'list_edge_functions': {
        // Note: Edge Functions list requires Supabase Management API
        // The JS client doesn't have direct access to function management
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                note: 'Edge Functions listing requires Supabase Management API access or Supabase CLI.',
                suggestion: 'Use Supabase CLI command: `supabase functions list` or integrate with Supabase Management API to list deployed functions.',
                management_api: 'https://api.supabase.com/v1/projects/{project_ref}/functions',
                cli_command: 'supabase functions list',
              }, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Supabase MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

