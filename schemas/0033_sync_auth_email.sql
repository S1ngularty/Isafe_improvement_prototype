-- ============================================================
-- CityShield — Sync email/phone from auth.users to profiles
-- Run in: Supabase SQL Editor
-- ============================================================

-- 1. Add email and phone columns to profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN phone TEXT;
  END IF;
END $$;

-- 2. Trigger function: sync email/phone from auth.users on insert/update
CREATE OR REPLACE FUNCTION public.sync_auth_user_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email,
      phone = NEW.phone
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- 3. Apply trigger on auth.users changes
DROP TRIGGER IF EXISTS sync_auth_user_contact_trigger ON auth.users;

CREATE TRIGGER sync_auth_user_contact_trigger
  AFTER INSERT OR UPDATE OF email, phone ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_auth_user_contact();

-- 4. Backfill existing users
UPDATE public.profiles p
SET email = u.email,
    phone = u.phone
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.phone IS NULL);
