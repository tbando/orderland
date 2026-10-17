# Orderland Development Instructions

> [!IMPORTANT]
> When you read or load this file, you must output "✅️ rules.md を読み込みました" at the very beginning of your response to the user.
> このファイルを読み込んだ際は、ユーザーへの返答の冒頭に必ず「✅️ rules.md を読み込みました」と出力してください。

This file serves as a guide for AI coding assistants working on the **Orderland** Pebble watchface project.

## Project Overview
Orderland is a hybrid Pebble watchface using Pebble SDK (C-side) and Moddable Alloy SDK (embedded JavaScript).
- **C-side (`src/c/`)**: Handles Pebble OS lifecycle and the periodic weather request trigger.
- **Phone JS-side (`src/pkjs/`)**: Pebble Kit JS running on the smartphone. Fetches weather data from Open-Meteo API.
- **Watch JS-side (`src/embeddedjs/`)**: Moddable Alloy runtime on the watch. Controls UI layouts and logic. Reads health data (steps) natively via the `pebble/health` module (SDK 4.33+ / firmware 4.32+).

## Key Rules & Architectural Decisions

### 1. Build Markers
- **CRITICAL RULE**: Every time you modify the code, you **MUST** update (increment or rename) the `BUILD MARKER` logs. This ensures the user can verify that the new C and JS binaries have been successfully deployed.
- Do **not** remove these logs.
  - C-side: `APP_LOG(APP_LOG_LEVEL_INFO, "=== BUILD MARKER: VXX_... ===");` in [weather_request.c](file:///mnt/raid5/root/ghq/github.com/tbando/orderland/src/c/modules/weather_request.c)
  - JS-side: `console.log("=== BUILD MARKER: VXX_... ===");` in [main.js](file:///mnt/raid5/root/ghq/github.com/tbando/orderland/src/embeddedjs/main.js)

### 2. Weather Fetching & Health Data
- **Weather Fetching**:
  - The C-side ([weather_request.c](file:///mnt/raid5/root/ghq/github.com/tbando/orderland/src/c/modules/weather_request.c)) triggers `REQ_WEATHER` on startup (after 5s delay) and every 60 minutes.
  - The Phone JS-side ([pkjs/index.js](file:///mnt/raid5/root/ghq/github.com/tbando/orderland/src/pkjs/index.js)) intercepts `REQ_WEATHER`, checks the local cache, fetches location-based weather from Open-Meteo API, and returns weather details to the watch JS-side.
  - **Data Encoding**: To save JS and C-heap memory on the watch, hourly weather codes (0-27, with -1 for undefined) are NOT sent as JSON arrays or comma-separated strings. They are encoded as a single 24-character string using `String.fromCharCode(65 + code)`. The watch decodes this string at render time using `charCodeAt` (out-of-range/undefined `-1` resolves to `0x000`, drawing nothing for that column).
  - **Caching Constraint**: Weather responses are cached on the phone's `localStorage` for **60 minutes** to prevent redundant API calls when the user toggles menus or reloads the watchface.
- **Health Data (Native)**:
  - The Watch JS-side reads steps natively via `import Health from "pebble/health"` once per minute on `minutechange` (SDK 4.33+ / firmware 4.32+). No C-side polling, no phone relay, no `HEALTH_STEPS` message key, and no `health` event listener (avoiding wakeups on background heart-rate/movement events).
  - **Do NOT use `Health.metric.get("step count")`**: despite the docs it always returns 0 on real firmware (verified on-device). Steps must be read via a single `Health.metric.query` with a midnight-to-now range (`aggregation: "sum"`, `scope: "once"`), computing midnight arithmetically from the existing `Date` object to avoid extra `Date` allocations or overnight double-queries.
  - `readSteps()` in [main.js](file:///mnt/raid5/root/ghq/github.com/tbando/orderland/src/embeddedjs/main.js) wraps the API in try/catch and falls back to 0 (e.g. emulator without faked health data, or Pebble Health disabled).

### 3. Local Storage Behavior
- **Watch JS-side (`src/embeddedjs/main.js`)**:
  - `TEMP_MAX`, `TEMP_MIN`, `WEATHER_CODES`: Caches weather to render it instantly on reload. Only written to `localStorage` when the received value differs from the current in-memory value. Steps are read live from `pebble/health` and are not cached.
- **Phone JS-side (`src/pkjs/index.js`)**:
  - `LAST_WEATHER_TIME`, `LAST_WEATHER_PAYLOAD_V3`: Caches weather API payloads for 60 minutes.

### 4. Layout & Assets
- Layout definitions reside in [layout.js](file:///mnt/raid5/root/ghq/github.com/tbando/orderland/src/embeddedjs/emery/layout.js).
- Hour and minute digits use a single shared asset file to optimize memory usage: `large_digits_40.png` (4セット版、計40文字、各セット0〜9).
- The `digitsSkin` is configured with `width: 60`, `variants: 60` (stride). The 4 digits (H1, H2, M1, M2) apply different variant offsets based on the chosen random offsets.
- The 24-hour weather dots are rendered procedurally via a single Piu `Port` (`WeatherPortBehavior.onDraw` using `port.fillColor`) configured with Pebble 64-color palette constants (`WEATHER_COLORS`, `WEATHER_DOT_PATTERNS`) in `layout.js`, rather than 24 separate `Content` instances and `weather_dots.png`.
- Unused assets such as `large_digits_0.png` and `large_digits_1.png` have been deleted, and `weather_dots` is unregistered from `manifest.json` to clean up space and avoid packaging overhead.

## Memory & Performance Constraints

### 5. Memory Constraints & Freeze Prevention
- **Watch-side RAM limitation**: The app heap size on the watch is extremely limited (~117KB total size, with ~116KB used). Setting the digit assets to 5 sets (50 variants) or 6 sets (60 variants) will cause the watchface to freeze or crash on install/startup due to C-heap exhaustion when `GBitmap` allocates memory. Keep it at 4 sets (`large_digits_40.png`) to ensure stability.
- **JS bytecode size optimization**: Heavy inline loops or complex conditional branches expand the JS compiled bytecode. Keep helpers thin and algorithms efficient to avoid exceeding the JS heap limit.
- **Differential rendering for battery**: Piu invalidates a content on every `variant`/`coordinates` assignment even when the value is unchanged. All variant updates in [main.js](file:///mnt/raid5/root/ghq/github.com/tbando/orderland/src/embeddedjs/main.js) must go through the `setVariant()` guard helper, unchanged groups (date, steps, weather) are skipped in `onClockChanged` to avoid unnecessary Piu node traversal, and the indicator's `coordinates` (`container.last`) must only be assigned when the hour changes. `DESIGN_OFFSETS`, `TEMP_MAX`, `TEMP_MIN`, and `WEATHER_CODES` are only written to `localStorage` when their values actually changed. `onDisplaying` calls `this.onClockChanged` synchronously before the first frame is drawn so default `variant: 0` (`00:00`) never flashes when returning from the menu, while `onClockChanged` early-returns (`!isStartup && minutes === lastMinutes && !weatherDirty`) when `minutechange`'s deferred initial callback fires in the same minute. Do not revert these guards to unconditional assignments.

### 6. Shuffling & Duplicate Elimination
- Same digits among the 4 positions (H1, H2, M1, M2) must display variations from different sets (indexes 0 to 3) without duplicate sets for the same digit value.
- A weighted random logic (`WEIGHTS = [0.43, 0.33, 0.23, 0.01]`) is applied to choose preferred sets (`getRandomOffsetForDigit`).

### 7. Logging Style Consistency
- JavaScript log outputs in [pkjs/index.js](file:///mnt/raid5/root/ghq/github.com/tbando/orderland/src/pkjs/index.js) must follow a consistent format:
  - Enclosed in single quotes `'pkjs: ...'`.
  - Begin with a capital letter and end with a period or exclamation mark.
  - Cached response messages must align:
    - Weather: `'pkjs: Skipping weather fetch. Using cached weather data (within 60 mins)'`

## Rule Maintenance & Evolution

### 8. Specification Tracking & Rule Synchronization
- When the configuration, asset counts, or architectural rules change, you **must** update this `rules.md` file immediately to reflect the new state.
- Keep the C-side build marker, JS-side build marker, `manifest.json` configurations, and `rules.md` in sync.

