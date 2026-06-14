# CityShield Website

Disaster response and community safety platform connecting barangay officials and residents.


**Last updated:** 06/14/2026 11:45 AM

## Tech Stack


| Layer | Technology |
|---|---|
| Framework | React 18 |
| Routing | React Router DOM v6 |
| Build tool | Vite 6 |
| Styling | Tailwind CSS 3 |

| Map | Leaflet + react-leaflet v4 (OpenStreetMap tiles) |
| Geocoding | Nominatim (free, no API key, Philippines-only) |

| Auth | Supabase Auth (email/password + email confirmation) |
| Notifications | Custom Toast context |
| RBAC | Supabase RLS + `profiles` table (`admin` / `user`) |
| Media | Supabase Storage (public bucket: `Assets`) + external CDN images |

| Weather | Open-Meteo API (free, no API key) |

## Color Scheme

Maroon + white with red accents.

| Surface | Color | Tailwind |
|---|---|---|
| Navbar (all pages) | Dark maroon | `bg-shield-800 text-white` |
| Sidebar (user + admin) | White | `bg-white border-r border-gray-200` |
| Active sidebar item | Light red | `bg-shield-50 text-shield-700` |
| Content background | Light gray | `bg-gray-50` |
| Primary buttons | Deep red | `bg-shield-600` |
| Alert/emergency | Bright red | `bg-alert-600` |
| Footer | White | `bg-white border-t border-gray-200` |

Custom palette (`shield-*`):

| Shade | Hex | Tone |
|---|---|---|
| 50 | `#fef2f2` | Light pink |
| 100 | `#fee2e2` | Light red |
| 200 | `#fecaca` | Soft red |
| 300 | `#f87171` | Medium red |
| 400 | `#e04444` | Bright red |
| 500 | `#b91c1c` | Deep red |
| 600 | `#991b1b` | Dark red |
| 700 | `#7f1d1d` | Wine |
| 800 | `#5c1010` | Maroon |
| 900 | `#3b0808` | Darkest maroon |


## Architecture

```
website/
├── index.html
├── package.json / vite.config.js / tailwind.config.js / postcss.config.js
├── .env                        # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
└── src/
    ├── main.jsx                # BrowserRouter > AuthProvider > ToastProvider > App
    ├── App.jsx                 # Routes: /, /confirm, /dashboard, /admin
    ├── css/input.css           # Tailwind + custom components + animations

    ├── services/
    │   ├── supabase.js         # Supabase client init
    │   ├── auth.js             # 15 exported functions
    │   ├── location.js         # upsertLocation, updateStatus, updateLocationSharing
    │   ├── geocode.js          # Nominatim address search (PH filter)
    │   ├── weather.jsx         # Open-Meteo API + 7 WMO weather SVG icons
    │   ├── announcements.js    # CRUD for announcement banners
    │   └── leaflet-setup.js    # Fixes Vite+Leaflet broken marker icon paths
    ├── hooks/
    │   ├── useGeolocation.js   # watchPosition hook
    │   └── useWeather.js       # Fetch weather with 10-min coordinate-keyed cache

    ├── context/
    │   ├── AuthContext.jsx     # session, role, loading, login, signup, logout
    │   └── ToastContext.jsx    # showToast, dismissToast (fixed bottom-right)
    ├── components/

    │   ├── Modal.jsx, AuthModal.jsx, ProtectedRoute.jsx
    │   ├── AdminSidebar.jsx    # White collapsible, 6 items (announcements added)
    │   ├── UserSidebar.jsx     # White collapsible, 5 items
    │   ├── MapView.jsx         # OSM tiles, PH bounds, manual click-to-set
    │   ├── UserMarker.jsx      # SVG pin — color by status, accuracy circle
    │   ├── StatusButton.jsx    # Reusable status action button
    │   ├── AddressSearch.jsx   # Nominatim search pill + dropdown
    │   ├── WeatherPanel.jsx    # Current + hourly forecast, danger alerts
    │   └── AnnouncementBanner.jsx  # Auto-rotating banner with DB fallback
    └── pages/
        ├── Home.jsx, Dashboard.jsx, AdminDashboard.jsx, ConfirmEmail.jsx

```

## Routes & Access

| Route | Component | Access |
|---|---|---|
| `/` | Home | Public |
| `/confirm` | ConfirmEmail | Public (handles email verification token) |
| `/dashboard` | Dashboard | Authenticated (admins auto-redirected to `/admin`) |
| `/admin` | AdminDashboard | Admin only (non-admins → `/dashboard`) |

