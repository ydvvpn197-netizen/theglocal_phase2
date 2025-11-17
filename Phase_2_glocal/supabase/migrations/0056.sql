-- ============================================
-- MIGRATION 0056: Add MCP Helper Functions
-- ============================================
-- 
-- This migration adds helper functions for the Supabase MCP server
-- to efficiently retrieve schema information, policies, and metadata.
-- 
-- Functions added:
-- 1. get_all_policies() - Returns all RLS policies as JSON
-- 2. get_table_info(table_name) - Complete table metadata
-- 3. validate_rls_policy(table_name) - Check if RLS is enabled
-- 4. get_all_tables() - List all tables in public schema
--

-- ============================================
-- 1. GET ALL POLICIES
-- ============================================

CREATE OR REPLACE FUNCTION get_all_policies()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  policies_json jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'schemaname', schemaname,
      'tablename', tablename,
      'policyname', policyname,
      'permissive', permissive,
      'roles', roles,
      'cmd', cmd,
      'qual', qual,
      'with_check', with_check
    )
  )
  INTO policies_json
  FROM pg_policies
  WHERE schemaname = 'public';
  
  RETURN COALESCE(policies_json, '[]'::jsonb);
END;
$$;

COMMENT ON FUNCTION get_all_policies() IS 
  'Returns all RLS policies in the public schema as a JSON array';

-- ============================================
-- 2. GET TABLE INFO
-- ============================================

CREATE OR REPLACE FUNCTION get_table_info(p_table_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_info jsonb;
  columns_info jsonb;
  indexes_info jsonb;
  constraints_info jsonb;
  policies_info jsonb;
  rls_enabled boolean;
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = p_table_name
  ) THEN
    RETURN jsonb_build_object(
      'error', 'Table not found',
      'table', p_table_name
    );
  END IF;
  
  -- Get column information
  SELECT jsonb_agg(
    jsonb_build_object(
      'column_name', column_name,
      'data_type', data_type,
      'is_nullable', is_nullable,
      'column_default', column_default,
      'character_maximum_length', character_maximum_length,
      'numeric_precision', numeric_precision
    ) ORDER BY ordinal_position
  )
  INTO columns_info
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = p_table_name;
  
  -- Get index information
  SELECT jsonb_agg(
    jsonb_build_object(
      'index_name', indexname,
      'index_definition', indexdef
    )
  )
  INTO indexes_info
  FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = p_table_name;
  
  -- Get constraint information
  SELECT jsonb_agg(
    jsonb_build_object(
      'constraint_name', constraint_name,
      'constraint_type', constraint_type
    )
  )
  INTO constraints_info
  FROM information_schema.table_constraints
  WHERE table_schema = 'public' AND table_name = p_table_name;
  
  -- Get RLS policies
  SELECT jsonb_agg(
    jsonb_build_object(
      'policy_name', policyname,
      'permissive', permissive,
      'roles', roles,
      'cmd', cmd,
      'qual', qual,
      'with_check', with_check
    )
  )
  INTO policies_info
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = p_table_name;
  
  -- Check if RLS is enabled
  SELECT relrowsecurity
  INTO rls_enabled
  FROM pg_class
  WHERE relname = p_table_name
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  -- Build complete table info
  table_info := jsonb_build_object(
    'table_name', p_table_name,
    'schema', 'public',
    'rls_enabled', COALESCE(rls_enabled, false),
    'columns', COALESCE(columns_info, '[]'::jsonb),
    'indexes', COALESCE(indexes_info, '[]'::jsonb),
    'constraints', COALESCE(constraints_info, '[]'::jsonb),
    'policies', COALESCE(policies_info, '[]'::jsonb)
  );
  
  RETURN table_info;
END;
$$;

COMMENT ON FUNCTION get_table_info(text) IS 
  'Returns comprehensive metadata for a table including columns, indexes, constraints, and RLS policies';

-- ============================================
-- 3. VALIDATE RLS POLICY
-- ============================================

CREATE OR REPLACE FUNCTION validate_rls_policy(p_table_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rls_enabled boolean;
  policy_count integer;
  result jsonb;
BEGIN
  -- Check if RLS is enabled
  SELECT relrowsecurity
  INTO rls_enabled
  FROM pg_class
  WHERE relname = p_table_name
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  -- Count policies
  SELECT COUNT(*)
  INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = p_table_name;
  
  -- Build result
  result := jsonb_build_object(
    'table_name', p_table_name,
    'rls_enabled', COALESCE(rls_enabled, false),
    'policy_count', policy_count,
    'status', CASE
      WHEN NOT COALESCE(rls_enabled, false) THEN 'RLS not enabled'
      WHEN policy_count = 0 THEN 'RLS enabled but no policies defined'
      ELSE 'RLS enabled with policies'
    END
  );
  
  RETURN result;
END;
$$;

COMMENT ON FUNCTION validate_rls_policy(text) IS 
  'Validates RLS configuration for a table and returns status information';

-- ============================================
-- 4. GET ALL TABLES
-- ============================================

CREATE OR REPLACE FUNCTION get_all_tables()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tables_json jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'table_name', table_name,
      'table_type', table_type
    ) ORDER BY table_name
  )
  INTO tables_json
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
  
  RETURN COALESCE(tables_json, '[]'::jsonb);
END;
$$;

COMMENT ON FUNCTION get_all_tables() IS 
  'Returns all tables in the public schema as a JSON array';

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute to service_role only (MCP server uses service_role)
GRANT EXECUTE ON FUNCTION get_all_policies() TO service_role;
GRANT EXECUTE ON FUNCTION get_table_info(text) TO service_role;
GRANT EXECUTE ON FUNCTION validate_rls_policy(text) TO service_role;
GRANT EXECUTE ON FUNCTION get_all_tables() TO service_role;

-- Revoke from public
REVOKE ALL ON FUNCTION get_all_policies() FROM PUBLIC;
REVOKE ALL ON FUNCTION get_table_info(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_rls_policy(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_all_tables() FROM PUBLIC;

-- ============================================
-- LOG MIGRATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 0056: MCP helper functions created successfully';
  RAISE NOTICE '  - get_all_policies()';
  RAISE NOTICE '  - get_table_info(table_name)';
  RAISE NOTICE '  - validate_rls_policy(table_name)';
  RAISE NOTICE '  - get_all_tables()';
END
$$;

