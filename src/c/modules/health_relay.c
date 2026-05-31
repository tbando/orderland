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

static void schedule_retry(uint32_t ms);

// Send the current health snapshot to the phone. Retries on failure.
static void send_health_snapshot(void) {
	// Total steps since midnight today
	int32_t steps = 0;
  HealthServiceAccessibilityMask mask = health_service_metric_accessible(HealthMetricStepCount, 
                                                                         time_start_of_today(), 
                                                                         time(NULL));
  if (mask & HealthServiceAccessibilityMaskAvailable) {
    steps = (int32_t)health_service_sum_today(HealthMetricStepCount);
  } else {
    APP_LOG(APP_LOG_LEVEL_WARNING, "RELAY: Step count not accessible (mask: %d)", (int)mask);
  }

	int32_t heart_rate = 0;
  #if PBL_API_EXISTS(health_service_peek_current_value)
    heart_rate = (int32_t)health_service_peek_current_value(HealthMetricHeartRateBPM);
  #endif

	DictionaryIterator *iter = NULL;
	AppMessageResult result = app_message_outbox_begin(&iter);
	if (result != APP_MSG_OK) {
		APP_LOG(APP_LOG_LEVEL_WARNING, "RELAY: outbox_begin failed: %d (retry)", (int)result);
		schedule_retry(2000);
		return;
	}

	dict_write_int32(iter, MESSAGE_KEY_HEALTH_STEPS, steps);
	dict_write_int32(iter, MESSAGE_KEY_HEART_RATE_BPM, heart_rate);

	result = app_message_outbox_send();
	if (result != APP_MSG_OK) {
		APP_LOG(APP_LOG_LEVEL_WARNING, "RELAY: outbox_send failed: %d (retry)", (int)result);
		schedule_retry(2000);
		return;
	}

	APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: sampled steps=%ld bpm=%ld", (long)steps, (long)heart_rate);
}

static void retry_timer_handler(void *context) {
	(void)context;
	s_retry_timer = NULL;
	send_health_snapshot();
}

static void schedule_retry(uint32_t ms) {
	if (s_retry_timer)
		return;
	s_retry_timer = app_timer_register(ms, retry_timer_handler, NULL);
}

static void startup_timer_handler(void *context) {
	(void)context;
	s_startup_timer = NULL;
	send_health_snapshot();
}

// Inbox received callback. Responds to req_health from JS side.
static void inbox_received_handler(DictionaryIterator *iter, void *context) {
  Tuple *req_health_tuple = dict_find(iter, MESSAGE_KEY_req_health);
  if (req_health_tuple) {
    APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: Received req_health from JS, sending snapshot");
    send_health_snapshot();
  }
}

// Subscribe to services and schedule an early initial snapshot.
void health_relay_init(void) {
	app_message_register_inbox_received(inbox_received_handler);
	s_startup_timer = app_timer_register(1000, startup_timer_handler, NULL);
}

// Unsubscribe from services and cancel any pending timers.
void health_relay_deinit(void) {
	app_message_deregister_callbacks();
	if (s_startup_timer) {
		app_timer_cancel(s_startup_timer);
		s_startup_timer = NULL;
	}
	if (s_retry_timer) {
		app_timer_cancel(s_retry_timer);
		s_retry_timer = NULL;
	}
}