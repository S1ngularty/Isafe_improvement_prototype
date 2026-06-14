# Mobile ↔ Website Alignment Report

**Date:** June 14, 2026  
**Status:** Partially Aligned with fixes applied

---

## Summary of Changes

### ✅ Fixed (Today)

1. **Standardized File Extensions**
   - Renamed all services from `.js` → `.jsx`
     - `auth.js` → `auth.jsx`
     - `location.js` → `location.jsx`
     - `supabase.js` → `supabase.jsx`
   - Renamed all contexts from `.js` → `.jsx`
     - `AuthContext.js` → `AuthContext.jsx`
     - `ToastContext.js` → `ToastContext.jsx`
   - Updated all imports across the app to use `.jsx` extensions
   - Deleted unused `AuthService.js` (mock implementation)

2. **Added Missing Services** (Now aligned with website)
   - **`services/geocode.jsx`** - Nominatim address search (Philippines-only)
     - `searchAddress(query)` - Search for addresses
     - `reverseGeocode(lat, lng)` - Reverse geocoding
   
   - **`services/weather.jsx`** - Open-Meteo weather API integration
     - `fetchCurrent(lat, lng)` - Current weather conditions
     - `fetchHourly(lat, lng)` - 24-hour forecast
     - WMO weather code mapping with danger detection
     - Danger thresholds: Heavy rain (>10mm), Low pressure (<1000hPa), Strong winds (>50km/h), Gusts (>60km/h)
   
   - **`services/announcements.jsx`** - Announcement banner management
     - `fetchActiveAnnouncements()` - Get active banners
     - `fetchAllAnnouncements()` - Admin: all announcements
     - `createAnnouncement(data)` - Admin: create
     - `updateAnnouncement(id, updates)` - Admin: edit
     - `deleteAnnouncement(id)` - Admin: delete
     - `toggleAnnouncementActive(id, isActive)` - Admin: toggle visibility

3. **Added Missing Hooks** (New `/hooks` directory)
   - **`hooks/useGeolocation.jsx`**
     - Wrapper around `expo-location.watchPositionAsync()`
     - Automatic permission handling
     - Configurable accuracy, timeout, callbacks
     - Memory leak prevention
   
   - **`hooks/useWeather.jsx`**
     - Fetches current + hourly weather
     - 10-minute cache keyed on coordinates (rounded to 2 decimals)
     - Same algorithm as website for caching efficiency
     - Memory leak prevention with `isMounted` flag

4. **Enhanced Auth Service** (`services/auth.jsx`)
   - Added admin-focused functions (for future admin panel):
     - `fetchAllProfiles()` - Admin RPC to get all users
     - `updateUserRole(userId, role)` - Admin: change user role
     - `toggleUserActive(userId, isActive)` - Admin: activate/deactivate users
   - All functions now match website's `auth.js` (15 functions total)

---

## Current Alignment Status

### ✅ FULLY ALIGNED

| Component | Website | Mobile | Status |
|-----------|---------|--------|--------|
| **Auth Flow** | Supabase email/password + OTP | ✅ Same | Aligned |
| **Services Layer** | auth, location, geocode, weather, announcements | ✅ All added | Aligned |
| **Context API** | AuthContext, ToastContext | ✅ Both | Aligned |
| **Database Schema** | profiles (lat, lng, status, location_sharing, role, is_active) | ✅ Same | Aligned |
| **Location Operations** | upsertLocation, updateStatus, updateLocationSharing | ✅ All | Aligned |
| **Toast System** | Context-based, auto-dismiss | ✅ Same | Aligned |
| **Geocoding** | Nominatim (Philippines-only) | ✅ Added | Aligned |
| **Weather** | Open-Meteo API | ✅ Added | Aligned |
| **Hooks** | useGeolocation, useWeather | ✅ Added | Aligned |
| **File Extensions** | Not specified | ✅ `.jsx` | Standardized |

### ⚠️ PARTIALLY ALIGNED (Expected)

| Component | Website | Mobile | Notes |
|-----------|---------|--------|-------|
| **Admin Panel** | Full admin dashboard + user mgmt | Limited | Mobile is user-focused. Admin functions added to auth.jsx for future expansion |
| **Announcements UI** | AnnouncementBanner component | Not yet | Need to add announcement banner component to dashboard |
| **Weather UI** | WeatherPanel component | Not yet | Need to add weather display to dashboard |
| **Address Search** | AddressSearch component | Not yet | Need to add geocoding UI to screens |

