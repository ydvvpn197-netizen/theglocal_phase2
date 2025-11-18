-- ============================================
-- AUTO CREATE USER PROFILE ON AUTH SIGNUP
-- Version: 0106
-- Description: Automatically create user profile when auth user is created
-- Date: 2025-01-27
-- ============================================

-- Function to auto-create user profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_handle TEXT;
  v_adjective TEXT;
  v_noun TEXT;
  v_digits TEXT;
BEGIN
  -- Generate anonymous handle in format: LocalAdjectiveNoun##########
  -- Adjectives list (subset of most common) - 15 items, use modulo to wrap
  v_adjective := (ARRAY['Happy', 'Bright', 'Swift', 'Clever', 'Gentle', 'Bold', 'Calm', 'Wise', 'Brave', 'Kind', 'Quick', 'Smart', 'Loyal', 'Noble', 'Eager'])[1 + (floor(random() * 1000)::int % 15)];
  
  -- Nouns list (subset of most common) - 15 items, use modulo to wrap
  v_noun := (ARRAY['Panda', 'Tiger', 'Eagle', 'Dolphin', 'Falcon', 'Phoenix', 'Dragon', 'Lion', 'Wolf', 'Bear', 'Hawk', 'Owl', 'Fox', 'Deer', 'Raven'])[1 + (floor(random() * 1000)::int % 15)];
  
  -- 12-digit random number
  v_digits := LPAD(FLOOR(RANDOM() * 1000000000000)::TEXT, 12, '0');
  
  v_handle := 'Local' || v_adjective || v_noun || v_digits;
  
  -- Check if handle already exists (unlikely but possible)
  WHILE EXISTS(SELECT 1 FROM public.users WHERE anonymous_handle = v_handle) LOOP
    v_adjective := (ARRAY['Happy', 'Bright', 'Swift', 'Clever', 'Gentle', 'Bold', 'Calm', 'Wise', 'Brave', 'Kind', 'Quick', 'Smart', 'Loyal', 'Noble', 'Eager'])[1 + (floor(random() * 1000)::int % 15)];
    v_noun := (ARRAY['Panda', 'Tiger', 'Eagle', 'Dolphin', 'Falcon', 'Phoenix', 'Dragon', 'Lion', 'Wolf', 'Bear', 'Hawk', 'Owl', 'Fox', 'Deer', 'Raven'])[1 + (floor(random() * 1000)::int % 15)];
    v_digits := LPAD(FLOOR(RANDOM() * 1000000000000)::TEXT, 12, '0');
    v_handle := 'Local' || v_adjective || v_noun || v_digits;
  END LOOP;
  
  -- Insert user profile
  INSERT INTO public.users (id, email, phone, anonymous_handle, avatar_seed)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    v_handle,
    substr(md5(NEW.id::text), 1, 16)
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- VERIFICATION
-- ============================================

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user profile with anonymous handle when auth user is created';

