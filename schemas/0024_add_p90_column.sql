-- ============================================================
-- CityShield — Add P90 column to analytics_daily_snapshot
-- ============================================================
ALTER TABLE IF EXISTS public.analytics_daily_snapshot
  ADD COLUMN IF NOT EXISTS p90_first_response_seconds REAL;