ProtectedRoute features:
- Loading spinner while session resolves
- `allowedRoles` whitelist check
- `redirectAdmins` flag — forces admins off `/dashboard` onto `/admin`
- Redirects to `/` if no session

---

## Home Page

### Hero Carousel

5 auto-rotating slides (5s interval, crossfade transition):

| # | Type | Source |
|---|---|---|
| 1 | Video | `Assets/flood.mp4` (Supabase Storage) |
| 2 | Image | CDIA disaster response photo (CDN) |
| 3 | Image | Typhoon Odette response (CDN) |
| 4 | Image | Mongabay disaster photo (CDN) |
| 5 | Image | IFRC Philippines response (CDN) |


Features: left/right arrows, dot indicators, manual nav resets timer, dark gradient overlay, video autoplays only when active, images lazy-load.

### Auth-Aware Header

- **Logged out:** "Log In" + "Sign Up" buttons, hero "Get Started", CTA "Start Free Today"
- **Logged in:** email + admin badge (if admin) + "Dashboard" link + "Log Out", CTAs change to "Go to Dashboard"

---

## User Dashboard

### Layout

- Maroon header (`bg-shield-800`) with white text
- White collapsible sidebar (`bg-white`, 5 items)
- Content fills remaining width

### Map View

- **Library:** Leaflet + react-leaflet v4
- **Tiles:** OpenStreetMap (free, no API key)
- **Bounds:** Restricted to Philippines (SW [4.5, 116.0] — NE [21.5, 127.5], minZoom 5)
- **Default center:** Philippines (lat: 12.8, lng: 121.7, zoom: 6)
- **With pin:** Pans to pin position (zoom: 16)
- **User marker:** SVG pin icon, color by status (safe=green, help=yellow, emergency=red)
- **Accuracy circle:** Dashed ring around marker showing GPS accuracy in meters
- **Live indicator:** Green pulsing dot + status badge in top-right

### Location Controls

#### Status Buttons (overlaid left edge of map)

| Button | Pin Color | DB Status |
|---|---|---|
| Safe (checkmark SVG) | Green | `safe` |
| Help (alert SVG) | Yellow | `help` |
| SOS (exclamation SVG) | Red | `emergency` |

Active button highlighted with colored border + scale. Writes to `profiles.status` immediately.

#### Map Controls (bottom-center of map, visible when pin exists)

| Button | Action |
|---|---|
| **Reset Pin** | Re-centers the map on the current pin position |
| **Pin Location** | Saves the current displayed position to the database via `update()` (not `upsert()` — uses UPDATE RLS policy) |

#### Address Search (top-center of map)

- Nominatim API, Philippines-only (`countrycodes=ph`)
- 400ms debounced input
- Dropdown results with keyboard navigation (arrow + enter)
- Selecting an address moves the pin (does not auto-save — user must click "Pin Location")

#### Location Sharing Toggle (full-width card below map)

- iOS-style toggle switch
- Writes `location_sharing = true/false` to the database
- ON → starts `watchPosition()` with `{ enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }`
- OFF → stops geolocation, pin stays at last saved position
- Status text: "Sharing Location / Acquiring GPS signal / Tap to enable"

### Persistence Behavior

| Action | DB Write? |
|---|---|
| Toggle location sharing ON | `location_sharing = true` |
| Toggle location sharing OFF | `location_sharing = false` |
| Click status button | `status = safe/help/emergency` |
| Click "Pin Location" | `lat`, `lng`, `last_seen_at` updated |
| GPS updates automatically | No — never writes to DB automatically |
| Map click | No — only moves pin visually |
| Address search select | No — only moves pin visually |
| Page refresh / new tab | Fetches last saved `lat`/`lng`/`status` from DB |

The flow: `[session]` changes → `getProfile()` fetches full profile → sets `manualLat`/`manualLng` (saved position) and `status`. GPS provides fallback only when no saved position exists.

### Stats + Actions

- 4 stat cards (Active Alerts, Reports Filed, Resolved, Evac Centers)
- 2x2 Quick Actions grid (Report Emergency, My Reports, Evacuation Map, Hotlines) — all SVG icons
- 4-item Recent Alerts timeline feed (placeholder)

---

## Weather Panel

### Integration

