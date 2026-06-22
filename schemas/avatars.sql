-- ============================================================
-- CityShield — Profile Avatars
-- Run in: Supabase SQL Editor
-- ============================================================

-- 1. Add avatar_url to profiles (safe re-run)
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. Create avatars storage bucket (public, 5MB limit, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- 3. RLS on storage.objects — allow authenticated users to manage their own avatar
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public can view avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- 4. Update get_family_members RPC to include avatar_url
DROP FUNCTION IF EXISTS public.get_family_members();
CREATE FUNCTION public.get_family_members()
RETURNS TABLE (
  id              UUID,
  full_name       TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  status          TEXT,
  last_seen_at    TIMESTAMPTZ,
  location_sharing BOOLEAN,
  avatar_url      TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, p.full_name, p.lat, p.lng, p.status, p.last_seen_at, p.location_sharing, p.avatar_url
  FROM public.profiles p
  JOIN public.profiles me ON p.family_id = me.family_id
  WHERE me.id = auth.uid()
    AND p.id != auth.uid()
    AND p.family_id IS NOT NULL;
$$;
