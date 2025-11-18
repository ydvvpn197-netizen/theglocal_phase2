-- ============================================
-- FIX MEDIA RLS AND ENABLE ATOMIC TRANSACTIONS
-- ============================================
-- Fix RLS policies to allow atomic post creation + media insertion
-- Version: 0087
-- Description: Fix media_items RLS policies and enable proper transactions
-- Date: 2025-01-28

-- ============================================
-- DROP AND RECREATE MEDIA_ITEMS RLS POLICIES
-- ============================================

-- Drop existing restrictive INSERT policies
DROP POLICY IF EXISTS "Users can insert media on own content" ON media_items;
DROP POLICY IF EXISTS "Authenticated users can insert media" ON media_items;

-- Create new permissive INSERT policy for authenticated users
-- This allows authenticated users to insert media items, with validation handled by triggers
CREATE POLICY "Authenticated users can insert media" ON media_items
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- CREATE ENHANCED MEDIA VALIDATION FUNCTION
-- ============================================

-- Enhanced function to validate media item owner with transaction support
CREATE OR REPLACE FUNCTION validate_media_item_owner_enhanced()
RETURNS TRIGGER AS $$
DECLARE
    post_author_id UUID;
    comment_author_id UUID;
    poll_comment_author_id UUID;
    current_user_id UUID;
BEGIN
    -- Get current authenticated user ID
    current_user_id := auth.uid();
    
    -- If no authenticated user, reject
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to add media';
    END IF;
    
    -- Validate based on owner_type
    IF NEW.owner_type = 'post' THEN
        -- Check if post exists and user is the author
        SELECT author_id INTO post_author_id 
        FROM posts 
        WHERE id = NEW.owner_id;
        
        IF post_author_id IS NULL THEN
            RAISE EXCEPTION 'Referenced post does not exist';
        END IF;
        
        IF post_author_id != current_user_id THEN
            RAISE EXCEPTION 'Can only add media to own posts';
        END IF;
        
    ELSIF NEW.owner_type = 'comment' THEN
        -- Check if comment exists and user is the author
        SELECT author_id INTO comment_author_id 
        FROM comments 
        WHERE id = NEW.owner_id;
        
        IF comment_author_id IS NULL THEN
            RAISE EXCEPTION 'Referenced comment does not exist';
        END IF;
        
        IF comment_author_id != current_user_id THEN
            RAISE EXCEPTION 'Can only add media to own comments';
        END IF;
        
    ELSIF NEW.owner_type = 'poll_comment' THEN
        -- Check if poll_comment exists and user is the author
        SELECT author_id INTO poll_comment_author_id 
        FROM poll_comments 
        WHERE id = NEW.owner_id;
        
        IF poll_comment_author_id IS NULL THEN
            RAISE EXCEPTION 'Referenced poll_comment does not exist';
        END IF;
        
        IF poll_comment_author_id != current_user_id THEN
            RAISE EXCEPTION 'Can only add media to own poll comments';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger to use enhanced validation
DROP TRIGGER IF EXISTS trigger_validate_media_item_owner ON media_items;
CREATE TRIGGER trigger_validate_media_item_owner
    BEFORE INSERT OR UPDATE ON media_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_media_item_owner_enhanced();

-- ============================================
-- CREATE FUNCTION FOR ATOMIC POST + MEDIA CREATION
-- ============================================

-- Function to create post with media items atomically
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
    
    -- Validate community membership
    IF NOT EXISTS (
        SELECT 1 FROM community_members 
        WHERE community_id = p_community_id AND user_id = current_user_id
    ) THEN
        RETURN QUERY SELECT null::UUID, 0, false, 'Must be a community member to post';
        RETURN;
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
                        WHEN media_item->>'duration' IS NOT NULL AND media_item->>'duration' != ''
                        THEN (media_item->>'duration')::INTEGER 
                        ELSE NULL 
                    END,
                    NULLIF(media_item->>'thumbnailUrl', ''),
                    CASE 
                        WHEN media_item->>'fileSize' IS NOT NULL AND media_item->>'fileSize' != ''
                        THEN (media_item->>'fileSize')::BIGINT 
                        ELSE NULL 
                    END,
                    COALESCE(NULLIF(media_item->>'mimeType', ''), 'application/octet-stream'),
                    COALESCE(NULLIF(media_item->>'altText', ''), media_item->>'mediaType' || ' attachment')
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
-- CREATE FUNCTION FOR ATOMIC COMMENT + MEDIA CREATION
-- ============================================

-- Function to create comment with media items atomically
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
        -- Create the comment
        INSERT INTO comments (
            post_id,
            parent_comment_id,
            author_id,
            body,
            media_count
        ) VALUES (
            p_post_id,
            p_parent_id,
            current_user_id,
            p_body,
            CASE 
                WHEN p_media_items IS NULL OR jsonb_typeof(p_media_items) != 'array' 
                THEN 0 
                ELSE jsonb_array_length(p_media_items) 
            END
        ) RETURNING id INTO new_comment_id;
        
        -- Insert media items if provided
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

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION create_post_with_media TO authenticated;
GRANT EXECUTE ON FUNCTION create_comment_with_media TO authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Fixed media_items RLS policies for atomic transactions';
    RAISE NOTICE '✅ Created enhanced media validation with user authentication';
    RAISE NOTICE '✅ Added atomic post + media creation function';
    RAISE NOTICE '✅ Added atomic comment + media creation function';
    RAISE NOTICE '✅ RLS and transaction issues resolved';
END $$;
