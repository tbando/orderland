#include "health_relay.h"
#include <pebble.h>
#include <message_keys.auto.h>

//
// modules/health_relay — V39 Final Cleanup
//

// --- Configuration ---
#define HEALTH_UPDATE_INTERVAL_MIN 10
#define WEATHER_UPDATE_INTERVAL_MIN 60
// ---------------------

static AppTimer *s_retry_timer = NULL;
static AppTimer *s_startup_timer = NULL;

static void schedule_retry(uint32_t ms);

// Send current health snapshot and optional weather request
static void send_update(bool request_weather) {
  time_t now = time(NULL);
  
	int32_t steps_today = (int32_t)health_service_sum_today(HealthMetricStepCount);
  int32_t steps_24h = (int32_t)health_service_sum(HealthMetricStepCount, now - SECONDS_PER_DAY, now);
  int32_t steps_to_send = (steps_today > 0) ? steps_today : steps_24h;
	int32_t heart_rate = (int32_t)health_service_peek_current_value(HealthMetricHeartRateBPM);

	DictionaryIterator *iter = NULL;
	AppMessageResult result = app_message_outbox_begin(&iter);
	if (result != APP_MSG_OK) {
		schedule_retry(2000);
		return;
	}

	dict_write_int32(iter, MESSAGE_KEY_HEALTH_STEPS, steps_to_send);
	dict_write_int32(iter, MESSAGE_KEY_HEART_RATE_BPM, heart_rate);
  
  if (request_weather) {
    dict_write_int8(iter, MESSAGE_KEY_req_weather, 1);
  }
  
	app_message_outbox_send();
}

static void retry_timer_handler(void *context) {
	(void)context;
	s_retry_timer = NULL;
	send_update(false);
}

static void schedule_retry(uint32_t ms) {
	if (s_retry_timer) return;
	s_retry_timer = app_timer_register(ms, retry_timer_handler, NULL);
}

// Tick handler: respects configured intervals
static void tick_handler(struct tm *tick_time, TimeUnits units_changed) {
  if (units_changed & MINUTE_UNIT) {
    bool is_weather_time = (tick_time->tm_min % WEATHER_UPDATE_INTERVAL_MIN == 0);
    bool is_health_time = (tick_time->tm_min % HEALTH_UPDATE_INTERVAL_MIN == 0);
    
    if (is_weather_time) {
      send_update(true);
    } else if (is_health_time) {
      send_update(false);
    }
  }
}

static void startup_timer_handler(void *context) {
	s_startup_timer = NULL;
	send_update(true);
}

static void health_event_handler(HealthEventType event, void *context) {
  if (event == HealthEventSignificantUpdate) {
    send_update(false);
  }
}

void health_relay_init(void) {
  APP_LOG(APP_LOG_LEVEL_INFO, "=== BUILD MARKER: V39_FINAL_CLEANUP ===");
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
