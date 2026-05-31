#include "health_relay.h"
#include <pebble.h>
#include <message_keys.auto.h>

//
// modules/health_relay — C-side health sampling and AppMessage relay
//
// Pebble Health APIs are available to C, not directly to Alloy JS.
// This module samples health data and sends AppMessage payloads that PKJS
// relays back to watch JS.
//
// Data flow:
// 1) Read health metrics from HealthService.
// 2) Write HEALTH_STEPS + HEART_RATE_BPM into AppMessage dictionary.
// 3) Send payload to phone.
// 4) PKJS forwards payload back to watch JS.
//
// Stability notes:
// - Sends an initial snapshot a few seconds after init so data appears promptly,
//   after the JS channel (owned by Alloy) has had time to open.
// - Retries failures with a single timer to avoid outbox pressure loops.
// - Uses health_service_events_subscribe to receive updates at the system's
//   natural cadence (default ~10 min, auto-adjusted for activity level).
//   Only HealthEventHeartRateUpdate and HealthEventMovementUpdate trigger a send.

static AppTimer *s_retry_timer = NULL;
static AppTimer *s_startup_timer = NULL;
static AppTimer *s_poll_timer = NULL;

#define POLL_INTERVAL_MS (5 * 60 * 1000)

static void schedule_retry(uint32_t ms);

// Send the current health snapshot to the phone. Retries on failure.
static void send_health_snapshot(void) {
	// On emulators these often return 0. Device testing is required for
	// meaningful values.
	int32_t steps = (int32_t)health_service_sum_today(HealthMetricStepCount);
	int32_t heart_rate = (int32_t)health_service_peek_current_value(HealthMetricHeartRateBPM);

	DictionaryIterator *iter = NULL;
	AppMessageResult result = app_message_outbox_begin(&iter);
	if (result != APP_MSG_OK) {
		// Typical at startup if the channel is not ready yet.
		APP_LOG(APP_LOG_LEVEL_WARNING, "RELAY: outbox_begin failed: %d (retry)", (int)result);
		schedule_retry(2000);
		return;
	}

	dict_write_int32(iter, MESSAGE_KEY_HEALTH_STEPS, steps);
	dict_write_int32(iter, MESSAGE_KEY_HEART_RATE_BPM, heart_rate);

	result = app_message_outbox_send();
	if (result != APP_MSG_OK) {
		// Keep retry serialized via one timer so we never create a retry storm.
		APP_LOG(APP_LOG_LEVEL_WARNING, "RELAY: outbox_send failed: %d (retry)", (int)result);
		schedule_retry(2000);
		return;
	}

	APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: sent steps=%ld bpm=%ld", (long)steps, (long)heart_rate);
}

static void poll_timer_handler(void *context) {
	(void)context;
	send_health_snapshot();
	s_poll_timer = app_timer_register(POLL_INTERVAL_MS, poll_timer_handler, NULL);
}

static void retry_timer_handler(void *context) {
	(void)context;
	s_retry_timer = NULL;
	send_health_snapshot();
}

static void schedule_retry(uint32_t ms) {
	// At most one pending retry at a time.
	if (s_retry_timer)
		return;
	s_retry_timer = app_timer_register(ms, retry_timer_handler, NULL);
}

static void startup_timer_handler(void *context) {
	(void)context;
	s_startup_timer = NULL;
	send_health_snapshot();
	// After initial snapshot, start the 5-min polling cycle.
	s_poll_timer = app_timer_register(POLL_INTERVAL_MS, poll_timer_handler, NULL);
}

static void health_event_handler(HealthEventType type, void *context) {
	(void)context;
	// Only relay on events that carry data we display.
	if (type == HealthEventHeartRateUpdate || type == HealthEventMovementUpdate) {
		send_health_snapshot();
	}
}

// Subscribe to health events and schedule an early initial snapshot.
void health_relay_init(void) {
	health_service_events_subscribe(health_event_handler, NULL);
	// Delay the first send slightly so the Alloy-owned AppMessage channel is ready.
	s_startup_timer = app_timer_register(1000, startup_timer_handler, NULL);
}

// Unsubscribe from health events and cancel any pending timers.
void health_relay_deinit(void) {
	health_service_events_unsubscribe();
	if (s_startup_timer) {
		app_timer_cancel(s_startup_timer);
		s_startup_timer = NULL;
	}
	if (s_retry_timer) {
		app_timer_cancel(s_retry_timer);
		s_retry_timer = NULL;
	}
	if (s_poll_timer) {
		app_timer_cancel(s_poll_timer);
		s_poll_timer = NULL;
	}
}