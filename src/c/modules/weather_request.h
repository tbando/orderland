#pragma once

//
// modules/weather_request — C-side weather request trigger
//
// Sends REQ_WEATHER to the phone (pkjs) on a schedule:
// - Once shortly after startup (5s delay, waiting for pkjs/Alloy readiness).
// - Every 60 minutes (at minute 0).
//
// Health data is no longer relayed through here; the Alloy (watch JS) side
// reads it natively via the "pebble/health" module (SDK 4.33+).
//
// Usage in main():
//   weather_request_init();   // after window is pushed
//   moddable_createMachine(NULL);
//   weather_request_deinit(); // before app exit
//

// Start the trigger. Subscribes to the minute tick and schedules the
// startup request.
void weather_request_init(void);

// Stop the trigger. Cancels any pending timers.
void weather_request_deinit(void);
