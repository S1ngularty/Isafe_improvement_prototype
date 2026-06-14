# Mobile App Setup - Complete Scaffold

## ✅ What's Been Implemented

### Services
- **`supabase.js`** - Supabase client initialization with environment variables
- **`auth.js`** - Authentication functions: signUp, signIn, signOut, getProfile, updateProfile
- **`location.js`** - Location tracking: upsertLocation, updateStatus, updateLocationSharing, getLocationHistory

### Contexts
- **`AuthContext.js`** - Authentication state management with session, user, role, profile
- **`ToastContext.js`** - Toast notification management

### Screens
- **`AuthScreen.js`** - Login, Register, and OTP verification screens (combined)
- **`DashboardScreen.js`** - Main dashboard with:
  - Location tracking toggle
  - Real-time GPS updates
  - Three status buttons (Safe ✅ / Help ⚠️ / SOS 🚨)
  - Current status card
  - Emergency history navigation
- **`ProfileScreen.js`** - User profile display and edit:
  - Display full name, barangay, email, role, status
  - Edit functionality for name and barangay
  - Logout button
- **`EmergencyHistoryScreen.js`** - Emergency history list with timestamps and locations

### Components
- **`ToastNotification.js`** - Toast notification component

### Navigation
- **`App.js`** - Root app with React Navigation setup
  - AuthStack (unauthenticated users)
  - AppStack (authenticated users with Dashboard → Profile/History navigation)

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd mobile
npm install
# or
yarn install
```

### 2. Configure Environment Variables
Edit `mobile/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://ipkrnojfydmjqmawhrev.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

### 3. Run the App
```bash
# Start Expo
npm start

# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## 📱 Screen Flow

```
AuthScreen (Login/Register)
    ↓
DashboardScreen (Main app)
    ├→ Profile button → ProfileScreen (view/edit profile)
    ├→ History button → EmergencyHistoryScreen (view history)
    └→ Status buttons (update status in real-time)
```

## 🔑 Key Features

### Authentication
- Email/password signup with full_name and barangay
- Email verification via OTP
- Automatic session persistence
- Logout with confirmation

### Location Tracking
- Toggle location tracking on/off
- Real-time GPS updates every 10 seconds
- Latitude/longitude with accuracy display
- Automatic location saving to Supabase

### Status System
- **Safe** (✅) - User is safe
- **Help** (⚠️) - Help request active
- **SOS** (🚨) - Emergency alert active

### Profile Management
- View current profile info
- Edit full name and barangay
- Display role and account status
- Auto-load profile on app start

## 🔐 Supabase Integration

### Tables Used
- `profiles` - User profiles with location, status, and metadata

### RLS Policies (Already Setup in Web)
- Users can read/update own profile
- Admins can read all profiles

## 🎨 UI/UX Details

- Color scheme: Blue (#1e40af) primary, green for "safe", yellow for "help", red for "emergency"
- Uses Expo vector icons (MaterialIcons)
- Safe area layout for all screens
- Toast notifications for user feedback
- Loading states for async operations

## 🛠️ Development Tips

### Adding New Screens
1. Create screen file in `src/screens/`
2. Add to Stack.Navigator in App.js
3. Use `navigation.navigate("ScreenName")` to navigate
4. Use `navigation.goBack()` to go back

### Using Toast Notifications
```javascript
import { useToast } from "../context/ToastContext";

function MyComponent() {
  const { showToast } = useToast();
  
  showToast("Success!", "success", 4000);
  showToast("Error occurred", "error", 4000);
  showToast("Info", "info", 4000);
}
```

### Using Auth Context
```javascript
import { useAuth } from "../context/AuthContext";

function MyComponent() {
  const { session, user, role, profile, logout, refreshProfile } = useAuth();
  
  // session.user.id, session.user.email, etc.
}
```

## 📝 Next Steps for Full Implementation

1. **Backend API** - Create endpoints for:
   - GET `/api/profiles/{userId}`
   - PUT `/api/profiles/{userId}`
   - POST `/api/status` (for emergency alerts)

2. **Emergency Contacts** - Create screens for:
   - Add/edit/delete contacts
   - Display contacts list
   - Notify contacts on emergency

3. **Family Safety** - Add:
   - Create/join family groups
   - Display family members
   - Show family member locations
   - Receive family alerts

4. **Push Notifications** - Setup:
   - expo-notifications for iOS/Android
   - FCM for Android
   - APNs for iOS

5. **Offline Support** - Add:
   - expo-sqlite for local storage
   - Queue system for offline updates

6. **Emergency Guidance** - Create:
   - Guidance pages with categories
   - Step-by-step procedures
   - Preparedness checklists

## 🐛 Known Limitations

- Emergency history is mocked (needs dedicated DB table)
- Map view not yet implemented (needs react-native-maps)
- No push notifications setup
- No offline mode
- No family groups
- No emergency contacts management

## 📚 Reference Files

- Web auth service: `../website/src/services/auth.js`
- Web location service: `../website/src/services/location.js`
- Web Supabase config: `../website/src/js/supabase.js`
- Expo docs: https://docs.expo.dev/

