-- ============================================================
-- CityShield — Analytics Tables + Views
-- Daily snapshots, response metrics, and aggregate views
-- for the system heatmap and analytics dashboard
-- ============================================================

-- ============================================================
-- TABLE: analytics_daily_snapshot
-- One row per day: incident counts, rescue metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS public.analytics_daily_snapshot (
    date DATE PRIMARY KEY,
    new_incidents INTEGER NOT NULL DEFAULT 0,
    resolved_incidents INTEGER NOT NULL DEFAULT 0,
    rescue_assignments_created INTEGER NOT NULL DEFAULT 0,
    rescue_assignments_completed INTEGER NOT NULL DEFAULT 0,
    rescue_assignments_cancelled INTEGER NOT NULL DEFAULT 0,
    avg_first_response_seconds REAL,
    avg_time_to_onscene_seconds REAL,
    avg_total_rescue_seconds REAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: analytics_barangay_snapshot
-- Per-barangay daily stats for risk assessment
-- ============================================================
CREATE TABLE IF NOT EXISTS public.analytics_barangay_snapshot (
    date DATE NOT NULL,
    barangay TEXT NOT NULL,
    total_users INTEGER NOT NULL DEFAULT 0,
    users_emergency INTEGER NOT NULL DEFAULT 0,
    users_help INTEGER NOT NULL DEFAULT 0,
    users_safe INTEGER NOT NULL DEFAULT 0,
    vulnerable_users INTEGER NOT NULL DEFAULT 0,
    incidents_today INTEGER NOT NULL DEFAULT 0,
    resolved_today INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (date, barangay)
);

-- ============================================================
-- TABLE: analytics_response_metrics
-- Period-based response time percentiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.analytics_response_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
    total_assignments INTEGER NOT NULL DEFAULT 0,
    completed_assignments INTEGER NOT NULL DEFAULT 0,
    cancelled_assignments INTEGER NOT NULL DEFAULT 0,
    success_rate REAL,
    avg_first_response_seconds REAL,
    p50_response_seconds REAL,
    p90_response_seconds REAL,
    avg_time_to_onscene_seconds REAL,
    avg_total_rescue_seconds REAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_barangay_snapshot_barangay
    ON public.analytics_barangay_snapshot (barangay, date DESC);

CREATE INDEX IF NOT EXISTS idx_response_metrics_period
    ON public.analytics_response_metrics (period_type, period_start DESC);

-- ============================================================
-- VIEW: vw_rescuer_performance
-- Aggregated performance metrics per rescuer
-- ============================================================
CREATE OR REPLACE VIEW public.vw_rescuer_performance AS
SELECT
    p.id AS rescuer_id,
    p.full_name,
    r.rescuer_type,
    r.organization,
    COUNT(ra.id) AS total_assignments,
    COUNT(ra.id) FILTER (WHERE ra.state = 'helped') AS helped_count,
    COUNT(ra.id) FILTER (WHERE ra.state = 'cancelled') AS cancelled_count,
    CASE
        WHEN COUNT(ra.id) > 0
        THEN ROUND(
            (COUNT(ra.id) FILTER (WHERE ra.state = 'helped')::NUMERIC
            / COUNT(ra.id) * 100)::NUMERIC, 1
        )
        ELSE 0
    END AS success_rate
FROM public.profiles p
JOIN public.rescuers r ON r.id = p.id
LEFT JOIN public.rescue_assignments ra
    ON ra.rescuer_id = p.id AND ra.deleted_at IS NULL
GROUP BY p.id, p.full_name, r.rescuer_type, r.organization;

-- ============================================================
-- VIEW: vw_barangay_latest
-- Latest snapshot per barangay for risk dashboard
-- ============================================================
CREATE OR REPLACE VIEW public.vw_barangay_latest AS
SELECT DISTINCT ON (barangay)
    barangay,
    total_users,
    users_emergency,
    users_help,
    users_safe,
    vulnerable_users,
    incidents_today,
    resolved_today,
    date
FROM public.analytics_barangay_snapshot
ORDER BY barangay, date DESC;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.analytics_daily_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_barangay_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_response_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read analytics_daily_snapshot" ON public.analytics_daily_snapshot;
CREATE POLICY "Admins read analytics_daily_snapshot"
    ON public.analytics_daily_snapshot FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "Admins read analytics_barangay_snapshot" ON public.analytics_barangay_snapshot;
CREATE POLICY "Admins read analytics_barangay_snapshot"
    ON public.analytics_barangay_snapshot FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "Admins read analytics_response_metrics" ON public.analytics_response_metrics;
CREATE POLICY "Admins read analytics_response_metrics"
    ON public.analytics_response_metrics FOR SELECT
    USING (is_admin());