- **API:** Open-Meteo (free, no API key)
- **Endpoint:** `https://api.open-meteo.com/v1/forecast?latitude=&longitude=&current=...&hourly=...&timezone=Asia/Manila&forecast_days=1`
- **Hook:** `useWeather(lat, lng)` — 10-minute cache keyed on `lat.toFixed(2), lng.toFixed(2)`
- **Service:** `weather.jsx` — `fetchCurrent(lat,lng)` + `fetchHourly(lat,lng)` + 7 WMO weather SVG icons

### Layout

Positioned between location toggle button (on map) and stat cards. Always visible when coords are available.

```
┌──────────────────────────┐
│ Current Weather          │
│ [icon] 28C               │
│ ┌────────┬────────┐      │
│ Rainfall │ Wind Speed    │
│ 2.1 mm   │ 12 km/h      │
│ Sea Level Press │ Gusts │
│ 1013 hPa        │ 15    │
│ ─ Hourly forecast ▼ ─── │
│ ┌──┬──────────┬──┐      │
│ 2P [🌧] ████ 3.2 │      │
│ 3P [🌧] █████ 4.1 │      │
│ ... grid of 24 hours    │
│ └──┴──────────┴──┘      │
│ Rainfall (mm)  Wind     │
└──────────────────────────┘
```

### States

| State | Rendering |
|---|---|
| No coords (lat/lng null) | Gray placeholder: "Enable location to see local weather" |
| Loading | Skeleton pulse animation |
| Error | Red card: "Weather data unavailable" |
| Normal | White card with current conditions + collapsible hourly |
| Danger | Red-bordered card with alert callout box |

### Danger Thresholds

| Condition | Threshold | Alert |
|---|---|---|
| Heavy rainfall | precipitation > 10 mm/h | "Heavy rainfall — possible flooding" |
| Low sea level pressure | < 1000 hPa | "Low sea level pressure — storm possible" |
| Strong winds | windSpeed > 50 km/h | "Strong winds — take caution" |
| Dangerous gusts | windGusts > 60 km/h | "Dangerous wind gusts detected" |

Danger states trigger: red card border (`border-alert-500`), light red background, individual alert callouts with contextual SVG icons, and highlighted values in red.

### Hourly Forecast

- Collapsible via toggle button, default hidden
- Responsive grid: 4 cols (mobile) → 6 cols (sm) → 8 cols (md)
- Each cell: hour label + weather icon + horizontal rainfall bar + mm value
- 24 hours displayed across rows
- Precipitation > 5 mm/h highlights in red
- Horizontal bars color: blue normally, red when >5mm/h
- Legend below: blue square = Rainfall (mm), gray text = Wind

### Human-Readable Labels

| Raw API | Display Label |
|---|---|
| `pressure` hPa | Sea Level Pressure |
| `rain` mm | Rainfall |
| `wind_speed_10m` km/h | Wind Speed |
| `wind_gusts_10m` km/h | Wind Gusts |
| `precipitation` mm | Rainfall (mm) in hourly |

---

## Announcements System

### Database (`schemas/announcements.sql`)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | gen_random_uuid() |
| `title` | TEXT NOT NULL | Banner headline |
| `description` | TEXT | Banner subtext |
| `image_url` | TEXT | Video or image URL |
| `type` | TEXT | `image` or `video` |
| `is_active` | BOOLEAN | true = visible to users |
| `created_by` | UUID FK | auth.users |
| `created_at` | TIMESTAMPTZ | auto |
| `updated_at` | TIMESTAMPTZ | auto |

RLS: authenticated users can read active announcements. Admins can CRUD all (via `is_admin()`).

### User Banner (`AnnouncementBanner.jsx`)

- Slim card at top of dashboard (80px height)
- Auto-rotates every 5s with crossfade
- Fetches active announcements from DB on mount
- Falls back to 5 hardcoded slides if DB is empty
- Megaphone icon + title + description on maroon gradient overlay
- Dot indicators, smooth transitions

### Admin Management

- New sidebar item: "Announcements" (megaphone SVG icon)
- Create form: Title, Type (image/video), Description, Image URL → "Publish Announcement"
- Table: Title/description, Type badge, Active/Hidden toggle, Delete button
- `is_active` toggle: green "Active" / gray "Hidden"

### Services (`announcements.js`)

