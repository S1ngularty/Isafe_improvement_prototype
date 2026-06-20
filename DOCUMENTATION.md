# Documentation — ISAFE / CityShield

## 2026-06-19T20:41Z

### AGENTS.md Realignment

Updated `AGENTS.md` to reflect the actual project stack:
- Removed MongoDB section (not used, not planned)
- Replaced CSS modules with Tailwind CSS (web)
- Replaced Zustand with Redux Toolkit (mobile)
- Replaced `react-native-maps` with `react-native-webview` + Leaflet (mobile)
- Renamed `web/` → `website/`, `supabase/migrations/` → `schemas/`
- Updated React Navigation v6 → v7
- Added: backend-must-proxy-external-APIs rule
- Added: no-hardcoded-URLs rule
- Documented correct env var prefixes (`VITE_`, `EXPO_PUBLIC_`)

---

### External API Proxy — Backend (Open-Meteo + Nominatim)

**New files:**
- `backend/app/core/config.py` — env-based config (cache TTLs, rate limits, User-Agent)
- `backend/app/api/weather.py` — `GET /api/weather/current`, `GET /api/weather/hourly`
- `backend/app/api/geocode.py` — `GET /api/geocode/search`, `GET /api/geocode/reverse`
- `backend/app/services/weather.py` — Open-Meteo HTTP client with 10-min server-side cache
- `backend/app/services/geocode.py` — Nominatim HTTP client with 1-hr cache, 1 req/sec throttle

**Modified:**
- `backend/app/main.py` — registered weather + geocode routers, CORS middleware
- `backend/requirements.txt` — added `httpx==0.28.1`

**Frontend refactors (website + mobile):**
- `website/src/services/backend.js` — shared `apiGet(path, params)` helper
- `website/src/services/weather.jsx` — calls `GET /api/weather/*` instead of Open-Meteo
- `website/src/services/geocode.js` — calls `GET /api/geocode/*` instead of Nominatim
- `mobile/src/services/backend.js` — shared `apiGet(path, params)` helper
- `mobile/src/services/weather.js` — calls `GET /api/weather/*` instead of Open-Meteo
- `mobile/src/services/geocode.js` — calls `GET /api/geocode/*` instead of Nominatim

---

### Code Quality — `.then()` → `async/await`

**Website:**
- `src/pages/Dashboard.jsx` — profile loader refactored with `async` + cleanup flag
- `src/pages/ConfirmEmail.jsx` — OTP verification refactored
- `src/hooks/useWeather.js` — `Promise.all([...])` replaced with `await` + `try/catch/finally`
- `src/components/AnnouncementBanner.jsx` — announcement fetch refactored

---

### Security — Hardcoded Supabase URLs

- `website/src/services/supabase.js` — exported `getStorageUrl(bucket, path)` helper
- `website/src/pages/Home.jsx` — uses `getStorageUrl("Assets", "flood.mp4")`
- `website/src/components/AnnouncementBanner.jsx` — uses `getStorageUrl("Assets", "flood.mp4")`

---

### Configuration — `.env.example` Files

- `website/.env.example` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BACKEND_URL`
- `mobile/.env.example` — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_BACKEND_URL`
- `backend/.env.example` — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_NAME`, `APP_VERSION`, `APP_CONTACT_EMAIL`

---

### AuthContext Parity — Web ↔ Mobile

**Modified:** `website/src/context/AuthContext.jsx`
- Added `profile` state (full profile row)
- Added `refreshProfile()` function
- Matches mobile AuthContext patterns

---

### Feature: Family Location Tracking

#### Database — `schemas/families.sql`

New tables and modifications:
- `families` — id, name, 6-char alphanumeric code, created_by, timestamps
- `profiles.family_id` — FK to families (nullable, one family per user)
- `profiles.updated_at` — auto-set via trigger (was missing, required by AGENTS.md)

RPCs (all SECURITY DEFINER):
- `create_family(name)` → `{id, name, code}`
- `join_family(code)` — validates code, checks 15-member cap
- `get_family_members()` → array of `{id, full_name, lat, lng, status, last_seen_at}`
- `leave_family()` — removes user, deletes family if empty
- `generate_family_code()` — 6-char uppercase unique code
- `get_my_family_id()` — returns current user's family UUID

RLS policies:
- Family members can read each other's profiles (via `get_my_family_id()` to prevent recursion)
- Family members can read their own family row
- Creator can update family name
- Users can update their own `family_id`

Triggers:
- `set_updated_at()` — auto-sets `updated_at` on profiles + families

#### Website — Family UI

**New files:**
- `src/services/family.js` — wraps create, join, getMyFamily, getFamilyMembers, leave RPCs
- `src/hooks/useFamilyLocations.js` — seeds members, subscribes Supabase Realtime (guarded)
- `src/components/FamilySetup.jsx` — create/join modal with code display
- `src/components/FamilyMemberList.jsx` — member list with status dots, leave button

**Modified:**
- `src/components/UserSidebar.jsx` — added "Family" nav item with people icon
- `src/components/UserMarker.jsx` — added `name` + `isSelf` props; self-marker distinct size/outline
- `src/pages/Dashboard.jsx` — family markers on map, family tab with split view

#### Mobile — Family UI

**New files:**
- `src/services/family.js` — wraps all 5 RPCs
- `src/hooks/useFamilyLocations.js` — seeds + guarded Supabase Realtime subscription
- `src/screens/family/FamilyScreen.jsx` — create/join tabs, member list, code display

**Modified:**
- `src/screens/maps/MapsScreen.jsx` — refactored Leaflet WebView from single `userMarker` to `markers` object; new `UPDATE_LOCATIONS` message type with array payload; self-marker styled distinctly
- `src/App.js` — added "Family" tab with `people` icon

#### Realtime Configuration

Run in Supabase SQL Editor to enable live updates:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
```

---

### Bug Fixes

#### RLS Infinite Recursion (42P17)
- **Cause:** RLS policies used inline subqueries on `profiles` that triggered self-evaluation
- **Fix:** Replaced subqueries with `public.get_my_family_id()` (SECURITY DEFINER, no recursion)
- **Affected:** `"Family members can read each other"` on profiles, `"Family members can read their family"` on families

#### Family UI Not Updating After Re-login
- **Cause:** `getMyFamily()` queried `profiles.family_id` via PostgREST REST API — stale schema cache omitted the new column
- **Fix:** Replaced `supabase.from("profiles").select("family_id")` with `supabase.rpc("get_my_family_id")` — RPCs bypass PostgREST's column cache

#### FamilyMemberList Duplicate Fetch
- **Cause:** `FamilyMemberList` called `getMyFamily()` internally in its own `useEffect`, racing with the parent hook
- **Fix:** Converted to pure display component; receives `family` prop from parent

#### `useEffect` Async Violation
- **Cause:** `useWeather.js` used `await` inside `useEffect` callback without wrapping in async function
- **Fix:** Wrapped in `async function load()` with cleanup flag

#### Mobile `.env` Prefix Mismatch
- **Cause:** `mobile/.env` used `VITE_` prefix (Vite) instead of `EXPO_PUBLIC_` (Expo)
- **Fix:** Renamed to `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, added `EXPO_PUBLIC_BACKEND_URL`

---

### UI Polish

- **Status buttons** (Dashboard map): shrunk from `p-3 rounded-xl` to `p-2 rounded-lg`, icons `w-5→w-4`, text `text-[10px]→text-[9px]`. No longer overlap Leaflet zoom controls on 14" screens.
- **Toast z-index**: bumped from `z-[200]` to `z-[9999]` so toasts render above the map in all views.
