# iSafe Mobile App Documentation

## Overview

The iSafe mobile application is a React Native-based emergency response and safety tracking platform. It enables users to report their status (safe, help request, emergency) through an intuitive interface with real-time location tracking and emergency alert history.

**Current Version:** 1.0.0  
**Platform:** React Native (Expo)  
**Target OS:** iOS & Android

---

## Architecture

### Navigation Structure

The app uses a **bottom-tab navigation** system with 5 main sections:

```
┌─────────────────────────────────────┐
│     Home | Alerts | SOS | Maps | Profile
├─────────────────────────────────────┤
│                                      │
│           Screen Content             │
│                                      │
├─────────────────────────────────────┤
│ [Home] [Alerts] [SOS] [Maps] [Profile]
└─────────────────────────────────────┘
```

#### Tab Structure
- **Home** - Dashboard with user status card, announcements, weather, quick actions
- **Alerts** - Emergency history and past alerts
- **SOS** - Central emergency button (non-navigable, tap-to-activate)
- **Maps** - Real-time location visualization on interactive map
- **Profile** - User profile management and settings

### Core Components

#### Authentication Flow
- **AuthContext** - Manages session, user, role, and profile state
  - `refreshSession()` - Explicit session refresh
  - `refreshProfile()` - Update profile data
  - `logout()` - Clear session and exit

#### App Context Providers
- **AuthProvider** - Authentication state management
- **ToastProvider** - Toast notification system

---

## Key Features

### 1. **SOS Button**
**Location:** `src/components/SOSButton.jsx`

Interactive multi-tap status submission button with visual feedback.

**Status Cycle:**
```
Tap 1: Ascend (float up animation)
Tap 2: Preview "safe" (green)
Tap 3: Preview "help" (yellow warning)
Tap 4: Preview "emergency" (red)
Tap 5+: Cycle back to "safe"
```

**Behavior:**
- After 3.5s of inactivity, status commits to database
- Visual countdown progress ring shows commit timer
- Optimistic UI updates (instant feedback, async DB write)
- External status changes reset the button to dormant state
- Never blocks on network calls

**Props:**
```javascript
{
  onStatusChange: (newStatus) => Promise,  // Callback when status is committed
  currentStatus: string  // Current authoritative status ("safe"|"help"|"emergency")
}
```

### 2. **Maps Screen**
**Location:** `src/screens/maps/MapsScreen.jsx`

Real-time location tracking and visualization using Leaflet.js and OpenStreetMap tiles.

