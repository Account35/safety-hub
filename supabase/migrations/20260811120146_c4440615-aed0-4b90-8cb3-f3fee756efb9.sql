ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_test_seed_account boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;