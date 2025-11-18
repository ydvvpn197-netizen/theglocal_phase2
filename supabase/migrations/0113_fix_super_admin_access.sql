-- ============================================
-- FIX SUPER ADMIN ACCESS
-- ============================================
-- Allow super admins to bypass membership requirements
-- Super admins can post, comment, leave, and join communities without membership restrictions
-- Version: 0113
-- Date: 2025-01-29

SET search_path TO public;

-- ============================================
-- PART 1: CREATE SUPER ADMIN HELPER FUNCTION
-- ============================================

-- Function to check if user is super admin (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION is_super_admin_safe(user_id_param UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  check_user_id UUID;
  user_is_super_admin BOOLEAN;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  check_user_id := COALESCE(user_id_param, auth.uid());
  
  IF check_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has super admin flag (SECURITY DEFINER bypasses RLS)
  SELECT is_super_admin INTO user_is_super_admin
  FROM users
  WHERE id = check_user_id;
  
  RETURN COALESCE(user_is_super_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_super_admin_safe(UUID) TO authenticated, anon;

-- ============================================
-- PART 2: UPDATE MEMBERSHIP CHECK FUNCTIONS
-- ============================================

-- Update is_community_member_safe to return true for super admins
CREATE OR REPLACE FUNCTION is_community_member_safe(community_id_param UUID, user_id_param UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  check_user_id UUID;
BEGIN
  check_user_id := COALESCE(user_id_param, auth.uid());
  
  IF check_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Super admins are always considered members
  IF is_super_admin_safe(check_user_id) THEN
    RETURN true;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = community_id_param
    AND user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update can_view_community_safe to allow super admins
CREATE OR REPLACE FUNCTION can_view_community_safe(community_id_param UUID, user_id_param UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  community_is_private BOOLEAN;
  user_is_member BOOLEAN;
  check_user_id UUID;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  check_user_id := COALESCE(user_id_param, auth.uid());
  
  -- Super admins can view all communities
  IF check_user_id IS NOT NULL AND is_super_admin_safe(check_user_id) THEN
    RETURN true;
  END IF;
  
  -- Get community privacy setting (SECURITY DEFINER bypasses RLS)
  SELECT is_private INTO community_is_private
  FROM communities
  WHERE id = community_id_param;
  
  -- If community doesn't exist, return false
  IF community_is_private IS NULL THEN
    RETURN false;
  END IF;
  
  -- If community is public, everyone can view it
  IF community_is_private = false THEN
    RETURN true;
  END IF;
  
  -- If no user is authenticated, they can't view private communities
  IF check_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is a member of the private community
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = community_id_param
    AND user_id = check_user_id
  ) INTO user_is_member;
  
  RETURN user_is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update can_view_post_safe to allow super admins
CREATE OR REPLACE FUNCTION can_view_post_safe(post_id_param UUID, user_id_param UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  post_community_id UUID;
  post_is_deleted BOOLEAN;
  check_user_id UUID;
BEGIN
  check_user_id := COALESCE(user_id_param, auth.uid());
  
  -- Super admins can view all posts
  IF check_user_id IS NOT NULL AND is_super_admin_safe(check_user_id) THEN
    -- Still check if post is deleted
    SELECT community_id, is_deleted 
    INTO post_community_id, post_is_deleted
    FROM posts
    WHERE id = post_id_param;
    
    IF post_community_id IS NULL OR post_is_deleted = true THEN
      RETURN false;
    END IF;
    
    RETURN true;
  END IF;
  
  -- Get post's community and deletion status (SECURITY DEFINER bypasses RLS)
  SELECT community_id, is_deleted 
  INTO post_community_id, post_is_deleted
  FROM posts
  WHERE id = post_id_param;
  
  -- If post doesn't exist or is deleted, return false
  IF post_community_id IS NULL OR post_is_deleted = true THEN
    RETURN false;
  END IF;
  
  -- Check if user can view the community this post belongs to
  RETURN can_view_community_safe(post_community_id, check_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- PART 3: UPDATE POST CREATION FUNCTION
-- ============================================

-- Update create_post_with_media to bypass membership check for super admins
CREATE OR REPLACE FUNCTION create_post_with_media(
    p_community_id UUID,
    p_title TEXT,
    p_body TEXT DEFAULT NULL,
    p_external_url TEXT DEFAULT NULL,
    p_location_city TEXT DEFAULT NULL,
    p_media_items JSONB DEFAULT '[]'::jsonb
) RETURNS TABLE (
    post_id UUID,
    media_count INTEGER,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    new_post_id UUID;
    media_item JSONB;
    media_counter INTEGER := 0;
    current_user_id UUID;
    user_location TEXT;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN QUERY SELECT null::UUID, 0, false, 'Authentication required';
        RETURN;
    END IF;
    
    -- Get user location
    SELECT location_city INTO user_location FROM users WHERE id = current_user_id;
    
    -- Validate community membership (skip for super admins)
    IF NOT is_super_admin_safe(current_user_id) THEN
        IF NOT EXISTS (
            SELECT 1 FROM community_members 
            WHERE community_id = p_community_id AND user_id = current_user_id
        ) THEN
            RETURN QUERY SELECT null::UUID, 0, false, 'Must be a community member to post';
            RETURN;
        END IF;
    END IF;
    
    BEGIN
        -- Create the post
        INSERT INTO posts (
            community_id,
            author_id,
            title,
            body,
            external_url,
            location_city,
            media_count
        ) VALUES (
            p_community_id,
            current_user_id,
            p_title,
            p_body,
            p_external_url,
            COALESCE(p_location_city, user_location),
            CASE 
                WHEN p_media_items IS NULL OR jsonb_typeof(p_media_items) != 'array' 
                THEN 0 
                ELSE jsonb_array_length(p_media_items) 
            END
        ) RETURNING id INTO new_post_id;
        
        -- Insert media items if provided
        IF p_media_items IS NOT NULL 
           AND jsonb_typeof(p_media_items) = 'array' 
           AND jsonb_array_length(p_media_items) > 0 THEN
            FOR media_item IN SELECT * FROM jsonb_array_elements(p_media_items)
            LOOP
                -- Validate required fields
                IF media_item->>'url' IS NULL OR media_item->>'url' = '' THEN
                    RAISE WARNING 'Media item missing URL, skipping';
                    CONTINUE;
                END IF;
                
                IF media_item->>'mediaType' IS NULL OR media_item->>'mediaType' NOT IN ('image', 'video', 'gif') THEN
                    RAISE WARNING 'Invalid mediaType: %, skipping', media_item->>'mediaType';
                    CONTINUE;
                END IF;
                
                -- Insert media item with validation
                INSERT INTO media_items (
                    owner_type,
                    owner_id,
                    media_type,
                    url,
                    variants,
                    display_order,
                    duration,
                    thumbnail_url,
                    file_size,
                    mime_type,
                    alt_text
                ) VALUES (
                    'post',
                    new_post_id,
                    (media_item->>'mediaType')::media_type,
                    media_item->>'url',
                    COALESCE(media_item->'variants', '{}'::jsonb),
                    media_counter,
                    CASE 
                        WHEN media_item->>'duration' IS NOT NULL 
                        THEN (media_item->>'duration')::INTEGER 
                        ELSE NULL 
                    END,
                    media_item->>'thumbnailUrl',
                    CASE 
                        WHEN media_item->>'fileSize' IS NOT NULL 
                        THEN (media_item->>'fileSize')::BIGINT 
                        ELSE NULL 
                    END,
                    media_item->>'mimeType',
                    COALESCE(media_item->>'altText', media_item->>'mediaType' || ' attachment')
                );
                
                media_counter := media_counter + 1;
            END LOOP;
        END IF;
        
        -- Return success
        RETURN QUERY SELECT new_post_id, media_counter, true, null::TEXT;
        
    EXCEPTION WHEN OTHERS THEN
        -- Return error
        RETURN QUERY SELECT null::UUID, 0, false, SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 4: UPDATE COMMENT CREATION FUNCTION
-- ============================================

-- Update create_comment_with_media to bypass membership check for super admins
CREATE OR REPLACE FUNCTION create_comment_with_media(
    p_post_id UUID,
    p_body TEXT,
    p_parent_id UUID DEFAULT NULL,
    p_media_items JSONB DEFAULT '[]'::jsonb
) RETURNS TABLE (
    comment_id UUID,
    media_count INTEGER,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    new_comment_id UUID;
    media_item JSONB;
    media_counter INTEGER := 0;
    current_user_id UUID;
    post_community_id UUID;
    is_member BOOLEAN := false;
    post_exists BOOLEAN := false;
    parent_comment_exists BOOLEAN := false;
    parent_depth INTEGER := 0;
BEGIN
    -- Get current auth user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN QUERY SELECT null::UUID, 0, false, 'Authentication required. Please sign in to comment.';
        RETURN;
    END IF;
    
    -- Validate post exists and get community
    SELECT community_id, true INTO post_community_id, post_exists 
    FROM posts 
    WHERE id = p_post_id AND is_deleted = false;
    
    IF NOT post_exists OR post_community_id IS NULL THEN
        RETURN QUERY SELECT null::UUID, 0, false, 'Post not found or has been deleted.';
        RETURN;
    END IF;
    
    -- Validate community membership (skip for super admins)
    IF is_super_admin_safe(current_user_id) THEN
        is_member := true;
    ELSE
        SELECT EXISTS (
            SELECT 1 FROM community_members 
            WHERE community_id = post_community_id 
            AND user_id = auth.uid()
        ) INTO is_member;
    END IF;
    
    IF NOT is_member THEN
        RETURN QUERY SELECT null::UUID, 0, false, 'You must be a member of this community to comment. Please join the community first.';
        RETURN;
    END IF;
    
    -- Validate parent comment if provided
    IF p_parent_id IS NOT NULL THEN
        -- Check if parent comment exists
        SELECT EXISTS (
            SELECT 1 FROM comments
            WHERE id = p_parent_id
            AND post_id = p_post_id
            AND is_deleted = false
        ) INTO parent_comment_exists;
        
        IF NOT parent_comment_exists THEN
            RETURN QUERY SELECT null::UUID, 0, false, 'Parent comment not found or has been deleted.';
            RETURN;
        END IF;
        
        -- Calculate parent depth
        WITH RECURSIVE comment_depth AS (
            SELECT id, parent_comment_id, 0 as depth
            FROM comments
            WHERE id = p_parent_id
            
            UNION ALL
            
            SELECT c.id, c.parent_comment_id, cd.depth + 1
            FROM comments c
            INNER JOIN comment_depth cd ON c.parent_comment_id = cd.id
            WHERE cd.depth < 10
        )
        SELECT MAX(depth) INTO parent_depth FROM comment_depth;
        
        IF parent_depth >= 10 THEN
            RETURN QUERY SELECT null::UUID, 0, false, 'Maximum nesting depth reached. Comments can only be nested up to 10 levels deep.';
            RETURN;
        END IF;
    END IF;
    
    -- Validate media items structure
    IF p_media_items IS NOT NULL AND jsonb_typeof(p_media_items) != 'array' THEN
        RETURN QUERY SELECT null::UUID, 0, false, 'Invalid media items format. Media items must be an array.';
        RETURN;
    END IF;
    
    -- Validate comment has content (text or media)
    IF (p_body IS NULL OR trim(p_body) = '') AND 
       (p_media_items IS NULL OR jsonb_typeof(p_media_items) != 'array' OR jsonb_array_length(p_media_items) = 0) THEN
        RETURN QUERY SELECT null::UUID, 0, false, 'Comment must contain text or at least one media item.';
        RETURN;
    END IF;
    
    BEGIN
        -- Create the comment with safe media count calculation
        INSERT INTO comments (
            post_id,
            parent_comment_id,
            author_id,
            body,
            media_count,
            is_deleted,
            is_edited
        ) VALUES (
            p_post_id,
            p_parent_id,
            current_user_id,
            COALESCE(trim(p_body), ''),
            CASE 
                WHEN p_media_items IS NULL OR jsonb_typeof(p_media_items) != 'array' 
                THEN 0 
                ELSE jsonb_array_length(p_media_items) 
            END,
            false,
            false
        ) RETURNING id INTO new_comment_id;
        
        -- Insert media items if provided and valid
        IF p_media_items IS NOT NULL 
           AND jsonb_typeof(p_media_items) = 'array' 
           AND jsonb_array_length(p_media_items) > 0 THEN
            FOR media_item IN SELECT * FROM jsonb_array_elements(p_media_items)
            LOOP
                -- Validate media item structure
                IF media_item->>'id' IS NULL OR media_item->>'url' IS NULL OR media_item->>'mediaType' IS NULL THEN
                    RAISE WARNING 'Skipping invalid media item: missing required fields';
                    CONTINUE;
                END IF;
                
                -- Validate mediaType enum
                IF (media_item->>'mediaType')::text NOT IN ('image', 'video', 'gif') THEN
                    RAISE WARNING 'Skipping invalid media item: invalid mediaType %', media_item->>'mediaType';
                    CONTINUE;
                END IF;
                
                INSERT INTO media_items (
                    owner_type,
                    owner_id,
                    media_type,
                    url,
                    variants,
                    display_order,
                    duration,
                    thumbnail_url,
                    file_size,
                    mime_type,
                    alt_text
                ) VALUES (
                    'comment',
                    new_comment_id,
                    (media_item->>'mediaType')::media_type,
                    media_item->>'url',
                    COALESCE(media_item->'variants', '{}'::jsonb),
                    media_counter,
                    CASE 
                        WHEN media_item->>'duration' IS NOT NULL 
                        THEN (media_item->>'duration')::INTEGER 
                        ELSE NULL 
                    END,
                    media_item->>'thumbnailUrl',
                    CASE 
                        WHEN media_item->>'fileSize' IS NOT NULL 
                        THEN (media_item->>'fileSize')::BIGINT 
                        ELSE NULL 
                    END,
                    media_item->>'mimeType',
                    COALESCE(media_item->>'altText', media_item->>'mediaType' || ' attachment')
                );
                
                media_counter := media_counter + 1;
            END LOOP;
        END IF;
        
        -- Return success
        RETURN QUERY SELECT new_comment_id, media_counter, true, null::TEXT;
        
    EXCEPTION 
        WHEN unique_violation THEN
            RETURN QUERY SELECT null::UUID, 0, false, 'This comment already exists.';
        WHEN foreign_key_violation THEN
            RETURN QUERY SELECT null::UUID, 0, false, 'Invalid reference. Post or parent comment may have been deleted.';
        WHEN check_violation THEN
            RETURN QUERY SELECT null::UUID, 0, false, 'Comment validation failed. Please check your input.';
        WHEN OTHERS THEN
            -- Log the error for debugging
            RAISE WARNING 'Error creating comment: %', SQLERRM;
            RETURN QUERY SELECT null::UUID, 0, false, 'An unexpected error occurred while creating your comment. Please try again.';
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 5: UPDATE RLS POLICIES FOR POSTS
-- ============================================

-- Drop existing policy
DROP POLICY IF EXISTS "Members can create posts" ON posts;

-- Recreate policy with super admin exemption
CREATE POLICY "Members can create posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    NOT is_user_banned_safe(auth.uid()) AND
    (
      is_community_member_safe(community_id, auth.uid()) OR
      is_super_admin_safe(auth.uid())
    )
  );

-- ============================================
-- PART 6: UPDATE RLS POLICIES FOR COMMENTS
-- ============================================

-- Drop existing policy
DROP POLICY IF EXISTS "Users can create comments on accessible posts" ON comments;

-- Recreate policy with super admin exemption
CREATE POLICY "Users can create comments on accessible posts"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    NOT is_user_banned_safe(auth.uid()) AND
    (
      can_view_post_safe(post_id, auth.uid()) OR
      is_super_admin_safe(auth.uid())
    )
  );

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Created is_super_admin_safe() function';
    RAISE NOTICE '✅ Updated membership check functions to exempt super admins';
    RAISE NOTICE '✅ Updated create_post_with_media() to bypass membership for super admins';
    RAISE NOTICE '✅ Updated create_comment_with_media() to bypass membership for super admins';
    RAISE NOTICE '✅ Updated RLS policies for posts and comments to allow super admins';
    RAISE NOTICE '✅ Super admins can now post, comment, leave, and join communities without membership restrictions';
END $$;