**Features:**
- Interactive map centered on user's current location
- Color-coded user marker based on status:
  - Green (#15803d) = Safe
  - Orange (#d97706) = Help requested
  - Red (#dc2626) = Emergency
- Real-time location updates
- Zoom controls and pan functionality
- Location permission handling

**Technologies:**
- Leaflet.js 1.9.4 - Map library
- OpenStreetMap - Tile provider
- WebView - HTML/JS rendering in React Native
- expo-location - Device location

### 3. **Dashboard Screen**
**Location:** `src/screens/dashboard/DashboardScreen.jsx`

Main app hub featuring:
- User status card with quick status change
- Announcements banner
- Weather panel
- Address search functionality
- Real-time location tracking

**Props:**
```javascript
{
  currentStatus: string  // Current user status for display
}
```

### 4. **Profile Screen**
**Location:** `src/screens/profile/ProfileScreen.jsx`

User profile management and settings.

### 5. **Emergency History Screen**
**Location:** `src/screens/emergency/EmergencyHistoryScreen.jsx`

View past emergency alerts and historical records.

---

## Services

### Authentication Service
**Location:** `src/services/auth.js`

Handles user authentication with Supabase.

### Location Service
**Location:** `src/services/location.js`

**Key Functions:**
- `updateStatus(newStatus)` - Submit status update to backend
- `upsertLocation(coordinates)` - Save user location
- Location tracking and persistence

### Geocoding Service
**Location:** `src/services/geocode.js`

Converts coordinates to addresses and vice versa.

### Weather Service
**Location:** `src/services/weather.js`

Fetches weather data for the user's location.

### Announcements Service
**Location:** `src/services/announcements.js`

Retrieves public safety announcements.

### Supabase Service
**Location:** `src/services/supabase.js`

Centralized Supabase client configuration and utilities.

---

## State Management

### Authentication Context
```javascript
{
  session: object | null,           // Active session
  user: object | null,              // User data
  role: string | null,              // User role
  profile: object | null,           // User profile data
  loading: boolean,                 // Loading state
  logout: () => Promise,            // Logout function
  refreshProfile: () => Promise,    // Refresh profile
  refreshSession: () => Promise     // Refresh session
}
```

### Toast Context
```javascript
{
  toasts: array,                    // Active notifications
  showToast: (message, type) => void // Show toast notification
}
```

---

## Dependencies

### Navigation
- `@react-navigation/native` - Core navigation
- `@react-navigation/native-stack` - Stack navigation
- `@react-navigation/bottom-tabs` - Tab navigation

### UI & Icons
- `react-native` - Core framework
- `@expo/vector-icons` - Material Design icons
- `expo-font` - Font loading

### State Management
- `@reduxjs/toolkit` - Redux toolkit
- `react-redux` - React Redux integration

### Location & Maps
- `expo-location` - Device location access
- `react-native-webview` - Web content rendering
- `leaflet` - Map library (via WebView)

### Backend
- `@supabase/supabase-js` - Supabase client
- `axios` - HTTP client

### Others
- `expo-auth-session` - OAuth handling
- `expo-permissions` - Permission management

---

## Setup & Installation

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Expo CLI
- iOS/Android development environment (for native builds)

### Installation
```bash
cd mobile
npm install
```

### Running the App

**Development (Expo Go)**
```bash
npm start
```

**Reset cache**
```bash
npm start -- --reset-cache
```

**Build for iOS**
```bash
expo build:ios
```

**Build for Android**
```bash
expo build:android
```

---

## Project Structure

```
src/
├── App.js                         # Root component with navigation
├── components/
│   ├── SOSButton.jsx              # Interactive SOS button
│   ├── AddressSearch.jsx          # Address search component
│   ├── AnnouncementBanner.jsx     # Announcements display
│   ├── WeatherPanel.jsx           # Weather information
│   └── ToastNotification.jsx      # Toast notifications
├── context/
│   ├── AuthContext.jsx            # Auth state management
│   └── ToastContext.jsx           # Toast notifications state
├── hooks/
│   ├── useGeolocation.js          # Geolocation hook
│   └── useWeather.js              # Weather data hook
├── screens/
│   ├── auth/
│   │   ├── AuthScreen.jsx         # Auth landing
│   │   └── LoginScreen.jsx        # Login form
│   ├── dashboard/
│   │   └── DashboardScreen.jsx    # Main dashboard
│   ├── maps/
│   │   └── MapsScreen.jsx         # Map visualization
│   ├── profile/
│   │   └── ProfileScreen.jsx      # User profile
│   └── emergency/
│       └── EmergencyHistoryScreen.jsx  # Alert history
├── services/
│   ├── auth.js                    # Authentication
│   ├── location.js                # Location & status
│   ├── geocode.js                 # Geocoding
│   ├── weather.js                 # Weather data
│   ├── announcements.js           # Announcements
│   └── supabase.js                # Supabase config
└── routes/
    └── AuthRoutes.jsx             # Auth routing
```

---

## API Integration

### Backend Endpoints Used
- **Status Updates** - POST `/api/status` with status payload
- **Location Tracking** - POST `/api/location` with coordinates
- **Profile Data** - GET `/api/profile` for user information
- **Emergency History** - GET `/api/emergencies` for alert records
- **Announcements** - GET `/api/announcements` for public alerts
- **Weather** - External weather API integration

---

## UI Design System

### Color Palette
```javascript
{
  shieldPrimary: "#991b1b",    // Main brand red
  gray50: "#f9fafb",           // Light background
  gray300: "#d1d5db",          // Inactive icon color
  gray700: "#374151",          // Dark text
  white: "#fff",               // White
  successBg: "#dcfce7",        // Safe status
  successText: "#15803d",      // Safe text
  warningBg: "#fef3c7",        // Help status
  warningText: "#d97706",      // Help text
  errorBg: "#fee2e2",          // Emergency status
  errorText: "#dc2626"         // Emergency text
}
```

### Typography
- Uses system fonts and Material Design icons
- FontAwesome via `@expo/vector-icons`

---

## Performance Optimizations

1. **Optimistic UI Updates** - Status changes reflect immediately while async operations complete
2. **Lazy Navigation** - Tab screens load on demand
3. **Font Preloading** - Material Design fonts loaded at app startup
4. **Location Caching** - Recent locations cached to reduce API calls
5. **Memoized Components** - Prevents unnecessary re-renders

---

## Error Handling

- **Try-catch blocks** in all async operations
- **Toast notifications** for user feedback
- **State rollback** on failed operations (e.g., reverts optimistic updates)
- **Logging** to console for debugging

---

## Testing

### Manual Testing Checklist
- [ ] Authentication flow (login/logout)
- [ ] Status submission (safe/help/emergency)
- [ ] Location tracking accuracy
- [ ] Tab navigation smoothness
- [ ] Toast notifications display
- [ ] Network error handling
- [ ] Offline functionality (if applicable)

---

## Known Issues & TODOs

- **TODO:** Implement offline status queuing
- **TODO:** Add background location tracking service
- **TODO:** Implement advanced analytics
- **TODO:** Add contact sharing for emergency alerts

---

## Contributing

Follow the file naming conventions in `FILE_NAMING_CONVENTION.md` and alignment guidelines in `ALIGNMENT_REPORT.md`.

---

## Support

For issues or questions, refer to:
- `SETUP.md` - Setup instructions
- `AGENTS.md` - Agent configurations
- `CLAUDE.md` - Claude AI integration notes