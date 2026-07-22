# ISAFE (CityShield) — User Manual

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Project Structure](#3-project-structure)
4. [Setting Up the Backend (FastAPI)](#4-setting-up-the-backend-fastapi)
5. [Setting Up the Website (React)](#5-setting-up-the-website-react)
6. [Setting Up the Mobile App (React Native / Expo)](#6-setting-up-the-mobile-app-react-native--expo)
7. [Database Setup (Supabase)](#7-database-setup-supabase)
8. [Setting Up the IoT Sensor (ESP32)](#8-setting-up-the-iot-sensor-esp32)
9. [Modifying WiFi Credentials for the IoT Sensor](#9-modifying-wifi-credentials-for-the-iot-sensor)
10. [Environment Variables Reference](#10-environment-variables-reference)
11. [Running the Project](#11-running-the-project)
12. [Deployment](#12-deployment)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Overview

ISAFE (CityShield) is a disaster response and community safety platform for the Philippines. It connects barangay officials, residents, and emergency rescuers through web and mobile applications. The system monitors flood water levels via IoT sensors, provides weather data, tracks family members during disasters, manages evacuation centers, sends SMS alerts, and coordinates rescue operations.

**Target Location:** Tagkawayan, Quezon, Philippines (45 barangays)

### Key Features

- Real-time user safety status (Safe / Help / Emergency)
- GPS-based family member tracking on interactive maps
- ESP32 ultrasonic flood sensors with MQTT telemetry
- Tropical cyclone warning signals (TCWS 1–5)
- Weather data from Open-Meteo (proxied through backend)
- Tide data monitoring and alerts
- Evacuation center management
- Rescue coordination system
- SMS alerts via TextBee
- Push notifications via Expo
- AI chatbot assistant (Groq LLaMA)

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | FastAPI (Python 3.11+), Uvicorn |
| Web Frontend | React 18, Vite 6, Tailwind CSS 3 |
| Mobile | React Native, Expo SDK 54 |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth (JWT) |
| IoT Sensors | ESP32, HC-SR04, MQTT (CloudAMQP) |
| Maps | Leaflet + OpenStreetMap |
| SMS | TextBee API |
| AI Chat | Groq API (LLaMA 3.3 70B) |

---

## 2. Prerequisites

### Required Software

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.11+ | Backend server |
| Node.js | 18+ | Web and mobile frontends |
| npm | 9+ | Package management |
| Git | Latest | Version control |
| Expo CLI | Latest | Mobile development |
| Arduino IDE | 2.x | IoT sensor programming |
| Supabase account | — | Database and auth |

### Optional but Recommended

- **Docker** — for containerized backend deployment
- **ngrok** — for testing mobile against a local backend
- **Expo Go** (iOS/Android) — for testing the mobile app on a device

---

## 3. Project Structure

```
isafe/
├── backend/             # FastAPI server (Python)
│   ├── app/
│   │   ├── api/         # Route handlers (22 modules)
│   │   ├── services/    # Business logic (25 modules)
│   │   ├── models/      # Pydantic v2 models
│   │   ├── mqtt/        # MQTT subscriber (IoT integration)
│   │   └── core/        # Config, auth, cache, scheduler
│   ├── requirements.txt # Python dependencies
│   └── .env             # Backend environment variables
│
├── website/             # React web app
│   ├── src/
│   │   ├── components/  # 36 reusable components
│   │   ├── pages/       # Route pages
│   │   ├── services/    # API + Supabase wrappers
│   │   ├── hooks/       # Custom React hooks
│   │   └── context/     # React Context providers
│   ├── package.json
│   └── .env
│
├── mobile/              # React Native app (Expo)
│   ├── src/
│   │   ├── screens/     # 10 screen groups
│   │   ├── components/  # Shared components
│   │   ├── services/    # API + Supabase wrappers
│   │   ├── hooks/       # Custom hooks
│   │   └── context/     # Context providers
│   ├── package.json
│   └── .env
│
├── IOT_SENSOR/          # ESP32 Arduino firmware
│   ├── ultrasonic/      # Main sensor firmware (HC-SR04 + float switches)
│   ├── hc-sr04-mqtt/    # Basic sensor firmware
│   ├── hc-sr04-debug/   # Serial debug tool
│   ├── debug_sensor/    # SR04M-2 diagnostic tool
│   └── test_wifi/       # WiFi connectivity tester
│
├── schemas/             # 45 SQL migration files (run in order)
└── machine_learning/    # Flood hazard analysis (Python + Google Earth Engine)
```

---

## 4. Setting Up the Backend (FastAPI)

### Step 1: Clone and navigate

```bash
git clone <repository-url> isafe
cd isafe/backend
```

### Step 2: Create and activate a virtual environment

```bash
python -m venv venv
source venv/bin/activate    # Linux / macOS
# OR
venv\Scripts\Activate.ps1   # Windows (PowerShell)
```

### Step 3: Install Python dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Install optional JS dependencies

Some backend tooling scripts may require Node.js packages:

```bash
cd backend && npm install
```

### Step 5: Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

**Required variables in `backend/.env`:**

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side) | `eyJ...` |
| `APP_NAME` | Application name | `cityshield` |
| `APP_VERSION` | App version | `1.0.0` |
| `APP_CONTACT_EMAIL` | Contact for Nominatim User-Agent | `contact@example.com` |

See [Section 10](#10-environment-variables-reference) for the full list.

### Step 6: Verify setup

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`. Visit `http://localhost:8000/docs` for the Swagger UI.

---

## 5. Setting Up the Website (React)

### Step 1: Navigate and install

```bash
cd isafe/website
npm install
```

### Step 2: Configure environment variables

```bash
cp .env.example .env
```

**Required variables in `website/.env`:**

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key (public) | `eyJ...` |
| `VITE_BACKEND_URL` | Backend server URL | `http://localhost:8000` |

### Step 3: Start the development server

```bash
npm run dev
```

The website will be available at `http://localhost:5173`.

### Step 4: Build for production

```bash
npm run build
```

The output will be in `website/dist/`.

---

## 6. Setting Up the Mobile App (React Native / Expo)

### Step 1: Navigate and install

```bash
cd isafe/mobile
npm install
```

### Step 2: Configure environment variables

```bash
cp .env.example .env
```

**Required variables in `mobile/.env`:**

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |
| `EXPO_PUBLIC_BACKEND_URL` | Backend server URL | `http://localhost:8000` |

### Step 3: Start the Expo development server

```bash
npx expo start
```

### Step 4: Run on a device

- **Expo Go** — Scan the QR code with your phone (iOS or Android)
- **Emulator** — Press `a` (Android) or `i` (iOS) in the terminal
- **Production build** — Use `npx expo run:android` or `npx expo run:ios`

> **Note:** When testing against a local backend on your machine, use `ngrok` to expose the backend URL and update `EXPO_PUBLIC_BACKEND_URL` accordingly. On Android emulator, `http://10.0.2.2:8000` routes to the host machine's `localhost:8000`.

---

## 7. Database Setup (Supabase)

### Step 1: Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project
3. Note your project URL and API keys (anon + service_role)

### Step 2: Run SQL migrations

All schema definitions are in `isafe/schemas/`. Run them in numeric order using the Supabase SQL Editor:

1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of each `.sql` file and run it
3. **Run in this order:**

   | Order | File | Purpose |
   |-------|------|---------|
   | 1 | `schemas/profiles.sql` | Core profiles table + RBAC |
   | 2 | `schemas/families.sql` | Family groups |
   | 3 | `schemas/evac.sql` | Evacuation centers |
   | 4 | `schemas/announcements.sql` | Announcement banners |
   | 5 | `schemas/contacts.sql` | Emergency contacts |
   | 6 | `schemas/hotlines.sql` | Hotline numbers |
   | 7 | `schemas/avatars.sql` | Avatar storage bucket |
   | 8 | `schemas/tcws.sql` | Tropical cyclone warnings |
   | 9 | `schemas/family_messages.sql` | Family chat |
   | 10 | `schemas/update_role.sql` | Role management |
   | 11 | `schemas/0012_tide_data.sql` through `schemas/004_add_phone_verified.sql` | All remaining migrations in numeric order |

> **Important:** The exact order of the numbered migration files (`0012_` through `0036_`, `0040_`) matters. Run them sequentially — later files depend on earlier ones.

### Step 3: Enable Row-Level Security (RLS)

All tables already have RLS policies defined in the migration files. Verify they are active:

1. Supabase Dashboard → Authentication → Policies
2. Confirm every table has active policies

### Step 4: Set up Authentication

1. Supabase Dashboard → Authentication → Settings
2. Enable **Email + Password** sign-in
3. Enable **Confirm email** (recommended)
4. Under **Site URL**, set your frontend URL (e.g., `http://localhost:5173`)

---

## 8. Setting Up the IoT Sensor (ESP32)

The system uses ESP32 microcontrollers with HC-SR04 ultrasonic distance sensors to measure flood water levels. Data is sent via MQTT to the backend.

### Hardware Required

- ESP32 development board
- HC-SR04 ultrasonic distance sensor
- Optional: float switches (1m and 2m thresholds)
- Jumper wires
- 5V power supply (or USB)

### Wiring Diagram

**HC-SR04 Ultrasonic Sensor:**

| HC-SR04 Pin | ESP32 GPIO |
|-------------|------------|
| VCC | 5V (or 3.3V) |
| GND | GND |
| TRIG | GPIO 5 (ultrasonic sketch) / GPIO 27 (hc-sr04-mqtt) |
| ECHO | GPIO 18 (ultrasonic sketch) / GPIO 26 (hc-sr04-mqtt) |

**Float Switches (optional, ultrasonic sketch only):**

| Float Switch | ESP32 GPIO |
|-------------|------------|
| 1m float | GPIO 33 |
| 2m float | GPIO 32 |

### Step 1: Install Arduino IDE dependencies

1. Open Arduino IDE
2. Go to **File → Preferences** and add this URL to "Additional Boards Manager URLs":
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Go to **Tools → Board → Boards Manager**, search for "ESP32" and install
4. Install libraries via **Sketch → Include Library → Manage Libraries**:
   - **PubSubClient** by Nick O'Leary
   - **NewPing** by Tim Eckel
   - **WiFi** (built-in with ESP32 package)

### Step 2: Configure WiFi and MQTT credentials

Copy the example secrets file and edit:

```bash
cp isafe/IOT_SENSOR/ultrasonic/secrets.example.h isafe/IOT_SENSOR/ultrasonic/secrets.h
```

Edit `secrets.h` (see [Section 9](#9-modifying-wifi-credentials-for-the-iot-sensor)).

### Step 3: Flash the firmware

1. Open the `.ino` file in Arduino IDE:
   - `isafe/IOT_SENSOR/ultrasonic/ultrasonic.ino` (recommended — full features)
   - OR `isafe/IOT_SENSOR/hc-sr04-mqtt/hc-sr04-mqtt.ino` (basic version)
2. Select your board: **Tools → Board → ESP32 Arduino → ESP32 Dev Module**
3. Select the correct COM port
4. Click **Upload**

### Step 4: Verify the sensor is working

Open the Serial Monitor (**Tools → Serial Monitor**, 115200 baud). You should see:

```
========== HC-SR04 MQTT ==========
Connecting to WiFi...
Connected. IP: 192.168.x.x
Connecting to MQTT... connected
Dist: 45.2 cm  |  Float1: at rest  |  Float2: at rest
Published: {"sensor_id":"SR04M-2","distance_mm":452,"water_level_cm":45.2,...}
```

### Step 5: Alternative sensor sketches

| Sketch | Location | When to use |
|--------|----------|-------------|
| `ultrasonic.ino` | `IOT_SENSOR/ultrasonic/` | **Recommended** — full features with float switches, EMA filtering |
| `hc-sr04-mqtt.ino` | `IOT_SENSOR/hc-sr04-mqtt/` | Basic version, no float switches |
| `hc-sr04-debug.ino` | `IOT_SENSOR/hc-sr04-debug/` | Debugging sensor readings via serial |
| `debug_sensor.ino` | `IOT_SENSOR/debug_sensor/` | Deep diagnostics for SR04M-2 module |
| `test_wifi.ino` | `IOT_SENSOR/test_wifi/` | Testing WiFi connectivity only |
| `float_switch.ino` | `IOT_SENSOR/misc/` | Testing float switch wiring |

### MQTT Data Flow

```
ESP32 → MQTT (CloudAMQP, topic: "flood/water_level")
  → Backend MQTT subscriber (paho-mqtt)
    → flood_level_service.py (processes readings)
      → Inserted into water_level_readings table
        → flood_alert_service.py (checks thresholds → SMS alerts)
```

### Payload Format

```json
{
  "sensor_id": "SR04M-2",
  "distance_mm": 452,
  "water_level_cm": 45.2,
  "float_switch_1m": false,
  "float_switch_2m": false
}
```

---

## 9. Modifying WiFi Credentials for the IoT Sensor

The IoT sensor needs to connect to a WiFi network to send data via MQTT. Credentials are stored in a `secrets.h` file in each sketch's folder.

### Step 1: Locate the secrets file

Each sketch has its own `secrets.h`:

| Sketch | Secrets file |
|--------|-------------|
| `ultrasonic/` | `IOT_SENSOR/ultrasonic/secrets.h` |
| `hc-sr04-mqtt/` | `IOT_SENSOR/hc-sr04-mqtt/secrets.h` |
| `test_wifi/` | `IOT_SENSOR/test_wifi/secrets.h` |

### Step 2: Edit the file

Open the `secrets.h` file in any text editor. It looks like this:

```c
#ifndef SECRETS_H
#define SECRETS_H

#define WIFI_SSID "your-wifi-ssid"       // ← Change this
#define WIFI_PASS ""                      // ← Change this

#define MQTT_HOST     "capybara.lmq.cloudamqp.com"
#define MQTT_PORT     8883
#define MQTT_USERNAME "your-mqtt-username"
#define MQTT_PASSWORD "your-mqtt-password"
#define MQTT_TOPIC    "flood/water_level"
#define MQTT_CLIENT_ID "esp32-sr04m-001"

#endif
```

### Step 3: What to change

**For WiFi (required):**

- `WIFI_SSID` — Your network name (e.g., `"MyHomeWiFi"`)
- `WIFI_PASS` — Your network password (leave empty `""` for open networks)

**For MQTT (only if using a different broker):**

- `MQTT_HOST` — MQTT broker address
- `MQTT_USERNAME` — MQTT username
- `MQTT_PASSWORD` — MQTT password
- `MQTT_CLIENT_ID` — Unique identifier for this sensor (change if using multiple sensors)
- `MQTT_TOPIC` — MQTT topic to publish to

### Step 4: Re-flash the ESP32

After saving the file, re-upload the sketch to the ESP32 (see [Section 8 Step 3](#step-3-flash-the-firmware)).

### Step 5: Tips

- WiFi passwords are case-sensitive
- The ESP32 only supports **2.4 GHz** WiFi networks (not 5 GHz)
- If connecting to a new network, the ESP32 must be physically connected via USB to your computer
- Use `IOT_SENSOR/test_wifi/test_wifi.ino` to test WiFi connectivity before flashing the full sensor sketch
- If using a different MQTT broker, update the backend's MQTT config in `backend/.env` as well:
  - `MQTT_HOST`, `MQTT_PORT`, `MQTT_USERNAME`, `MQTT_PASSWORD`

---

## 10. Environment Variables Reference

### `backend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (keep secret!) |
| `APP_NAME` | Yes | App name for Nominatim UA header |
| `APP_VERSION` | Yes | App version for Nominatim UA header |
| `APP_CONTACT_EMAIL` | Yes | Contact email for Nominatim UA header |
| `MQTT_HOST` | No | MQTT broker host |
| `MQTT_PORT` | No | MQTT broker port (default: 8883) |
| `MQTT_USERNAME` | No | MQTT username |
| `MQTT_PASSWORD` | No | MQTT password |
| `TEXTBEE_API_KEY` | No | TextBee SMS API key |
| `TEXTBEE_DEVICE_ID` | No | TextBee device ID |
| `GROQ_API_KEY` | No | Groq API key for AI chat |
| `GROQ_API_KEY_CHAT` | No | Secondary Groq API key |
| `TIDECHECK_API_KEY` | No | TideCheck API key |
| `CRON_API_KEY` | No | API key for cron job authentication |
| `GMAIL_EMAIL` | No | Gmail address for email service |
| `GMAIL_APP_PASSWORD` | No | Gmail app password |
| `TWILIO_ACCOUNT_SID` | No | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | No | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | No | Twilio phone number |

### `website/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous (public) key |
| `VITE_BACKEND_URL` | Yes | Backend API base URL |

### `mobile/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous (public) key |
| `EXPO_PUBLIC_BACKEND_URL` | Yes | Backend API base URL |

---

## 11. Running the Project

### Development Mode

**Terminal 1 — Backend:**

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Website:**

```bash
cd website
npm run dev
```

**Terminal 3 — Mobile (optional):**

```bash
cd mobile
npx expo start
```

### Production Mode

**Backend:**

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Website:**

```bash
cd website
npm run build
# Serve the dist/ folder with any static server (nginx, etc.)
```

---

## 12. Deployment

### Backend on Render

The project includes a `Procfile` and `Dockerfile` for Render deployment:

1. Create a new **Web Service** on Render
2. Connect your GitHub repository
3. Set:
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add all environment variables from `backend/.env` in Render's dashboard
5. Deploy

### Backend with Docker

```bash
cd backend
docker build -t isafe-backend .
docker run -p 8000:8000 --env-file .env isafe-backend
```

### Website

The built website (from `npm run build`) can be deployed to any static host:
- Vercel
- Netlify
- GitHub Pages
- Render Static Sites
- Any web server (nginx, Apache)

### Mobile App (Expo)

**Expo Go (testing):**

```bash
cd mobile
npx expo start
# Scan QR code with Expo Go app
```

**Production build:**

```bash
cd mobile
npx eas build --platform android
npx eas build --platform ios
npx eas submit --platform android
```

### Scheduled Tasks

A GitHub Actions workflow fetches tide data daily at 16:00 UTC:

- File: `.github/workflows/fetch-tide-data.yml`
- Calls `POST /api/tide/refresh` on the backend with `CRON_API_KEY`

Make sure `CRON_API_KEY` is set in your deployment's environment.

---

## 13. Troubleshooting

### Backend won't start

| Symptom | Cause | Solution |
|---------|-------|----------|
| `ModuleNotFoundError` | Missing Python packages | Run `pip install -r requirements.txt` |
| `SupabaseError` | Wrong credentials | Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env` |
| `Port 8000 in use` | Another process running | Kill the process or use a different port |

### Website can't reach backend

| Symptom | Cause | Solution |
|---------|-------|----------|
| `Network Error` | Backend not running | Start the backend on port 8000 |
| `CORS error` | Backend origin mismatch | Set `CORS_ORIGINS` in backend or check `VITE_BACKEND_URL` |
| `401 Unauthorized` | Auth session expired | Log out and log back in |

### IoT sensor not connecting

| Symptom | Cause | Solution |
|---------|-------|----------|
| `WiFi connection timeout` | Wrong SSID/password | Check `secrets.h` — SSID is case-sensitive, ESP32 only supports 2.4 GHz |
| `MQTT connection failed` | Wrong broker credentials | Verify MQTT username/password and broker address |
| No sensor readings | Wiring issue | Check TRIG/ECHO pin connections; try the debug sketch |
| `Publish failed` | MQTT disconnected | Check MQTT broker status and network connectivity |

### Mobile app issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| Blank screen | JavaScript error | Run `npx expo start --clear` to clear cache |
| Location permission denied | User denied prompt | Reset permissions in phone settings |
| Map not loading | Internet required | Leaflet tiles need internet connectivity |
| Can't connect to backend | Wrong URL | Ensure `EXPO_PUBLIC_BACKEND_URL` is correct; use `ngrok` for local testing |

### Database issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| `relation "profiles" does not exist` | Migration not run | Run `schemas/profiles.sql` first |
| `permission denied` | RLS policy missing | Run the relevant migration file for that table |
| `new row violates row-level security` | RLS blocking insert | Check the RLS policy for the table |
| Auth sign-up fails | Email confirmation | Check Supabase Auth settings; disable email confirm for testing |
