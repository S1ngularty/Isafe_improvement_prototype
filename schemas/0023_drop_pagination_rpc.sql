-- ============================================================
-- CityShield — Drop the paginated get_all_profiles RPC
-- This function is no longer needed. The backend now queries
-- profiles directly via the FastAPI /api/admin/profiles endpoint
-- using the Supabase Python client (no custom RPCs).
--
-- The original get_all_profiles() RPC (no params) is kept for
-- the mobile app and other existing callers.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_all_profiles_paginated(INT, INT, TEXT, TEXT, TEXT, TEXT);