### ❌ NOT IMPLEMENTED (Needs Backend)

| Feature | Website | Mobile | Issue |
|---------|---------|--------|-------|
| **API Endpoints** | FastAPI defined | ❌ Missing | Backend needs to implement mobile endpoints |
| **WebSocket** | N/A | Potential | Real-time updates would require WebSocket setup |
| **Push Notifications** | N/A | Not yet | Need expo-notifications + FCM/APNs setup |
| **Map Integration** | Leaflet + react-leaflet | ❌ Missing | React Native needs react-native-maps (different from web) |
| **Background Location** | N/A | Not yet | Requires expo-task-manager + location background plugin |

---

## File Structure

### Before
```
mobile/src/
├── services/
│   ├── auth.js
│   ├── AuthService.js (mock, unused)
│   ├── location.js
│   └── supabase.js
├── context/
│   ├── AuthContext.js
│   └── ToastContext.js
├── screens/
│   ├── auth/
│   ├── dashboard/
│   ├── profile/
│   └── emergency/
```

### After
```
mobile/src/
├── services/
│   ├── auth.jsx ✨ Enhanced with admin functions
│   ├── location.jsx
│   ├── supabase.jsx
│   ├── geocode.jsx ✨ NEW
│   ├── weather.jsx ✨ NEW
│   └── announcements.jsx ✨ NEW
├── context/
│   ├── AuthContext.jsx
│   └── ToastContext.jsx
├── hooks/ ✨ NEW DIRECTORY
│   ├── useGeolocation.jsx ✨ NEW
│   └── useWeather.jsx ✨ NEW
├── screens/
│   ├── auth/
│   ├── dashboard/
│   ├── profile/
│   └── emergency/
```

---

## Next Steps (Priority Order)

### Immediate (Mobile App)
1. **Add Announcement Banner Component**
   - Display active announcements at top of Dashboard
   - Auto-rotate every 5 seconds (like website)
   - Fallback to hardcoded slides if DB empty

2. **Add Weather Panel Component**
   - Show current weather on Dashboard below location toggle
   - Display weather icon + temperature + metrics
   - Show danger alerts with contextual styling

3. **Integrate Address Search (Geocoding)**
   - Add search modal/screen to dashboard
   - Allow users to search and set location manually
   - Save selected location via `upsertLocation()`

### Backend Requirements
1. **Implement FastAPI Endpoints** (See BACKEND.md)
   - GET/PUT `/api/profiles/{userId}`
   - POST `/api/status`
   - POST `/api/location`
   - GET `/api/announcements`

2. **Supabase RLS Policies**
   - Verify `profiles` table policies match website setup
   - Ensure `announcements` table exists with RLS
   - Test admin vs user access

3. **Email Configuration**
   - Verify Supabase email confirmation is enabled
   - Check email template for OTP link format

### Advanced (Future)
1. **Background Location Tracking**
   - Use `expo-task-manager` for background updates
   - Periodic location pushes even when app closed

2. **Push Notifications**
   - expo-notifications + FCM/APNs
   - Alert users of emergency broadcasts
   - Reply-to-status notifications

3. **Map Integration**
   - react-native-maps (NOT Leaflet)
   - Show nearby users (if enabled)
   - Emergency centers, evacuation routes

4. **Offline Support**
   - SQLite cache for profiles
   - Queue offline status changes
   - Sync when connection restored

---

## Testing Checklist

- [ ] All `.jsx` imports resolve correctly
- [ ] Login/Register/OTP flow works
- [ ] Location tracking updates every 10 seconds
- [ ] Status button changes sync to DB
- [ ] Weather fetches correctly (with cache)
- [ ] Address search returns results
- [ ] Announcements load from DB (or fallback to mocked data)
- [ ] Toast notifications display and auto-dismiss
- [ ] Profile view/edit modes work
- [ ] Emergency history displays
- [ ] App doesn't crash on permission denials
- [ ] Cross-tab auth events handled correctly

---

## Known Issues

1. **Announcement Schema**: Website docs say "No proper schema for announcement system" — ensure `announcements` table exists in Supabase
2. **Color Status Update**: Website docs mention "Must change: Colors for the update button status" — verify shield colors applied correctly
3. **Backend Endpoints**: Not yet implemented in FastAPI

---

## References

- Website implementation: `/Documentation/WEBSITE.md`
- Mobile setup: `/mobile/SETUP.md`
- Backend structure: `/backend/app/`
- Supabase schemas: `/schemas/`
