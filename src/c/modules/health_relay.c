#include "health_relay.h"
#include <pebble.h>
#include <message_keys.auto.h>

//
// modules/health_relay — Advanced Debug Version
//

static AppTimer *s_retry_timer = NULL;
static AppTimer *s_startup_timer = NULL;

static void schedule_retry(uint32_t ms);

// Send the current health snapshot to the phone. Retries on failure.
static void send_health_snapshot(void) {
  // --- 1. System Info Debug ---
  time_t now = time(NULL);
  time_t start_today = time_start_of_today();
  struct tm *t = localtime(&now);
  APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: Time=%02d:%02d:%02d, now=%ld, start=%ld", 
          t->tm_hour, t->tm_min, t->tm_sec, (long)now, (long)start_today);

#ifdef PBL_HEALTH
  APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: PBL_HEALTH is DEFINED");
#else
  APP_LOG(APP_LOG_LEVEL_ERROR, "RELAY: PBL_HEALTH is NOT DEFINED!");
#endif

  // --- 2. Metric Debugging ---
	int32_t steps_today = (int32_t)health_service_sum_today(HealthMetricStepCount);
  int32_t steps_24h = (int32_t)health_service_sum(HealthMetricStepCount, now - SECONDS_PER_DAY, now);
  int32_t steps_avg = (int32_t)health_service_get_daily_avg_today(HealthMetricStepCount);
  int32_t dist_today = (int32_t)health_service_sum_today(HealthMetricWalkedDistanceMeters);
  
  APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: steps_today=%ld, 24h=%ld, avg=%ld, dist=%ld", 
          (long)steps_today, (long)steps_24h, (long)steps_avg, (long)dist_today);

  // Use the best available step count for the snapshot
  int32_t steps_to_send = steps_today;
  if (steps_to_send == 0 && steps_24h > 0) {
    steps_to_send = steps_24h;
    APP_LOG(APP_LOG_LEVEL_WARNING, "RELAY: Using 24h fallback for steps");
  }

	int32_t heart_rate = 0;
#ifdef PBL_HEALTH
  heart_rate = (int32_t)health_service_peek_current_value(HealthMetricHeartRateBPM);
#endif

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

	APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: Sent steps=%ld bpm=%ld", (long)steps_to_send, (long)heart_rate);
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
  APP_LOG(APP_LOG_LEVEL_DEBUG, "RELAY: Inbox received something!");
  Tuple *req_health_tuple = dict_find(iter, MESSAGE_KEY_req_health);
  if (req_health_tuple) {
    APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: Received req_health trigger from JS");
    send_health_snapshot();
  }
}

static void startup_timer_handler(void *context) {
	s_startup_timer = NULL;
  
  // Re-register inbox handler with a delay, hoping to beat Alloy's hijack
  app_message_register_inbox_received(inbox_received_handler);
  APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: Inbox handler registered (delayed)");
  
	send_health_snapshot();
}

// Dummy handler to keep service active
static void health_event_handler(HealthEventType event, void *context) {}

void health_relay_init(void) {
#ifdef PBL_HEALTH
  health_service_events_subscribe(health_event_handler, NULL);
#endif
  // Delay initial send and handler registration to let Alloy settle
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
