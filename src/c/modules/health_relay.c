#include "health_relay.h"
#include <pebble.h>
#include <message_keys.auto.h>

//
// modules/health_relay — V4 Deep Debug Version
//

static AppTimer *s_retry_timer = NULL;
static AppTimer *s_startup_timer = NULL;

static void schedule_retry(uint32_t ms);

// Send the current health snapshot to the phone. Retries on failure.
static void send_health_snapshot(void) {
  time_t now = time(NULL);
  struct tm *t = localtime(&now);
  APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: System Time: %02d:%02d:%02d (now=%ld)", 
          t->tm_hour, t->tm_min, t->tm_sec, (long)now);

  // 1. Check Accessibility for Steps
  HealthServiceAccessibilityMask steps_mask = health_service_metric_accessible(HealthMetricStepCount, 
                                                                               now - SECONDS_PER_DAY, 
                                                                               now);
  APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: Steps Accessibility Mask: %d", (int)steps_mask);
  if (!(steps_mask & HealthServiceAccessibilityMaskAvailable)) {
    APP_LOG(APP_LOG_LEVEL_ERROR, "RELAY: STEPS NOT AVAILABLE IN FIRMWARE/SETTINGS");
  }

  // 2. Sample multiple metrics
	int32_t steps_today = (int32_t)health_service_sum_today(HealthMetricStepCount);
  int32_t steps_24h = (int32_t)health_service_sum(HealthMetricStepCount, now - SECONDS_PER_DAY, now);
  int32_t steps_7d = (int32_t)health_service_sum(HealthMetricStepCount, now - (7 * SECONDS_PER_DAY), now);
  int32_t dist_today = (int32_t)health_service_sum_today(HealthMetricWalkedDistanceMeters);
  int32_t kcal_today = (int32_t)health_service_sum_today(HealthMetricRestingKiloCalories);
  
  APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: DATA -> steps[today:%ld, 24h:%ld, 7d:%ld] dist:%ld kcal:%ld", 
          (long)steps_today, (long)steps_24h, (long)steps_7d, (long)dist_today, (long)kcal_today);

  // 3. Heart Rate check
	int32_t heart_rate = 0;
#ifdef PBL_HEALTH
  HealthServiceAccessibilityMask hr_mask = health_service_metric_accessible(HealthMetricHeartRateBPM, now - 60, now);
  APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: HR Accessibility Mask: %d", (int)hr_mask);
  heart_rate = (int32_t)health_service_peek_current_value(HealthMetricHeartRateBPM);
#endif

  // Pick the best non-zero step count for display
  int32_t steps_to_send = steps_today;
  if (steps_to_send <= 0) steps_to_send = steps_24h;
  if (steps_to_send <= 0) steps_to_send = steps_7d;

	DictionaryIterator *iter = NULL;
	AppMessageResult result = app_message_outbox_begin(&iter);
	if (result != APP_MSG_OK) {
		APP_LOG(APP_LOG_LEVEL_WARNING, "RELAY: outbox_begin failed: %d", (int)result);
		schedule_retry(2000);
		return;
	}

	dict_write_int32(iter, MESSAGE_KEY_HEALTH_STEPS, steps_to_send);
	dict_write_int32(iter, MESSAGE_KEY_HEART_RATE_BPM, heart_rate);

	result = app_message_outbox_send();
	if (result != APP_MSG_OK) {
		APP_LOG(APP_LOG_LEVEL_WARNING, "RELAY: outbox_send failed: %d", (int)result);
		schedule_retry(2000);
		return;
	}

	APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: Final sent steps=%ld bpm=%ld", (long)steps_to_send, (long)heart_rate);
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
  APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: Inbox handler registered (delayed 10s)");
	send_health_snapshot();
}

// Dummy handler to keep service active
static void health_event_handler(HealthEventType event, void *context) {
  // We can log event type here to see if we get movement/heart rate updates
  APP_LOG(APP_LOG_LEVEL_DEBUG, "RELAY: Health Event received: %d", (int)event);
}

void health_relay_init(void) {
  APP_LOG(APP_LOG_LEVEL_INFO, "=== BUILD MARKER: V4_DEEP_DEBUG ===");
#ifdef PBL_HEALTH
  health_service_events_subscribe(health_event_handler, NULL);
#endif
  // Use a longer delay to ensure system settle
	s_startup_timer = app_timer_register(10000, startup_timer_handler, NULL);
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
