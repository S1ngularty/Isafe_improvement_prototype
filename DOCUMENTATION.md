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

---

## 2026-06-22T02:56Z

### Feature: Route Navigation (OSRM via Backend Proxy)

#### Backend
- `backend/app/services/routing.py` — OSRM demo server HTTP client, 5-min cache, 1 req/sec throttle, coordinate swap `[lng,lat]→[lat,lng]`, step-by-step parsing with maneuver types
- `backend/app/api/routing.py` — `GET /api/routing/route?from_lat=...&from_lng=...&to_lat=...&to_lng=...&steps=true|false` → `{coordinates, distance_km, duration_min, steps[]}`
- `backend/app/main.py` — registered routing router

#### Web — RouteSteps Component
- `website/src/services/routing.js` — `fetchRoute()` + `openOSMDirections()` deep-link
- `website/src/utils/geo.js` — `haversine()`, `bearing()` for proximity lines
- `website/src/components/RouteSteps.jsx` — OSM-style turn-by-turn panel with:
  - Inline SVG maneuver arrows (straight, left, right, slight-left/right, sharp-left/right, u-turn, roundabout, fork, depart, arrive)
  - Collapsible via header click with chevron indicator
  - Left-border color accents per step (green=departure, gray=turn, light=arrival)
  - Step count in header, distance on each row
  - "Open in OpenStreetMap" link for external navigation
  - HTML tag stripping for clean instruction text
- `website/src/pages/Dashboard.jsx` — route polyline on map with tooltip, proximity line toggle, RouteSteps panel below map

#### Mobile — Route Navigation
- `mobile/src/services/routing.js` — `fetchRoute()` via backend
- `mobile/src/utils/geo.js` — `haversine()`, `bearing()`
- `mobile/src/screens/maps/MapsScreen.jsx` — family member chips with direction arrows, tap-to-route, collapsible steps panel with maneuver icons (↰ ↱ ↑ ↩ ⟳ ● ◉), "Open in OpenStreetMap" via `Linking`
- `mobile/src/assets/leafletMapHtml.js` — auto-generated offline Leaflet HTML bundle (166KB, no CDN dependencies)

---

### Feature: Profile Pictures as Marker Icons

#### Database — `schemas/avatars.sql`
- Adds `avatar_url TEXT` column to `profiles`
- Creates `avatars` storage bucket (public, 5MB limit, images only)
- Storage RLS: authenticated users manage their own `user_{id}/` folder, public can view
- Updates `get_family_members()` RPC to return `avatar_url`

#### Website
- `website/src/services/profile.js` — `uploadAvatar(file)`, `removeAvatar()`, `updateProfile()`
- `website/src/components/UserProfile.jsx` — sidebar panel: click-to-upload avatar circle, name/barangay fields, status display
- `website/src/components/UserMarker.jsx` — circular `<img>` marker pin head with colored status ring border + triangle pointer; letter-circle fallback when no avatar; larger size for self-marker (36px vs 30px)
- `website/src/components/UserSidebar.jsx` — "Profile" nav item (person icon)
- `website/src/pages/Dashboard.jsx` — passes `avatarUrl` from profile context to all markers

#### Mobile
- `mobile/src/services/supabase.js` — added `getStorageUrl(bucket, path)` helper
- `mobile/src/services/profile.js` — `uploadAvatar(uri)`, `removeAvatar()`, `updateProfile()`
- `mobile/src/screens/profile/ProfileScreen.jsx` — `expo-image-picker` integration, avatar preview circle with camera badge icon, remove photo option
- `mobile/src/screens/maps/MapsScreen.jsx` — WebView markers render avatar images (or letter fallback) with colored status border ring
- `mobile/src/assets/leafletMapHtml.js` — `addOrUpdateMarker()` accepts `avatarUrl` parameter for in-map avatar rendering

---

### Mobile MapsScreen — Emergency-App Redesign

Complete overhaul of `mobile/src/screens/maps/MapsScreen.jsx`:
- **Dark theme**: dark status bar, dark map background, dark zoom controls
- **Compact header**: status dot + SAFE/HELP/EMERGENCY label, family name badge, live coordinates
- **Floating action buttons** (left side): pin icon (saves location), my-location icon (reset to GPS after manual pin)
- **Floating action buttons** (right side): open-in-OSM icon, close route icon
- **Family member chips**: horizontal scrollable bar with status dots, names, distances, directions — tap to route
- **Route steps panel**: collapsible bottom panel with colored left-bar accents, maneuver icons, distance per step
- **Tap-to-pin**: tap map background → posts MAP_CLICK event → sets manual pin position → updates marker
- **Offline map**: Leaflet CSS/JS fully inlined in `leafletMapHtml.js` bundle (166KB), no CDN dependencies

---

### Bug Fixes (2026-06-22)

#### Marker Drift on Zoom
- **Cause:** `transform: translate(...)` CSS in divIcon HTML double-shifted markers — Leaflet's `iconAnchor` already applies the same offset
- **Fix:** Removed CSS transform; used flexbox layout for circle + triangle

#### Route Data Not Escaping in WebView
- **Cause:** `sendToMap` used manual quote escaping (`replace(/'/g)`) which broke on special characters in route data
- **Fix:** Uses double `JSON.stringify` for safe JavaScript injection

#### OSRM HTML Tags in Instructions
- **Cause:** OSRM returns instructions like `"Head <b>north</b> on..."` — HTML tags broke React Native Text rendering (showed `'n` artifacts)
- **Fix:** Added `stripHtml()` function that strips HTML tags and decodes entities (`&#39;` → `'`, `&amp;` → `&`)

#### Status Color Not Syncing on Mobile Marker
- **Cause:** `sendLocations` was a stale closure — useEffect didn't include it in dependency array
- **Fix:** Converted to `useCallback` with `[profile, session, manualLat, manualLng]` deps; added to effect deps

#### Map Loading Indefinitely
- **Cause:** 15s fallback timer used stale `mapLoaded` closure (always read `false`)
- **Fix:** Changed to `setMapLoaded(prev => ...)` for accurate state reading
- **Additional:** Leaflet CDN failure now detected immediately — try/catch sends MAP_LOADED with error field

#### Nested `<button>` in RouteSteps
- **Cause:** Collapse toggle was a `<button>` containing the clear `<button>` → invalid DOM
- **Fix:** Outer toggle changed to `<div role="button" tabIndex={0}>`; clear button uses `stopPropagation`

#### Family Not Showing After Re-login
- **Cause:** `getMyFamily()` queried `profiles` directly — PostgREST schema cache didn't include new `family_id` column
- **Fix:** Uses `supabase.rpc("get_my_family_id")` — RPCs bypass PostgREST's column cache

#### RLS Infinite Recursion (42P17)
- **Cause:** RLS policies used inline subqueries on `profiles` that self-evaluated recursively
- **Fix:** Replaced with `public.get_my_family_id()` (SECURITY DEFINER function)

#### Mobile Backend URL Not Auto-Detecting
- **Attempted:** `expo-constants` to parse dev host IP
- **Result:** Reverted to manual `EXPO_PUBLIC_BACKEND_URL` in `.env` — more reliable
