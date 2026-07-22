# Expo Go Deployment Guide

## Overview

This guide covers running the ISAFE mobile app via **Expo Go** for development and testing. Expo Go lets you iterate without native builds. However, due to native module limitations, a **development build** (EAS) is required for full functionality (see caveats below).

---

## Prerequisites

- Node.js 20+
- Expo Go app installed on your iOS/Android device
- A Supabase project (already configured)
- The backend running and network-accessible to your device

---

## Setup

```bash
cd mobile
cp .env.example .env
```

Edit `.env` with your values:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_BACKEND_URL=http://<host-ip>:8000
```

`EXPO_PUBLIC_BACKEND_URL` must be reachable from your device. Use your machine's LAN IP (e.g. `192.168.1.100`), not `localhost`.

```bash
npm install
```

---

## Running

```bash
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

### Useful flags

| Flag | Purpose |
|------|---------|
| `--tunnel` | Bypass local network issues (uses ngrok) |
| `--lan` | Default — requires device on same LAN |
| `--localhost` | iOS simulator or Android emulator only |

Example: `npx expo start --tunnel` when device can't reach your LAN IP.

---

## What Works in Expo Go

| Feature | Status |
|---------|--------|
| Supabase auth (email/OTP) | ✅ |
| Backend API calls | ✅ |
| Navigation (all stacks, tabs, drawer) | ✅ |
| Maps (Leaflet via WebView) | ✅ |
| Location (expo-location) | ✅ |
| Redux state management | ✅ |
| Weather, tides, alerts | ✅ |
| Charts & SVGs | ✅ |
| Offline SQLite | ✅ |
| FlashList | ✅ |
| UI (Paper, icons) | ✅ |

---

## What Does NOT Work in Expo Go

Expo Go cannot load custom native modules. The following require a **development build** (EAS or `expo run:android/ios`):

| Feature | Native Module | Workaround |
|---------|--------------|------------|
| **Push notifications (FCM)** | `@react-native-firebase/app`, `@react-native-firebase/messaging` | ⚠️ Silent failure — push notifications will not arrive. Use EAS build for push notification support. |
| `expo-notifications` background handling | Runtime permission | Works for local notifications in Expo Go. Remote push only works in native builds. |

### Firebase crash on launch

If the app crashes immediately with a Firebase-related error, wrap the Firebase initialization so it only runs in native builds:

```js
// In your App.js or a conditional import
let firebaseApps = null;
try {
  // Only import Firebase in native builds
  if (typeof window !== 'undefined' && window.nativeCallSyncHook) {
    firebaseApps = require('@react-native-firebase/app');
  }
} catch (e) {
  // Silently skip — Firebase unavailable in Expo Go
}
```

---

## EAS Build (Production/Testing)

When you need push notifications or native module features:

```bash
npm install -g eas-cli
eas login
eas build --profile preview --platform all
```

EAS profiles from `eas.json`:

| Profile | Type | Use Case |
|---------|------|----------|
| `development` | Dev client | Debugging with `expo-dev-client` |
| `preview` | Internal APK/IPA | QA team testing |
| `production` | Store-ready binary | App Store / Play Store |

---

## Environment Variables in EAS Builds

EAS builds read `.env` at build time — they do **not** ship `.env` in the bundle.

1. Create separate env files for each profile (e.g. `.env.production`).
2. Set EAS secrets for sensitive values:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value <url>
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <key>
eas secret:create --scope project --name EXPO_PUBLIC_BACKEND_URL --value <url>
```

Or use the `eas.json` `env` block for non-sensitive overrides.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Blank screen / no loading | Firebase native module crash | See Firebase workaround above |
| `Network request failed` | Backend URL not reachable | Use `--tunnel` or check LAN IP |
| `ENOENT: babel.config.js` | Missing Babel config | Create one with `module.exports = function(api) { api.cache(true); return { presets: ['babel-preset-expo'] }; };` |
| `react-native-reanimated` not working | Missing Babel plugin | Add `'react-native-reanimated/plugin'` to babel.config.js (must be last) |
| QR scan fails | Network connectivity | Run `npx expo start --tunnel` |
| `@react-native-firebase/messaging` error | Unavailable in Expo Go | Remove or conditionally import Firebase modules |

---

## Quick Start (TL;DR)

```bash
cd mobile
npm install
cp .env.example .env
# edit .env with real values
npx expo start --tunnel   # scan QR from Expo Go
```

If Firebase crashes on launch (blank screen), conditionally guard the Firebase import as described above. For push notifications, switch to an EAS development build.
