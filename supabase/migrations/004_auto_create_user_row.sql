-- Auto-create the public.users row when a new auth.users row is inserted.
-- Closes the implicit contract from migration 001 ("Initial user row is
-- created server-side from the auth.user.created webhook") which was never
-- wired up — every uploaded abstract was failing the user_id FK because the
-- public.users row didn't exist yet.

-- Function runs as the postgres role (SECURITY DEFINER) so it can INSERT into
-- public.users despite the table's RLS.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, plan)
  VALUES (NEW.id, NEW.email, 'free')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Idempotent: drop any prior trigger before recreating.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Backfill: create rows for any existing auth users who don't have one yet.
-- This handles users who signed up before this migration ran.
INSERT INTO public.users (id, email, plan)
SELECT au.id, au.email, 'free'
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
ON CONFLICT (id) DO NOTHING;
