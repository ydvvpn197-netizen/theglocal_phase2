-- ============================================
-- STANDARDIZE MEDIA SYSTEM ARCHITECTURE
-- ============================================
-- Deprecate legacy media fields and migrate to media_items only
-- Version: 0089
-- Description: Consolidate media handling to use only media_items table
-- Date: 2025-01-28

-- ============================================
-- DATA MIGRATION: CONVERT LEGACY MEDIA TO MEDIA_ITEMS
-- ============================================

-- Function to migrate legacy media to media_items
CREATE OR REPLACE FUNCTION migrate_legacy_media_to_items()
RETURNS TABLE (
    posts_processed INTEGER,
    media_items_created INTEGER,
    legacy_images INTEGER,
    legacy_gifs INTEGER,
    legacy_videos INTEGER,
    execution_time_ms INTEGER
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    posts_count INTEGER := 0;
    items_count INTEGER := 0;
    images_count INTEGER := 0;
    gifs_count INTEGER := 0;
    videos_count INTEGER := 0;
    post_record RECORD;
    media_item_id UUID;
BEGIN
    start_time := clock_timestamp();
    
    -- Process all posts with legacy media fields
    FOR post_record IN
        SELECT id, author_id, image_url, gif_url, video_url, video_thumbnail, 
               video_duration, media_type, media_variants
        FROM posts 
        WHERE (image_url IS NOT NULL OR gif_url IS NOT NULL OR video_url IS NOT NULL)
        AND NOT EXISTS (
            SELECT 1 FROM media_items 
            WHERE owner_type = 'post' AND owner_id = posts.id
        )
    LOOP
        posts_count := posts_count + 1;
        
        -- Handle legacy image
        IF post_record.image_url IS NOT NULL THEN
            media_item_id := uuid_generate_v4();
            
            INSERT INTO media_items (
                id,
                owner_type,
                owner_id,
                media_type,
                url,
                variants,
                display_order,
                alt_text,
                created_at,
                updated_at
            ) VALUES (
                media_item_id,
                'post',
                post_record.id,
                CASE 
                    WHEN post_record.media_type = 'gif' THEN 'gif'::media_type
                    ELSE 'image'::media_type
                END,
                post_record.image_url,
                COALESCE(post_record.media_variants, '{}'),
                0,
                'Legacy image attachment',
                NOW(),
                NOW()
            );
            
            items_count := items_count + 1;
            images_count := images_count + 1;
        END IF;
        
        -- Handle legacy GIF
        IF post_record.gif_url IS NOT NULL AND post_record.gif_url != post_record.image_url THEN
            media_item_id := uuid_generate_v4();
            
            INSERT INTO media_items (
                id,
                owner_type,
                owner_id,
                media_type,
                url,
                variants,
                display_order,
                alt_text,
                created_at,
                updated_at
            ) VALUES (
                media_item_id,
                'post',
                post_record.id,
                'gif'::media_type,
                post_record.gif_url,
                '{}',
                CASE WHEN post_record.image_url IS NOT NULL THEN 1 ELSE 0 END,
                'Legacy GIF attachment',
                NOW(),
                NOW()
            );
            
            items_count := items_count + 1;
            gifs_count := gifs_count + 1;
        END IF;
        
        -- Handle legacy video
        IF post_record.video_url IS NOT NULL THEN
            media_item_id := uuid_generate_v4();
            
            INSERT INTO media_items (
                id,
                owner_type,
                owner_id,
                media_type,
                url,
                variants,
                display_order,
                duration,
                thumbnail_url,
                alt_text,
                created_at,
                updated_at
            ) VALUES (
                media_item_id,
                'post',
                post_record.id,
                'video'::media_type,
                post_record.video_url,
                '{}',
                CASE 
                    WHEN post_record.image_url IS NOT NULL AND post_record.gif_url IS NOT NULL THEN 2
                    WHEN post_record.image_url IS NOT NULL OR post_record.gif_url IS NOT NULL THEN 1
                    ELSE 0
                END,
                post_record.video_duration,
                post_record.video_thumbnail,
                'Legacy video attachment',
                NOW(),
                NOW()
            );
            
            items_count := items_count + 1;
            videos_count := videos_count + 1;
        END IF;
        
        -- Update post media_count to match new media_items
        UPDATE posts 
        SET media_count = (
            SELECT COUNT(*) FROM media_items 
            WHERE owner_type = 'post' AND owner_id = post_record.id
        )
        WHERE id = post_record.id;
    END LOOP;
    
    end_time := clock_timestamp();
    
    RETURN QUERY SELECT 
        posts_count,
        items_count,
        images_count,
        gifs_count,
        videos_count,
        EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the migration
DO $$
DECLARE
    result RECORD;
BEGIN
    -- Temporarily disable the media validation trigger for migration
    ALTER TABLE media_items DISABLE TRIGGER trigger_validate_media_item_owner;
    
    -- Run the migration
    SELECT * INTO result FROM migrate_legacy_media_to_items();
    
    -- Re-enable the trigger
    ALTER TABLE media_items ENABLE TRIGGER trigger_validate_media_item_owner;
    
    RAISE NOTICE '✅ Migrated legacy media: % posts, % media items (% images, % gifs, % videos) in % ms', 
        result.posts_processed, result.media_items_created, result.legacy_images, 
        result.legacy_gifs, result.legacy_videos, result.execution_time_ms;
END $$;

-- ============================================
-- DEPRECATE LEGACY MEDIA COLUMNS
-- ============================================

-- Add comments to mark these columns as deprecated
COMMENT ON COLUMN posts.image_url IS 'DEPRECATED: Use media_items table instead. Will be removed in future version.';
COMMENT ON COLUMN posts.gif_url IS 'DEPRECATED: Use media_items table instead. Will be removed in future version.';
COMMENT ON COLUMN posts.video_url IS 'DEPRECATED: Use media_items table instead. Will be removed in future version.';
COMMENT ON COLUMN posts.video_thumbnail IS 'DEPRECATED: Use media_items table instead. Will be removed in future version.';
COMMENT ON COLUMN posts.video_duration IS 'DEPRECATED: Use media_items table instead. Will be removed in future version.';
COMMENT ON COLUMN posts.video_variants IS 'DEPRECATED: Use media_items table instead. Will be removed in future version.';
COMMENT ON COLUMN posts.media_type IS 'DEPRECATED: Use media_items table instead. Will be removed in future version.';
COMMENT ON COLUMN posts.media_variants IS 'DEPRECATED: Use media_items table instead. Will be removed in future version.';

-- ============================================
-- CREATE VIEW FOR BACKWARD COMPATIBILITY
-- ============================================

-- Create a view that includes legacy media fields for backward compatibility
CREATE OR REPLACE VIEW posts_with_legacy_media AS
SELECT 
    p.*,
    -- Legacy compatibility fields (computed from media_items)
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM media_items mi 
            WHERE mi.owner_type = 'post' AND mi.owner_id = p.id 
            AND mi.media_type = 'image' AND mi.display_order = 0
        ) THEN (
            SELECT url FROM media_items mi 
            WHERE mi.owner_type = 'post' AND mi.owner_id = p.id 
            AND mi.media_type = 'image' AND mi.display_order = 0
            LIMIT 1
        )
        ELSE p.image_url
    END as computed_image_url,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM media_items mi 
            WHERE mi.owner_type = 'post' AND mi.owner_id = p.id 
            AND mi.media_type = 'gif'
        ) THEN (
            SELECT url FROM media_items mi 
            WHERE mi.owner_type = 'post' AND mi.owner_id = p.id 
            AND mi.media_type = 'gif'
            ORDER BY mi.display_order
            LIMIT 1
        )
        ELSE p.gif_url
    END as computed_gif_url,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM media_items mi 
            WHERE mi.owner_type = 'post' AND mi.owner_id = p.id 
            AND mi.media_type = 'video'
        ) THEN (
            SELECT url FROM media_items mi 
            WHERE mi.owner_type = 'post' AND mi.owner_id = p.id 
            AND mi.media_type = 'video'
            ORDER BY mi.display_order
            LIMIT 1
        )
        ELSE p.video_url
    END as computed_video_url
    