| Function | Purpose |
|---|---|
| `fetchActiveAnnouncements()` | All active announcements (for user banner) |
| `fetchAllAnnouncements()` | All announcements (for admin view) |
| `createAnnouncement(data)` | Admin creates new announcement |
| `updateAnnouncement(id, updates)` | Admin edits (including toggle active) |
| `deleteAnnouncement(id)` | Admin deletes |


---

## Admin Dashboard

### Layout


- Maroon header (`bg-shield-800`) with white text, logo links to `/`, Home link, email, admin badge, Log Out
- White collapsible sidebar (64px / 224px, smooth transition)
- Content fills remaining width (no max-w cap)


### Sidebar Navigation

| Item | Status | Icon |
|---|---|---|
| Dashboard | Active | Home SVG |
| Users | Active | Users SVG |
| Alerts | Placeholder (Soon badge) | Bell SVG |
| Reports | Placeholder (Soon badge) | Chart SVG |
| Settings | Placeholder (Soon badge) | Cog SVG |


Disabled items: `cursor-not-allowed`, grayed out, non-clickable. Active items: `bg-shield-50 text-shield-700`.


### Dashboard Overview (Placeholder Charts)

All charts are pure Tailwind + inline SVG — zero charting libraries.


| Row | Layout |
|---|---|
| 1 | 4 stat cards (Total Users, Active, Deactivated, Admins) — full width |
| 2 | Activity Overview bar chart (2/3) + Distribution ring + Heatmap (1/3 stacked) |
| 3 | Monthly Incident Trend — SVG area chart, 12 months (full width) |
| 4 | Incident Type Breakdown stacked bars (1/2) + Response Time lollipop chart (1/2) |
| 5 | Recent Activity timeline (1/2) + Barangay Breakdown progress bars (1/2) |


### User Management

- Full-width table: Name/email, Barangay, Role badge, Status badge

- Role badge: click to toggle admin ↔ user (disabled for self)
- Status badge: click to toggle Active ↔ Inactive (disabled for self)
- Current admin row: light red highlight + "You" badge

- Self-lockout protection: handlers check `user.id === session.user.id` before API call

### Deactivation Flow

```
Admin toggles user inactive → is_active = false

User tries to log in → AuthContext.login() detects is_active === false

  → signOut() immediately → error: "Your account has been deactivated."
```

---


## Auth Flow

### Sign Up

1. Modal signup form (Full Name + Barangay + Email + Password + Confirm)
2. `signUp()` passes full_name/barangay via `options.data` → stored in `raw_user_meta_data`
3. DB trigger copies `raw_user_meta_data` into `profiles.full_name` and `profiles.barangay`
4. If email confirmation enabled → toast: "Check your email"
5. Email link → `/confirm` → `verifyOtp()` → `signOut()` → toast: "Email confirmed! Please sign in." → redirect `/`

### Sign In

1. Modal login form → `login()` returns `{ session, role }`
2. Checks `is_active` — if false → force sign out + error
3. Role-based redirect: admin → `/admin`, others → `/dashboard`

### Logout

1. `signOut()` — server tokens destroyed
2. `setSession(null)` + `setRole(null)` — local state cleared
3. Toast: "Logged out successfully."
4. Redirect to `/`

### Session Persistence

- `getSession()` on mount reads persisted session from local storage
- `onAuthStateChange` subscribes to cross-tab auth events
- `refreshRole()` wrapped in try-catch — falls back to `"user"` on failure
- `getProfile()` auto-inserts a profile row if one doesn't exist (fallback for missing trigger)

---

## Database (`schemas/profiles.sql` + `schemas/migration_location.sql`)

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | UUID PK | FK `auth.users` | — |
| `role` | TEXT | `'user'` | CHECK: admin, user |
| `is_active` | BOOLEAN | `true` | — |
| `full_name` | TEXT | from metadata | Signup form |
| `barangay` | TEXT | from metadata | Signup form |
| `lat` | DOUBLE PRECISION | NULL | GPS latitude |
| `lng` | DOUBLE PRECISION | NULL | GPS longitude |
| `last_seen_at` | TIMESTAMPTZ | NULL | Last location update |
| `location_sharing` | BOOLEAN | `false` | Opt-in toggle |
| `status` | TEXT | `'safe'` | CHECK: safe, help, emergency |
| `created_at` | TIMESTAMPTZ | `now()` | — |

### RLS Policies

| Policy | Table | Operation | Condition |
|---|---|---|---|
| Users can read own profile | profiles | SELECT | `auth.uid() = id` |
| Users can update own profile | profiles | UPDATE | `auth.uid() = id` |
| Admins can read all profiles | profiles | SELECT | `is_admin()` |
| Admins can update any profile | profiles | UPDATE | `is_admin()` |

