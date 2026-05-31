#include "health_relay.h"
#include <pebble.h>
#include <message_keys.auto.h>

//
// modules/health_relay — V8 Real Device Check Version
//

static AppTimer *s_retry_timer = NULL;
static AppTimer *s_startup_timer = NULL;

static void schedule_retry(uint32_t ms);

static const char* get_mask_string(HealthServiceAccessibilityMask mask) {
  bool available = mask & 0x01;
  bool accessible = mask & 0x02;
  if (available && accessible) return "OK";
  if (available) return "DENIED (Check Watch Settings -> Health)";
  return "N/A";
}

// Send the current health snapshot to the phone. Retries on failure.
static void send_health_snapshot(void) {
  time_t now = time(NULL);
  
  // 1. Log System Config
  MeasurementSystem sys = health_service_get_measurement_system();
  APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: Unit System: %s", (sys == MeasurementSystemMetric) ? "Metric" : "Imperial");

  HealthServiceAccessibilityMask m_steps = health_service_metric_accessible(HealthMetricStepCount, now-60, now);
  APP_LOG(APP_LOG_LEVEL_INFO, "RELAY MASK: Steps: %s", get_mask_string(m_steps));

  // 2. Fetch Values
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

	APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: Sent to JS -> Steps:%ld HR:%ld", (long)steps, (long)heart_rate);
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
  if (dict_find(iter, MESSAGE_KEY_req_health)) {
    APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: Received req_health");
    send_health_snapshot();
  }
}

static void startup_timer_handler(void *context) {
	s_startup_timer = NULL;
  app_message_register_inbox_received(inbox_received_handler);
	send_health_snapshot();
}

static void health_event_handler(HealthEventType event, void *context) {
  // Any event (even 0: SignificantUpdate) is a sign the service is alive
  if (event == HealthEventSignificantUpdate) {
    APP_LOG(APP_LOG_LEVEL_INFO, "RELAY: Significant Health Update detected");
    send_health_snapshot();
  }
}

void health_relay_init(void) {
  APP_LOG(APP_LOG_LEVEL_INFO, "=== BUILD MARKER: V8_REAL_DEVICE_ONLY ===");
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