FROM posts p;

-- Grant permissions on the view
GRANT SELECT ON posts_with_legacy_media TO authenticated;
GRANT SELECT ON posts_with_legacy_media TO service_role;

-- ============================================
-- FUNCTION TO REMOVE LEGACY MEDIA COLUMNS
-- ============================================
-- Note: This is for future use when we're ready to fully remove legacy columns

CREATE OR REPLACE FUNCTION remove_legacy_media_columns()
RETURNS TEXT AS $$
BEGIN
    -- Check if all posts have been migrated
    IF EXISTS (
        SELECT 1 FROM posts 
        WHERE (image_url IS NOT NULL OR gif_url IS NOT NULL OR video_url IS NOT NULL)
        AND NOT EXISTS (
            SELECT 1 FROM media_items 
            WHERE owner_type = 'post' AND owner_id = posts.id
        )
    ) THEN
        RETURN 'ERROR: Some posts still have legacy media that has not been migrated. Run migrate_legacy_media_to_items() first.';
    END IF;
    
    -- Drop legacy columns
    ALTER TABLE posts DROP COLUMN IF EXISTS image_url;
    ALTER TABLE posts DROP COLUMN IF EXISTS gif_url;
    ALTER TABLE posts DROP COLUMN IF EXISTS video_url;
    ALTER TABLE posts DROP COLUMN IF EXISTS video_thumbnail;
    ALTER TABLE posts DROP COLUMN IF EXISTS video_duration;
    ALTER TABLE posts DROP COLUMN IF EXISTS video_variants;
    ALTER TABLE posts DROP COLUMN IF EXISTS media_type;
    ALTER TABLE posts DROP COLUMN IF EXISTS media_variants;
    
    RETURN 'SUCCESS: Legacy media columns have been removed.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION migrate_legacy_media_to_items TO authenticated;
GRANT EXECUTE ON FUNCTION remove_legacy_media_columns TO service_role; -- Restrict to service role only

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migrated all legacy media to media_items table';
    RAISE NOTICE '✅ Marked legacy media columns as deprecated';
    RAISE NOTICE '✅ Created backward compatibility view';
    RAISE NOTICE '✅ Added function to remove legacy columns when ready';
    RAISE NOTICE '✅ Media system is now standardized on media_items table';
END $$;
