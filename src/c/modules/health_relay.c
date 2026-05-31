#include "health_relay.h"
#include <pebble.h>
#include <message_keys.auto.h>

//
// modules/health_relay — V14 Stable Final
//

static AppTimer *s_retry_timer = NULL;
static AppTimer *s_startup_timer = NULL;

static void schedule_retry(uint32_t ms);

// Send the current health snapshot to the phone. Retries on failure.
static void send_health_snapshot(void) {
	int32_t steps = (int32_t)health_service_sum_today(HealthMetricStepCount);
	int32_t heart_rate = (int32_t)health_service_peek_current_value(HealthMetricHeartRateBPM);

	DictionaryIterator *iter = NULL;
	AppMessageResult result = app_message_outbox_begin(&iter);
	if (result != APP_MSG_OK) {
		schedule_retry(2000);
		return;
	}

	dict_write_int32(iter, MESSAGE_KEY_HEALTH_STEPS, steps);
	dict_write_int32(iter, MESSAGE_KEY_HEART_RATE_BPM, heart_rate);
	app_message_outbox_send();

	APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: Sent Steps:%ld HR:%ld", (long)steps, (long)heart_rate);
}

static void retry_timer_handler(void *context) {
	(void)context;
	s_retry_timer = NULL;
	send_health_snapshot();
}

static void schedule_retry(uint32_t ms) {
	if (s_retry_timer) return;
	s_retry_timer = app_timer_register(ms, retry_timer_handler, NULL);
}

static void inbox_received_handler(DictionaryIterator *iter, void *context) {
  // Respecting any incoming req_health if JS ever starts working
  if (dict_find(iter, MESSAGE_KEY_req_health)) {
    send_health_snapshot();
  }
}

// Robust C-side polling every 5 minutes. 
// This is our primary trigger since JS write() has issues.
static void tick_handler(struct tm *tick_time, TimeUnits units_changed) {
  if (units_changed & MINUTE_UNIT) {
    if (tick_time->tm_min % 5 == 0) {
      APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: 5-min update trigger");
      send_health_snapshot();
    }
  }
}

static void startup_timer_handler(void *context) {
	s_startup_timer = NULL;
  app_message_register_inbox_received(inbox_received_handler);
	send_health_snapshot();
}

static void health_event_handler(HealthEventType event, void *context) {
  if (event == HealthEventSignificantUpdate) {
    send_health_snapshot();
  }
}

void health_relay_init(void) {
  APP_LOG(APP_LOG_LEVEL_INFO, "=== BUILD MARKER: V14_STABLE_NO_JS_WRITE ===");
#ifdef PBL_HEALTH
  health_service_events_subscribe(health_event_handler, NULL);
#endif
  tick_timer_service_subscribe(MINUTE_UNIT, tick_handler);
	s_startup_timer = app_timer_register(5000, startup_timer_handler, NULL);
}

void health_relay_deinit(void) {
  tick_timer_service_unsubscribe();
#ifdef PBL_HEALTH
  health_service_events_unsubscribe();
#endif
	if (s_startup_timer) {
		app_timer_cancel(s_startup_timer);
		s_startup_timer = NULL;
	}
	if (s_retry_timer) {
		app_timer_cancel(s_retry_timer);
		s_retry_timer = NULL;
	}
}
