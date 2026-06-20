# Orderland Development Instructions

> [!IMPORTANT]
> When you read or load this file, you must output "✅️ rules.md を読み込みました" at the very beginning of your response to the user.
> このファイルを読み込んだ際は、ユーザーへの返答の冒頭に必ず「✅️ rules.md を読み込みました」と出力してください。

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
  - **Caching Constraint**: Weather responses are cached on the phone's `localStorage` for **60 minutes** to prevent redundant API calls when the user toggles menus or reloads the watchface.
- **Health Data Relaying**:
  - C-side polls steps from `HealthService` every 10 minutes and on significant updates, sending them via `HEALTH_STEPS`.
  - Phone JS-side relays `HEALTH_STEPS` back to the watch's JS-side.
  - **Caching Constraint**: Health data relaying is throttled on the phone's `localStorage` for **10 minutes** to prevent excessive communication overhead, especially during watchface restarts.

### 3. Local Storage Behavior
- **Watch JS-side (`src/embeddedjs/main.js`)**:
  - `TEMP_MAX`, `TEMP_MIN`, `WEATHER_CODES`, `HEALTH_STEPS`: Caches weather and steps to render them instantly on reload.
- **Phone JS-side (`src/pkjs/index.js`)**:
  - `LAST_WEATHER_TIME`, `LAST_WEATHER_PAYLOAD`: Caches weather API payloads for 60 minutes.
  - `LAST_HEALTH_TIME`: Caches the last timestamp when health steps were relayed to the watch (10-minute TTL).

### 4. Layout & Assets
- Layout definitions reside in [layout.js](file:///mnt/raid5/root/ghq/github.com/tbando/orderland/src/embeddedjs/emery/layout.js).
- Hour and minute digits use a single shared asset file to optimize memory usage: `large_digits_40.png` (4セット版、計40文字、各セット0〜9).
- The `digitsSkin` is configured with `variants: 40`. The 4 digits (H1, H2, M1, M2) apply different skins based on the chosen random offsets.
- Unused assets such as `large_digits_0.png` and `large_digits_1.png` have been deleted to clean up space and avoid packaging overhead.

## Memory & Performance Constraints

### 5. Memory Constraints & Freeze Prevention
- **Watch-side RAM limitation**: The app heap size on the watch is extremely limited (~117KB total size, with ~116KB used). Setting the digit assets to 5 sets (50 variants) or 6 sets (60 variants) will cause the watchface to freeze or crash on install/startup due to C-heap exhaustion when `GBitmap` allocates memory. Keep it at 4 sets (`large_digits_40.png`) to ensure stability.
- **JS bytecode size optimization**: Heavy inline loops or complex conditional branches expand the JS compiled bytecode. Keep helpers thin and algorithms efficient (e.g., bitmask checking and simplified index calculations) to avoid exceeding the JS heap limit.

### 6. Shuffling & Duplicate Elimination
- The 4 digits (H1, H2, M1, M2) must display variations from different sets (indexes 0 to 3) without duplicate sets.
- A weighted random logic (`WEIGHTS = [0.4, 0.3, 0.2, 0.1]`) is applied to choose preferred sets while ensuring uniqueness.
- Memory-efficient, allocation-free bitwise operations (`getRandomOffsetExcept2`) are used to select non-overlapping offsets.

### 7. Logging Style Consistency
- JavaScript log outputs in [pkjs/index.js](file:///mnt/raid5/root/ghq/github.com/tbando/orderland/src/pkjs/index.js) must follow a consistent format:
  - Enclosed in single quotes `'pkjs: ...'`.
  - Begin with a capital letter and end with a period or exclamation mark.
  - Cached response messages must align:
    - Weather: `'pkjs: Skipping weather fetch. Using cached weather data (within 60 mins)'`
    - Health: `'pkjs: Skipping health relay. Using cached health data (within 10 mins). Steps: ' + steps`

## Rule Maintenance & Evolution

### 8. Specification Tracking & Rule Synchronization
- When the configuration, asset counts, or architectural rules change, you **must** update this `rules.md` file immediately to reflect the new state.
- Keep the C-side build marker, JS-side build marker, `manifest.json` configurations, and `rules.md` in sync.

