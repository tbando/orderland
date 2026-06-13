# Orderland Development Instructions

This file serves as a guide for AI coding assistants working on the **Orderland** Pebble watchface project.

## Project Overview
Orderland is a hybrid Pebble watchface using Pebble SDK (C-side) and Moddable Alloy SDK (embedded JavaScript).
- **C-side (`src/c/`)**: Handles Pebble OS lifecycle, timers, and health sensor polling.
- **Phone JS-side (`src/pkjs/`)**: Pebble Kit JS running on the smartphone. Fetches weather data from Open-Meteo API and relays health data.
- **Watch JS-side (`src/embeddedjs/`)**: Moddable Alloy runtime on the watch. Controls UI layouts and logic.

## Key Rules & Architectural Decisions

### 1. Build Markers
- Do **not** remove or modify the `BUILD MARKER` logs. They are used to verify successful deployment of C and JS binaries.
  - C-side: `APP_LOG(APP_LOG_LEVEL_INFO, "=== BUILD MARKER: ... ===");` in [health_relay.c](file:///mnt/raid5/root/ghq/github.com/tbando/orderland/src/c/modules/health_relay.c)
  - JS-side: `console.log("=== BUILD MARKER: ... ===");` in [main.js](file:///mnt/raid5/root/ghq/github.com/tbando/orderland/src/embeddedjs/main.js)

### 2. Weather & Health Relaying
- **Weather Fetching**:
  - The C-side triggers `REQ_WEATHER` on startup (after 5s delay) and every 60 minutes.
  - The Phone JS-side ([pkjs/index.js](file:///mnt/raid5/root/ghq/github.com/tbando/orderland/src/pkjs/index.js)) intercepts `REQ_WEATHER`, checks the local cache, fetches location-based weather from Open-Meteo API, and returns weather details to the watch JS-side.
  - **Caching Constraint**: Weather responses are cached on the phone's `localStorage` for **30 minutes** to prevent redundant API calls when the user toggles menus or reloads the watchface.
- **Health Data Relaying**:
  - C-side polls steps from `HealthService` every 10 minutes and on significant updates, sending them via `HEALTH_STEPS`.
  - Phone JS-side relays `HEALTH_STEPS` back to the watch's JS-side.

### 3. Local Storage Behavior
- **Watch JS-side (`src/embeddedjs/main.js`)**:
  - `TEMP_MAX`, `TEMP_MIN`, `WEATHER_CODES`, `HEALTH_STEPS`: Caches weather and steps to render them instantly on reload.
  - `DIGIT_SETS_DATE`, `DIGIT_SETS_ARR`: Caches the randomized hour/minute digit font layouts so they only randomize once per day, persisting across watch restarts.
- **Phone JS-side (`src/pkjs/index.js`)**:
  - `LAST_WEATHER_TIME`, `LAST_WEATHER_PAYLOAD`: Caches weather API payloads for 30 minutes.

### 4. Layout & Assets
- Layout definitions reside in [layout.js](file:///mnt/raid5/root/ghq/github.com/tbando/orderland/src/embeddedjs/emery/layout.js).
- `digitsSkin` (representing hour/minute digits) uses [large_digits.png](file:///mnt/raid5/root/ghq/github.com/tbando/orderland/src/embeddedjs/assets/large_digits.png). The number of variants configuration must align with the layout design (currently set to `variants: 40`).
