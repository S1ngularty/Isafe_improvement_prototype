# CityShield — Session 1 Implementation Log

**Date:** 06/14/2026

## Table of Contents
1. [Map & GPS Tracking](#1-map--gps-tracking)
2. [Address Search](#2-address-search)
3. [Location Controls](#3-location-controls)
4. [Weather Integration](#4-weather-integration)
5. [Announcements System](#5-announcements-system)
6. [Flood Hazard Analytics](#6-flood-hazard-analytics)
7. [Emergency Contact System](#7-emergency-contact-system)
8. [Extended Profile Fields](#8-extended-profile-fields)
9. [Family Control System](#9-family-control-system)
10. [Status Timer](#10-status-timer)
11. [Confirm Dialog](#11-confirm-dialog)
12. [Color Scheme](#12-color-scheme)
13. [Database Migrations](#13-database-migrations)

---

## 1. Map & GPS Tracking

### Files
`src/components/MapView.jsx`, `src/components/UserMarker.jsx`, `src/hooks/useGeolocation.js`, `src/services/location.js`, `src/services/leaflet-setup.js`

### Features
- Leaflet + OpenStreetMap tiles, restricted to Philippines bounds (maxBounds)
- Self-position marker with status-colored SVG pin (safe=green, help=yellow, emergency=red)
- Accuracy circle around the pin (dashed ring)
- Manual pin placement via map tap or address search
- "Pin Location" saves to database (UPDATE — never auto-saves)
- "Reset Pin" re-centers map on current pin
- Session persistence: fetches last saved lat/lng from `profiles` on mount
- Philippines-only map boundary enforcement

### Location Service
- `upsertLocation(lat, lng)` — UPDATE only (no upsert, avoids RLS INSERT block)
- `updateStatus(status)` — sets safe/help/emergency
- `updateLocationSharing(enabled)` — syncs toggle to DB

---

## 2. Address Search

### Files
`src/services/geocode.js`, `src/components/AddressSearch.jsx`

### Features
- Nominatim API — free, no API key, Philippines-only (`countrycodes=ph`)
- Floating search pill at top-center of map
- 400ms debounced input with visual feedback (pulse → spinner → results)
- Dropdown with keyboard navigation (arrow + enter)
- "No results found" / "Search unavailable" states
- Selecting an address moves the pin

---

## 3. Location Controls

### Files
`src/pages/Dashboard.jsx` (status buttons + location toggle)

### Features
- Three status buttons overlaid on the left edge of the map: Safe, Help, SOS
- All SVG icons (no emojis)
- "Share" location toggle button in the same stack (compact, below status buttons)
- Two bottom buttons: Reset Pin (re-center) + Pin Location (save to DB)
- Live/Manual/Off indicator badge with GPS accuracy

---

## 4. Weather Integration

### Files
`src/services/weather.jsx`, `src/hooks/useWeather.js`, `src/components/WeatherPanel.jsx`

### Features
- Open-Meteo API — free, no key, Philippines timezone
- `useWeather(lat, lng)` hook with 10-minute coordinate-keyed cache
- Current conditions card: temperature, rainfall, wind speed, sea level pressure, wind gusts
- Human-readable labels (e.g., "Sea Level Pressure" instead of "hPa")
- Danger thresholds with red borders + alert callouts:
  - Precipitation > 10mm/h → "Heavy rainfall — possible flooding"
  - Pressure < 1000 hPa → "Low sea level pressure — storm possible"
  - Wind > 50km/h → "Strong winds — take caution"
  - Gusts > 60km/h → "Dangerous wind gusts detected"
- Collapsible 24-hour hourly forecast in responsive grid (4/6/8 columns)
- 7 WMO weather code SVG icons (Clear Sky, Partly Cloudy, Fog, Drizzle, Rain, Heavy Rain, Thunderstorm)

---

## 5. Announcements System

### Files
`schemas/announcements.sql`, `src/services/announcements.js`, `src/components/AnnouncementBanner.jsx`

### Features
- Database-backed announcement banners with RLS
- Users read active announcements; admins CRUD all
- Slim 80px banner above user dashboard map, auto-rotates every 5s
- Fetches from DB on mount, falls back to 5 hardcoded disaster slides
- Admin: sidebar "Announcements" item with create form + management table
- Active/Hidden toggle, Delete, Publish

---

## 6. Flood Hazard Analytics

### Files
`machine_learning/flood_hazard_analysis.py`, `schemas/announcements.sql` (admin backend)
`src/pages/floodHazard/FloodHazardView.jsx`, `src/pages/floodHazard/FloodHazardMap.jsx`
`src/pages/floodHazard/FloodHazardCharts.jsx`, `src/pages/floodHazard/FloodHazardTable.jsx`
`src/pages/floodHazard/FloodHazardStats.jsx`, `src/pages/floodHazard/FloodHazardSidebar.jsx`
`src/pages/floodHazard/LayerControl.jsx`, `src/services/floodHazardApi.js`

### Features
- 100-year flood hazard model analysis for Tagkawayan, Quezon (45 barangays)
- Admin sidebar "Flood Hazard" view with full analytics dashboard:
  - 4 stat cards (At-Risk, Very High, High, Moderate+Low)
  - Leaflet choropleth map on satellite basemap, zoom-locked to Tagkawayan
  - Click barangay to see details in side panel
  - Opacity slider + basemap toggle controls
- Plotly charts (lazy-loaded): stacked bar chart (top 15), donut (risk distribution), count bar chart
- Sortable/searchable 45-row barangay table with risk level badges
- "Rerun Analysis" triggers Python script via backend
- Backend API: `/api/flood-hazard/` endpoints (summary, geojson, polygons, rerun)
- Static JSON files in `public/data/` for zero-backend loading
- Land area calculations projected to UTM Zone 51N (EPSG:32651) for accurate hectares

### Risk Levels
| Level | Barangays | Threshold |
|---|---|---|
| Very High | 1 | >= 50% |
| High | 2 | >= 30% |
| Moderate | 12 | >= 10% |
| Low | 15 | > 0% |
| None | 15 | 0% |

---

## 7. Emergency Contact System

### Files
`src/components/EmergencyContactsPanel.jsx`, `src/services/family.js`

### Features
- Family members as emergency contacts — displayed in two views:
  - Compact horizontal strip (main dashboard, below weather)
  - Full contacts page (sidebar "Contacts" view)
- Each contact card: avatar initial, name, phone number, status dot, last seen
- Green Call button (`tel:` link) + Blue SMS button (`sms:` link)
- Offline caching via localStorage (24h TTL)
- Shows "No Family Yet" fallback with setup link
- "No phone added" for members without numbers
- Replaced "Map (Soon)" sidebar item with "Contacts"

---

## 8. Extended Profile Fields

### Files
`schemas/migration_profile_extended.sql`, `src/components/UserProfile.jsx`, `src/components/AuthModal.jsx`

### 8 New Profile Columns
`blood_type`, `medical_notes`, `household_size`, `special_needs`, `street_address`, `external_name`, `external_phone`, `relationship`

### Features
- Profile page redesigned with 3-section card layout:
  - Personal Information (2/3 width)
  - External Contact + Health & Medical (1/3 width)
- Color-coded section headers with SVG icons
- Blood type dropdown at signup + profile
- Admin table shows Blood Type and Special Needs columns
- Maroon header banner with avatar, name, and email
- Full-width layout (no max-w caps)

---

## 9. Family Control System

### Files
`schemas/migration_family_role.sql`, `schemas/families.sql`, `src/components/FamilyMemberList.jsx`, `src/services/family.js`

### Features
- Three family roles: Head, Co-Head, Member
  - Head: Maroon badge, can remove anyone, promote/demote
  - Co-Head: Green badge, can remove members only
  - Member: No badge, no management permissions
- Three-dot menu (⋮) with colored SVG icons per action:
  - Remove from Family (red)
  - Promote to Co-Head (green arrow-up)
  - Demote to Member (amber arrow-down)
- Head auto-promotion: when head leaves, oldest co-head (or oldest member) becomes head
- Family creator automatically becomes head
- New members default to "member" on join
- All SQL uses SECURITY DEFINER RPCs (no new RLS policies needed)

---

## 10. Status Timer

### Files
`src/components/StatusTimerWidget.jsx`

### Features
- Full-width banner widget that slides in between the announcement banner and the map
- All status changes (Safe, Help, Emergency) require a countdown:
  - Safe: 3s
  - Help: 5s
  - Emergency: 3s
- Pulsing background animation (`animate-pulse`)
- Color-coded per status: green (safe), yellow (help), red (emergency)
- Cancel button with secondary confirmation dialog
- "Previous status" label shown during countdown
- Timer auto-commits status to Supabase when countdown reaches 0
- Cancel reverts to previous status — no API call made
- During countdown, further status button clicks are ignored

---

## 11. Confirm Dialog

### Files
`src/components/ConfirmDialog.jsx`

### Features
- Reusable Tailwind CSS confirmation dialog (replaces browser `window.confirm()`)
- Centered white card with backdrop blur
- Title, message, cancel button, colored confirm button
- Used by: FamilyMemberList (leave, remove) + StatusTimerWidget (cancel confirmation)
- Import: `import ConfirmDialog from "./ConfirmDialog"`

---

## 12. Color Scheme

### Tailwind Config (`tailwind.config.js`)

Maroon + white with red accents. Custom `shield` palette:

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

### Surface Application
| Surface | Color |
|---|---|
| Navbar (all pages) | Maroon (`bg-shield-800`, white text) |
| Sidebar (user + admin) | White |
| Content | Light gray (`bg-gray-50`) |
| Active sidebar item | Light red (`bg-shield-50`) |
| Footer | White with top border |

---

## 13. Database Migrations

### Schemas Created/Modified

| File | Tables/Columns |
|---|---|
| `profiles.sql` | Base profiles table |
| `families.sql` | Families table + 9 RPCs |
| `announcements.sql` | Announcements table |
| `migration_location.sql` | `lat`, `lng`, `last_seen_at`, `location_sharing`, `status` |
| `migration_family_role.sql` | `family_role` column |
| `migration_profile_fields.sql` | `phone_number`, `date_of_birth`, `gender` |
| `migration_profile_extended.sql` | `blood_type`, `medical_notes`, `household_size`, `special_needs`, `street_address`, `external_name`, `external_phone`, `relationship` |

### RLS Policies
- Users can read/update own profile
- Admins can read/update all profiles
- Family members can read each other's profiles
- Users can update their own family_id
- Anyone can read active announcements
- Admins can CRUD announcements
