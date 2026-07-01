# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (FastAPI + Python)
- **Setup**:
  ```powershell
  python -m venv backend\.venv
  backend\.venv\Scripts\Activate.ps1
  pip install -r backend\requirements.txt
  cd backend
  npm install   # if any JS tooling needed
  cd ..
  ```
- **Run development server**:
  ```powershell
  cd backend
  uvicorn app.main:app --reload   # (uvicorn installed via requirements)
  cd ..
  ```
- **Run tests**:
  ```powershell
  pytest backend\tests
  ```
  or simply `pytest` from the repo root if pytest is installed in the virtual environment.
- **Linting**: (if configured) e.g., `flake8` or `ruff` – check configuration files.
- **Environment**: Create `backend\.env` with Supabase credentials as per README.

### Mobile (Expo/React Native)
- **Setup**:
  ```powershell
  cd mobile
  npm install
  cd ..
  ```
- **Run development**:
  ```powershell
  cd mobile
  npm run start   # or `expo start`
  cd ..
  ```
  Then press `a` for Android emulator, `i` for iOS simulator, or `w` for web.
- **Build**: Use `expo build:android` or `expo build:ios` (requires Expo account).
- **Environment**: Create `mobile\.env` with Expo public Supabase variables.

### Website (Vite + React)
- **Setup**:
  ```powershell
  cd website
  npm install
  cd ..
  ```
- **Run development**:
  ```powershell
  cd website
  npm run dev
  cd ..
  ```
- **Build for production**:
  ```powershell
  cd website
  npm run build
  cd ..
  ```
- **Preview**: `npm run preview` inside website folder.
- **Environment**: Create `website\.env` with Vite Supabase variables.

### General
- **Install all dependencies**: Run the setup scripts in README.md for each part.
- **Linting/Formatting**: Check for config files like `.eslintrc`, `prettier.config.js`, `ruff.toml`, etc., and run corresponding linters.
- **Database**: Apply SQL schemas in the `schemas/` folder via Supabase SQL editor.

## Architecture Overview

The ISAFE (CityShield) system is a disaster‑management platform composed of three client applications (mobile, web, and optionally admin dashboard) backed by a shared Python/FastAPI backend and a Supabase PostgreSQL data layer.

### 1. Backend (backend/)
- **Framework**: FastAPI (Python 3.11+)
- **API Structure**: REST‑ish endpoints under `/api/`; routers live in `backend/app/api/` (e.g., `weather.py`, `flood_hazard.py`, `routing.py`, `evacuation.py`, `notification_api.py`, `announcements.py`, `tcws.py`).
- **Database**: SQLAlchemy ORM with Supabase (PostgreSQL) as the data store. Connection details loaded from `.env`.
- **Realtime**: MQTT client (`backend/app/mqtt/client.py`) for pushing alerts to subscribed clients.
- **Machine Learning**: Models and scripts in the `machine_analysis/` directory (or `machine_learning/`), invoked by services for flood prediction, evacuation routing, etc.
- **Entrypoint**: `backend/app/main.py` creates the FastAPI app, configures CORS, launches MQTT background thread, and includes routers.
- **Testing**: pytest suite under `backend/tests/` (example: `test_evacuation_service.py`).

### 2. Mobile Application (mobile/)
- **Platform**: Expo managed React Native (supports Android, iOS, web).
- **Navigation**: React Navigation (stack, drawer, bottom tabs).
- **State Management**: Redux Toolkit (`@reduxjs/toolkit`).
- **Backend Communication**: Supabase JS client (`@supabase/supabase-js`) for auth and data; Axios for REST calls.
- **Push Notifications**: `expo-notifications` + `@react-native-firebase/messaging`.
- **Maps & Location**: `expo-location`, `react-native-maps` or similar.
- **UI**: React Native Paper (`react-native-paper`) for Material Design components.
- **Entrypoint**: `index.js` registers the root component from `src/`.
- **Config**: `app.json`, `babel.config.js` (if present), Expo plugins.

### 3. Website (website/)
- **Stack**: Vite + React + TailwindCSS.
- **Routing**: React Router DOM (`react-router-dom`).
- **Mapping**: React Leaflet (`react-leaflet`).
- **Data Visualization**: Plotly.js (`react-plotly.js`).
- **Styling**: Tailwind CSS (configured via `tailwind.config.js` and `postcss.config.js`).
- **Supabase**: `@supabase/supabase-js` for data/auth.
- **Entrypoint**: Typically `src/main.jsx` or `src/index.js`.
- **Build**: `npm run build` outputs to `dist/`.

### 4. Data & Schemas (schemas/)
- Contains `.sql` files defining tables, rows‑level security (RLS) policies, triggers, and helper functions for the Supabase PostgreSQL database.
- Core tables: `profiles`, `families`, `evac` (evacuation centers), `contacts`, `announcements`, `tcws` (tropical cyclone warning signals), etc.
- See `schemas/README.md` for how to apply schemas and promote an admin user via SQL.

### 5. Machine Learning (machine_learning/)
- Scripts for flood hazard analysis (`flood_hazard_analysis.py`), evacuation route optimization, feature extraction, and model inference (`predict_flood.py`).
- Uses Python libraries: pandas, numpy, scikit-learn, xgboost, GeoPandas, rasterio, folium, etc.
- Some Google Earth Engine (JavaScript) assets (`gee_*.js`) for satellite imagery preprocessing.
- Models are typically serialized and loaded by backend services to generate predictions stored in the database.

### 6. Documentation
- `README.md`: Quick start, prerequisites, environment setup.
- `DOCUMENTATION.md`: Deeper details on architecture, API contracts, deployment.
- `mobile/SETUP.md`, `mobile/ALIGNMENT_REPORT.md`, etc.: Platform‑specific notes.

## Data Flow Overview
1. **Authentication** – Users sign up/in via Supabase Auth (email/password or social). JWTs are returned.
2. **API Access to backend endpoints** – Frontends include the JWT in the `Authorization` header; the backend verifies it via Supabase (or directly using the JWT secret).
3. **Data Retrieval/Mutation** – REST endpoints (or Supabase Realtime) serve data from PostgreSQL.
4. **Realtime Alerts** – Critical events (e.g., flood warnings, evacuation orders) are published to an MQTT broker; clients subscribe to relevant topics and receive push notifications.
5. **Machine Learning** – Periodic batch jobs (or on‑demand triggers) run scripts in `machine_learning/` to generate risk maps, evacuation routes, etc.; results are stored in the database and served via API.
6. **Admin Functions** – Users with `role = 'admin'` in the `profiles` table can access privileged endpoints (e.g., creating announcements, managing evacuation centers).

## Development Tips
- Keep the virtual environment activated when working on the backend (`backend\.venv\Scripts\Activate.ps1`).
- Run `pip install -r requirements.txt` after pulling new dependencies.
- For frontend work, keep the respective dev servers running; they hot‑reload on file changes.
- When modifying database schemas, apply the corresponding SQL file in Supabase and update any related SQLAlchemy models (`backend/app/models/`).
- Write unit tests for new business logic and place them under `backend/tests/` following pytest conventions.
- To add a new API endpoint, create a router file under `backend/app/api/` and import it in `backend/app/main.py`.
- For mobile/UI changes, follow the existing component structure (`mobile/src/components` and `website/src/components`).

This CLAUDE.md should equip future instances of Claude Code with a clear understanding of how to build, test, and navigate the ISAFE codebase.