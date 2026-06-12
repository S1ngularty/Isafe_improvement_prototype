# CityShield Website

Disaster response and community safety platform connecting barangay officials and residents.

## Tech Stack


## 6/12/2026 - 8:46PM

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Routing | React Router DOM v6 |
| Build tool | Vite 6 |
| Styling | Tailwind CSS 3 |
| Auth | Supabase Auth (email/password + email confirmation) |
| Notifications | Custom Toast context |
| RBAC | Supabase RLS + `profiles` table (`admin` / `user`) |
| Media | Supabase Storage (public bucket: `Assets`) + external CDN images |

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
    ├── js/
    │   └── auth.js             # 12 exported functions (auth + admin)
    ├── context/
    │   ├── AuthContext.jsx     # session, role, loading, login, signup, logout
    │   └── ToastContext.jsx    # showToast, dismissToast (fixed bottom-right)
    ├── components/
    │   ├── Modal.jsx           # Overlay: Escape/click-to-close + fade+scale animation
    │   ├── AuthModal.jsx       # Tabbed login/signup + role-based redirect
    │   ├── AdminSidebar.jsx    # Collapsible sidebar with 5 navigation items
    │   └── ProtectedRoute.jsx  # Session gate + allowedRoles + admin redirect
    └── pages/
        ├── Home.jsx            # Landing page + hero carousel + auth-aware header
        ├── Dashboard.jsx       # User dashboard with admin panel link
        ├── AdminDashboard.jsx  # Admin: sidebar + overview charts + user management
        └── ConfirmEmail.jsx    # /confirm handler
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

Features:
- Left/right arrow navigation buttons (translucent circles)
- Dot indicators at bottom — active dot expands, click to jump
- Manual navigation resets auto-advance timer
- Dark gradient overlay keeps text readable across all slides
- Video autoplays when active, pauses when hidden
- Image slides use `loading="lazy"`

### Auth-Aware Header

**Logged out:** "Log In" + "Sign Up" buttons + hero "Get Started" / bottom CTA

**Logged in:** email display + "Admin" badge (if admin) + "Dashboard" link + "Log Out" button + hero/bottom CTA changes to "Go to Dashboard"

---

## Admin Dashboard

### Layout

- Dark header (`bg-shield-800`) with "Prototype" logo (links to `/`), admin badge, Home link, email, Log Out
- Collapsible sidebar (expand/collapse via chevron button, smooth 200ms transition)
  - Collapsed: 64px, icons only, tooltips on hover
  - Expanded: 224px, icons + labels + "Soon" badges
- Content area fills remaining width (no max-w cap)

### Sidebar Navigation

| Item | Status | Icon |
|---|---|---|
| Dashboard | Active | Home SVG |
| Users | Active | Users SVG |
| Alerts | Placeholder (Soon badge) | Bell SVG |
| Reports | Placeholder (Soon badge) | Chart SVG |
| Settings | Placeholder (Soon badge) | Cog SVG |

Disabled items: `cursor-not-allowed`, grayed out, non-clickable

### Dashboard Overview (Placeholder Charts)

All charts are pure Tailwind + inline SVG — zero charting libraries.

| Row | Left | Right |
|---|---|---|
| 1 | 4 stat cards (Total Users, Active, Deactivated, Admins) | — |
| 2 | Activity Overview (7-day bar chart) | Distribution (4-segment ring) + Heatmap (7×5 grid) |
| 3 | Monthly Incident Trend (SVG area chart, 12 months) | — |
| 4 | Incident Type Breakdown (5-category stacked bars) | Response Time (12-month lollipop chart) |
| 5 | Recent Activity (5-item timeline feed) | Barangay Breakdown (5-barangay progress bars) |

Heatmap: 35-cell grid, 5-color scale (gray → green → blue), "Less ↔ More" legend.

### User Management

- Full-width table: Name/email, Barangay, Role badge, Status badge
- **Role badge** — click to toggle admin ↔ user (disabled for self)
- **Status badge** — click to toggle Active ↔ Inactive (disabled for self)
- Current admin row highlighted with light blue background + "You" badge
- Self-lockout protection: handlers check `user.id === session.user.id` before API call

### Deactivation Flow

```
Admin toggles user inactive → is_active = false
User tries to log in → AuthContext.login() detects false
  → signOut() immediately → error: "Your account has been deactivated."
```

---

## Session Persistence

On mount, `AuthContext` calls `getSession()` (reads Supabase session from local storage) and subscribes to `onAuthStateChange` (cross-tab sync). Opening a new tab immediately recognizes an active session.

Error handling:
- `refreshRole()` wrapped in try-catch — falls back to `"user"` on failure
- `setLoading(false)` in `finally` — spinner always resolves
- `cancelled` flag prevents state updates after unmount

---

## Role-Based Access Control

```
Sign up → trigger creates profile (role = "user", is_active = true)
Sign in → AuthContext.login() fetches profile + checks is_active
       → deactivated → force sign out + error
       → active → admin → redirect /admin
                → user  → redirect /dashboard
```

### Database (`schemas/profiles.sql`)

| Column | Type | Default |
|---|---|---|
| `id` | UUID PK | FK `auth.users` |
| `role` | TEXT | `'user'` (CHECK: admin, user) |
| `is_active` | BOOLEAN | `true` |
| `full_name` | TEXT | from `raw_user_meta_data` |
| `barangay` | TEXT | from `raw_user_meta_data` |
| `created_at` | TIMESTAMPTZ | `now()` |

Includes:
- `is_admin()` — SECURITY DEFINER function (avoids RLS recursion)
- `get_all_profiles()` — SECURITY DEFINER RPC (joins with `auth.users` for email)
- `handle_new_user()` — trigger auto-creates profile on signup
- RLS: users read own profile, admins read/update all (via `is_admin()`)

Set admin:
```sql
UPDATE public.profiles SET role = 'admin' WHERE id = '<uuid>';
```

---

## Auth Functions (`auth.js`)

| Function | Purpose |
|---|---|
| `signUp(email, pw, metadata)` | Register + pass full_name/barangay via `options.data` |
| `signIn(email, pw)` | Login |
| `signOut()` | Server tokens destroyed + local state cleared |
| `getSession()` | Current session from local storage |
| `getCurrentUser()` | Current auth user |
| `getUserRole()` | Role from profiles (fallback: `"user"`) |
| `getProfile()` | Full profile row (role + is_active) |
| `verifyOtp(tokenHash, type)` | Email confirmation token verification |
| `fetchAllProfiles()` | Admin RPC — all users with emails |
| `updateUserRole(userId, role)` | Admin — change role |
| `toggleUserActive(userId, bool)` | Admin — activate/deactivate |

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

1. Run `schemas/profiles.sql` in SQL Editor
2. **Auth → Settings → Email** — configure email confirmation
3. **Auth → URL Configuration** — set Site URL (`http://localhost:5173`)
4. **Auth → Email Templates** — confirm link: `{{ .SiteURL }}/confirm?token_hash={{ .TokenHash }}&type=signup`
5. **Storage** — create public bucket `Assets`, upload `flood.mp4`
6. Set your account as admin (SQL above)

## Commands

```powershell
cd website
npm install
npm run dev       # http://localhost:5173
npm run build     # → dist/
npm run preview
```
