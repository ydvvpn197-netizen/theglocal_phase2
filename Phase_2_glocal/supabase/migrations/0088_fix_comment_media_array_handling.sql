-- ============================================
-- FIX COMMENT MEDIA ARRAY HANDLING
-- ============================================
-- Fixes "cannot get array length of a scalar" error in create_comment_with_media function
-- Issue: jsonb_array_length() fails when p_media_items is null or not an array

-- ============================================
-- UPDATE FUNCTION WITH PROPER NULL/ARRAY CHECKS
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
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN QUERY SELECT null::UUID, 0, false, 'Authentication required';
        RETURN;
    END IF;
    
    -- Validate post exists and get community
    SELECT community_id INTO post_community_id FROM posts WHERE id = p_post_id AND is_deleted = false;
    IF post_community_id IS NULL THEN
        RETURN QUERY SELECT null::UUID, 0, false, 'Post not found';
        RETURN;
    END IF;
    
    -- Validate community membership
    IF NOT EXISTS (
        SELECT 1 FROM community_members 
        WHERE community_id = post_community_id AND user_id = current_user_id
    ) THEN
        RETURN QUERY SELECT null::UUID, 0, false, 'Must be a community member to comment';
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
            p_body,
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
        
    EXCEPTION WHEN OTHERS THEN
        -- Return error
        RETURN QUERY SELECT null::UUID, 0, false, SQLERRM;
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
    RAISE NOTICE '✅ Fixed create_comment_with_media function to handle null/invalid media_items';
    RAISE NOTICE '✅ Added proper jsonb_typeof() checks before jsonb_array_length()';
    RAISE NOTICE '✅ Comment creation should now work without array length errors';
END $$;
