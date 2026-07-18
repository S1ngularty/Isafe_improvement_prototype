# Performance Notes & Reminders

## Water Level Pages — Plotly Monitoring

**Status:** Monitoring (no crash reports)

- **4.8 MB** Plotly chunk loaded dynamically on navigation to `/water-level`.
- Sensor updates every **10 seconds** → 6 Plotly charts re-diff via `Plotly.react()`.
- Low crash risk: SVG diff at 10s intervals is lightweight (~10-20ms total).

### If stutter appears

Apply same fix as AnalyticsDashboard:
1. Wrap `DynamicPlot` in `WaterLevelCharts.jsx` with `React.memo`
2. Extract chart `data` into `useMemo` hooks
3. Extract `config`/`style` defaults as module constants

### If migrating to Chart.js

Same pattern as `AnalyticsDashboard.jsx` migration.  
Additional plugins needed: `chartjs-plugin-annotation` for danger zone background rects.

---

## Admin Dashboard — Already Fixed

AnalyticsDashboard migrated from Plotly → Chart.js. No longer imports Plotly.

---

## Email Column — Migration Not Applied

**File:** `schemas/0033_sync_auth_email.sql`

The `email` column was added to `ADMIN_PROFILE_FIELDS` in the backend but then removed
because the DB migration hasn't been run yet. The column doesn't exist in the `profiles` table.

**To enable:**
1. Run `schemas/0033_sync_auth_email.sql` in Supabase SQL Editor
2. Re-add `email` to `ADMIN_PROFILE_FIELDS`, `PROFILE_FIELDS`, `USER_STATUS_FIELDS` in
   `backend/app/services/admin_alerts.py`
3. Remove `email` from the "Removed" section below

**Columns removed from field constants (awaiting migration):**
- `email` from `ADMIN_PROFILE_FIELDS`
- `email` from `PROFILE_FIELDS`
- `phone` from `PROFILE_FIELDS`
- `email` from `USER_STATUS_FIELDS`

---

## Backend Default Limits — Changed

All admin endpoint defaults changed from 50 → 10 per load:

| Endpoint | File | Old Default | New Default |
|----------|------|-------------|-------------|
| `/api/admin/profiles` | `admin_alerts.py:66` | 50 | 10 |
| `/api/admin/status-users` | `admin_alerts.py:112` | 50 | 10 |
| `/api/admin/status-history` | `admin_alerts.py:160` | 50 | 10 |
| Frontend Users tab | `AdminDashboard.jsx:36` | 50 | 10 |
