-- ============================================
-- MIGRATION 0055: Ensure exec_sql Function Exists
-- ============================================
-- 
-- This migration creates/recreates the exec_sql helper function
-- for running migrations and queries via MCP.
-- 
-- SECURITY: This function is restricted to service_role only
-- and should never be exposed to client code.
--

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS exec_sql(text);

-- Create improved exec_sql function with better error handling
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_record RECORD;
  result_json jsonb;
  row_count integer;
BEGIN
  -- Try to execute as a query that returns results
  BEGIN
    -- For SELECT queries, return the results
    IF query ILIKE 'SELECT%' THEN
      EXECUTE query INTO result_record;
      
      IF result_record IS NOT NULL THEN
        result_json := to_jsonb(result_record);
      ELSE
        result_json := '[]'::jsonb;
      END IF;
      
      RETURN jsonb_build_object(
        'success', true,
        'data', result_json,
        'message', 'Query executed successfully'
      );
    ELSE
      -- For non-SELECT queries (DDL, DML), just execute
      EXECUTE query;
      
      GET DIAGNOSTICS row_count = ROW_COUNT;
      
      RETURN jsonb_build_object(
        'success', true,
        'affected_rows', row_count,
        'message', 'SQL executed successfully'
      );
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Return detailed error information
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'sqlstate', SQLSTATE,
        'detail', COALESCE(PG_EXCEPTION_DETAIL, 'No additional details'),
        'hint', COALESCE(PG_EXCEPTION_HINT, 'No hints available')
      );
  END;
END;
$$;

-- Revoke all public access
REVOKE ALL ON FUNCTION exec_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION exec_sql(text) FROM anon;
REVOKE ALL ON FUNCTION exec_sql(text) FROM authenticated;

-- Grant access only to service_role
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION exec_sql(text) IS 
  'Execute raw SQL queries - SERVICE_ROLE ONLY. Used by MCP server for schema inspection and policy management. USE WITH EXTREME CAUTION.';

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 0055: exec_sql function created/updated successfully';
END
$$;

