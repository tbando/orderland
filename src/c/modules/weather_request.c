#include "weather_request.h"
#include <pebble.h>
#include <message_keys.auto.h>

//
// modules/weather_request — V81 Native Health
//

#define WEATHER_UPDATE_INTERVAL_MIN 60

static AppTimer *s_retry_timer = NULL;
static AppTimer *s_startup_timer = NULL;

static void schedule_retry(uint32_t ms);

static void send_weather_request(void) {
	DictionaryIterator *iter = NULL;
	AppMessageResult result = app_message_outbox_begin(&iter);
	if (result != APP_MSG_OK) {
		schedule_retry(2000);
		return;
	}

	dict_write_int8(iter, MESSAGE_KEY_REQ_WEATHER, 1);
	app_message_outbox_send();
}

static void retry_timer_handler(void *context) {
	(void)context;
	s_retry_timer = NULL;
	send_weather_request();
}

static void schedule_retry(uint32_t ms) {
	if (s_retry_timer) return;
	s_retry_timer = app_timer_register(ms, retry_timer_handler, NULL);
}

static void tick_handler(struct tm *tick_time, TimeUnits units_changed) {
  if (units_changed & MINUTE_UNIT) {
    if (tick_time->tm_min % WEATHER_UPDATE_INTERVAL_MIN == 0) {
      send_weather_request();
    }
  }
}

static void startup_timer_handler(void *context) {
	(void)context;
	s_startup_timer = NULL;
	send_weather_request();
}

void weather_request_init(void) {
  APP_LOG(APP_LOG_LEVEL_INFO, "=== BUILD MARKER: V81_NATIVE_HEALTH ===");

  tick_timer_service_subscribe(MINUTE_UNIT, tick_handler);
	s_startup_timer = app_timer_register(5000, startup_timer_handler, NULL);
}

void weather_request_deinit(void) {
  tick_timer_service_unsubscribe();
	if (s_startup_timer) {
		app_timer_cancel(s_startup_timer);
		s_startup_timer = NULL;
	}
	if (s_retry_timer) {
		app_timer_cancel(s_retry_timer);
		s_retry_timer = NULL;
	}
}