### Helper Functions

- `is_admin()` — SECURITY DEFINER, avoids RLS recursion
- `get_all_profiles()` — SECURITY DEFINER RPC, joins with auth.users for email
- `handle_new_user()` — trigger auto-creates profile on signup


Set admin:
```sql
UPDATE public.profiles SET role = 'admin' WHERE id = '<uuid>';
```

---


## Services

### `auth.js` (15 functions)


| Function | Purpose |
|---|---|
| `signUp(email, pw, metadata)` | Register + pass full_name/barangay via `options.data` |
| `signIn(email, pw)` | Login |
| `signOut()` | Server tokens destroyed + local state cleared |
| `getSession()` | Current session from local storage |
| `getCurrentUser()` | Current auth user |
| `getUserRole()` | Role from profiles (fallback: `"user"`) |

| `getProfile()` | Full profile row — auto-inserts missing row |

| `verifyOtp(tokenHash, type)` | Email confirmation token verification |
| `fetchAllProfiles()` | Admin RPC — all users with emails |
| `updateUserRole(userId, role)` | Admin — change role |
| `toggleUserActive(userId, bool)` | Admin — activate/deactivate |


### `location.js` (3 functions)

| Function | Purpose | DB Operation |
|---|---|---|
| `upsertLocation(lat, lng)` | Writes position to own profile | `UPDATE profiles SET lat, lng, last_seen_at` |
| `updateStatus(status)` | Sets safe/help/emergency | `UPDATE profiles SET status` |
| `updateLocationSharing(enabled)` | Toggles sharing flag | `UPDATE profiles SET location_sharing` |

All use `.eq("id", user.id)` + `update()` — compatible with "Users can update own profile" RLS policy.

### `geocode.js`

`searchAddress(query)` — calls Nominatim API, returns `[{ lat, lng, display_name }]`, filtered to `countrycodes=ph`.


---

## Toast System

| Trigger | Message | Type | Duration |
|---|---|---|---|
| Signup (email confirm) | "Account created! Check your email..." | success | 7s |
| Email verified | "Email confirmed! Please sign in." | success | 5s |
| Logout (dashboard) | "Logged out successfully." | info | 4s |
| Logout (home) | "Logged out successfully." | info | 4s |
| Role updated | "X is now admin/user." | success | 5s |
| User activated/deactivated | "X activated/deactivated." | success | 5s |
| Deactivated login | "Your account has been deactivated..." | error (modal) | — |

| Marked as safe | "Marked as safe." | success | 4s |
| Help request sent | "Help request sent." | info | 4s |
| Emergency alert sent | "Emergency alert sent." | error | 4s |
| Location pinned | "Location pinned." | success | 2s |
| Location pin failed | "Failed to save location: ..." | error | 5s |


Fixed bottom-right, auto-dismiss, manually dismissible, survives route navigation.

---

## Form Validation

| Field | Rule | Applies to |
|---|---|---|
| Full Name | Required, min 2 chars | Signup |
| Barangay | Required | Signup |
| Email | RFC 5322 regex, required | Login + Signup |
| Password (login) | Required | Login |
| Password (signup) | 8+ chars, uppercase, lowercase, number, special char | Signup |
| Confirm | Must match password | Signup |

Real-time on change (when touched) + blur. Red/green borders, inline errors, password strength bar, show/hide toggle.

---

## Supabase Setup


1. Run `schemas/profiles.sql` in SQL Editor (creates table, triggers, policies)
2. Run `schemas/migration_location.sql` in SQL Editor (adds lat/lng/status/location_sharing columns + UPDATE policy)
3. **Auth → Settings → Email** — configure email confirmation
4. **Auth → URL Configuration** — set Site URL (`http://localhost:5173`)
5. **Auth → Email Templates** — confirm link: `{{ .SiteURL }}/confirm?token_hash={{ .TokenHash }}&type=signup`
6. **Storage** — create public bucket `Assets`, upload `flood.mp4`
7. Set your account as admin (SQL above)


## Commands

```powershell
cd website
npm install
npm run dev       # http://localhost:5173
npm run build     # → dist/
npm run preview
```



## Known bugs
- No proper schema for announcment system

## Must change
- Colors for the update button status

## Must implement
- Tag as family feature

