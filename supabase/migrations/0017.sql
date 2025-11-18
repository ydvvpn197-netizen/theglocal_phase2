-- Fix Comment Update Policy
-- Version: 0017
-- Description: Simplify UPDATE policy to allow authors to update their own comments with ownership check only
-- Date: 2025-01-27

-- Drop the existing restrictive UPDATE policy
DROP POLICY IF EXISTS "Authors can update own comments" ON comments;

-- Allow authors to update their own comments
CREATE POLICY "Authors can update own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = author_id);

-- Add comments for documentation
COMMENT ON POLICY "Authors can update own comments" ON comments IS 
  'Allows authors to update their own comments. Time-based edit restrictions and field validation are enforced at the application level.';
