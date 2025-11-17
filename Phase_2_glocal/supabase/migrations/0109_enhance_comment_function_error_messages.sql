-- ============================================
-- ENHANCE COMMENT FUNCTION ERROR MESSAGES
-- ============================================
-- Improve error messages in create_comment_with_media function
-- Add better error handling and more descriptive messages
-- Version: 0109
-- Date: 2025-01-29

-- ============================================
-- UPDATE FUNCTION WITH IMPROVED ERROR MESSAGES
-- ============================================

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
    
    -- Validate community membership - check with auth.uid()
    -- Note: API route should have already verified membership, but we double-check here
    SELECT EXISTS (
        SELECT 1 FROM community_members 
        WHERE community_id = post_community_id 
        AND user_id = auth.uid()
    ) INTO is_member;
    
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
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions on updated function (idempotent)
DO $$
BEGIN
    -- Grant execute permissions (this is idempotent)
    GRANT EXECUTE ON FUNCTION create_comment_with_media TO authenticated;
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if permission already exists
    NULL;
END $$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Enhanced create_comment_with_media function with improved error messages';
    RAISE NOTICE '✅ Added validation for parent comments and depth calculation';
    RAISE NOTICE '✅ Added validation for media items structure';
    RAISE NOTICE '✅ Improved error handling with specific exception types';
    RAISE NOTICE '✅ Better error messages for user feedback';
END $$;

