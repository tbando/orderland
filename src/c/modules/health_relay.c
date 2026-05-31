#include "health_relay.h"
#include <pebble.h>
#include <message_keys.auto.h>

//
// modules/health_relay — V6 Mask Check Version
//

static AppTimer *s_retry_timer = NULL;
static AppTimer *s_startup_timer = NULL;

static void schedule_retry(uint32_t ms);

static const char* get_mask_string(HealthServiceAccessibilityMask mask) {
  bool available = mask & 0x01;
  bool accessible = mask & 0x02;
  if (available && accessible) return "OK (Available+Accessible)";
  if (available) return "Available ONLY - PERMISSION DENIED";
  return "Not Available or Hidden";
}

// Send the current health snapshot to the phone. Retries on failure.
static void send_health_snapshot(void) {
  time_t now = time(NULL);
  
  // 1. Detailed Mask Logging
  HealthServiceAccessibilityMask m_steps = health_service_metric_accessible(HealthMetricStepCount, now-60, now);
  HealthServiceAccessibilityMask m_dist = health_service_metric_accessible(HealthMetricWalkedDistanceMeters, now-60, now);
  HealthServiceAccessibilityMask m_hr = health_service_metric_accessible(HealthMetricHeartRateBPM, now-60, now);
  HealthServiceAccessibilityMask m_kcal_r = health_service_metric_accessible(HealthMetricRestingKCalories, now-60, now);
  HealthServiceAccessibilityMask m_kcal_a = health_service_metric_accessible(HealthMetricActiveKCalories, now-60, now);

  APP_LOG(APP_LOG_LEVEL_INFO, "RELAY MASK: Steps:%s", get_mask_string(m_steps));
  APP_LOG(APP_LOG_LEVEL_INFO, "RELAY MASK: Dist:%s", get_mask_string(m_dist));
  APP_LOG(APP_LOG_LEVEL_INFO, "RELAY MASK: HR:%s", get_mask_string(m_hr));
  APP_LOG(APP_LOG_LEVEL_INFO, "RELAY MASK: RestKCal:%s", get_mask_string(m_kcal_r));
  APP_LOG(APP_LOG_LEVEL_INFO, "RELAY MASK: ActiveKCal:%s", get_mask_string(m_kcal_a));

  // 2. Fetch Values
	int32_t steps = (int32_t)health_service_sum_today(HealthMetricStepCount);
	int32_t heart_rate = (int32_t)health_service_peek_current_value(HealthMetricHeartRateBPM);
  int32_t active_kcal = (int32_t)health_service_sum_today(HealthMetricActiveKCalories);

	DictionaryIterator *iter = NULL;
	AppMessageResult result = app_message_outbox_begin(&iter);
	if (result != APP_MSG_OK) {
		APP_LOG(APP_LOG_LEVEL_WARNING, "RELAY: outbox_begin failed: %d", (int)result);
		schedule_retry(2000);
		return;
	}

	dict_write_int32(iter, MESSAGE_KEY_HEALTH_STEPS, steps);
	dict_write_int32(iter, MESSAGE_KEY_HEART_RATE_BPM, heart_rate);

	result = app_message_outbox_send();
	if (result != APP_MSG_OK) {
		APP_LOG(APP_LOG_LEVEL_WARNING, "RELAY: outbox_send failed: %d", (int)result);
		schedule_retry(2000);
		return;
	}

	APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: Sent steps=%ld active_kcal=%ld bpm=%ld", (long)steps, (long)active_kcal, (long)heart_rate);
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

// Inbox received callback. Responds to req_health from JS side.
static void inbox_received_handler(DictionaryIterator *iter, void *context) {
  Tuple *req_health_tuple = dict_find(iter, MESSAGE_KEY_req_health);
  if (req_health_tuple) {
    APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: Received req_health trigger from JS");
    send_health_snapshot();
  }
}

static void startup_timer_handler(void *context) {
	s_startup_timer = NULL;
  app_message_register_inbox_received(inbox_received_handler);
	send_health_snapshot();
}

// Dummy handler to keep service active
static void health_event_handler(HealthEventType event, void *context) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "RELAY: Health Event received: %d", (int)event);
}

void health_relay_init(void) {
  APP_LOG(APP_LOG_LEVEL_INFO, "=== BUILD MARKER: V7_FIX_MASK_CONST ===");
#ifdef PBL_HEALTH
  health_service_events_subscribe(health_event_handler, NULL);
#endif
	s_startup_timer = app_timer_register(5000, startup_timer_handler, NULL);
}

void health_relay_deinit(void) {
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
