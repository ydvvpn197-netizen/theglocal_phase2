-- Reporting context enhancements
-- Adds context columns to support expanded content types

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reports'
      AND column_name = 'community_id'
  ) THEN
    ALTER TABLE public.reports
      ADD COLUMN community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reports'
      AND column_name = 'content_owner_id'
  ) THEN
    ALTER TABLE public.reports
      ADD COLUMN content_owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- Backfill existing reports with community and owner context
UPDATE public.reports r
SET community_id = p.community_id,
    content_owner_id = p.author_id
FROM public.posts p
WHERE r.content_type = 'post'
  AND r.content_id = p.id;

UPDATE public.reports r
SET community_id = p.community_id,
    content_owner_id = c.author_id
FROM public.comments c
JOIN public.posts p ON p.id = c.post_id
WHERE r.content_type = 'comment'
  AND r.content_id = c.id;

UPDATE public.reports r
SET community_id = po.community_id,
    content_owner_id = po.author_id
FROM public.polls po
WHERE r.content_type = 'poll'
  AND r.content_id = po.id;

-- Indexes to speed up moderator queries
CREATE INDEX IF NOT EXISTS reports_community_id_idx ON public.reports(community_id);
CREATE INDEX IF NOT EXISTS reports_content_owner_idx ON public.reports(content_owner_id);

