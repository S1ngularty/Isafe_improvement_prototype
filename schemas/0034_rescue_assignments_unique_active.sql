-- ============================================================
-- CityShield — Unique active assignment + RPC for in-need list
-- 1. Partial unique index prevents duplicate active claims
-- 2. RPC returns available (unclaimed) targets in one round-trip
-- ============================================================

-- 1. Partial unique index: at most one active (non-deleted) assignment per target
CREATE UNIQUE INDEX IF NOT EXISTS idx_rescue_assignments_unique_active
  ON public.rescue_assignments (target_user_id)
  WHERE state IN ('en_route', 'on_scene') AND deleted_at IS NULL;

-- 2. RPC: return profiles with status help/emergency that have no active assignment
CREATE OR REPLACE FUNCTION public.get_available_targets()
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'status', p.status,
      'barangay_id', p.barangay_id,
      'barangays', CASE WHEN b.id IS NOT NULL
                     THEN json_build_object('name', b.name) ELSE NULL END,
      'lat', p.lat,
      'lng', p.lng,
      'last_seen_at', p.last_seen_at,
      'blood_type', p.blood_type,
      'medical_notes', p.medical_notes,
      'special_needs', p.special_needs,
      'household_size', p.household_size,
      'avatar_url', p.avatar_url
    )
    ORDER BY p.last_seen_at DESC
  ), '[]'::JSON) INTO result
  FROM public.profiles p
  LEFT JOIN public.barangays b ON b.id = p.barangay_id
  WHERE p.status IN ('help', 'emergency')
    AND NOT EXISTS (
      SELECT 1 FROM public.rescue_assignments ra
      WHERE ra.target_user_id = p.id
        AND ra.state IN ('en_route', 'on_scene')
        AND ra.deleted_at IS NULL
    );
  RETURN result;
END;
$$;
