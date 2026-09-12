#include <pebble.h>
#include "modules/weather_request.h"

//
// C entrypoint
//
// Wires together the Pebble OS lifecycle, the weather request trigger, and the
// Moddable Alloy runtime. Health data is read natively on the Alloy side via
// "pebble/health" (SDK 4.33+), so no C-side health relay is needed.

int main(void) {
	Window *w = window_create();
	window_stack_push(w, true);

	// Start the weather request trigger (startup + hourly REQ_WEATHER).
	weather_request_init();

	// Start the Alloy runtime.
	moddable_createMachine(NULL);

	// Clean up the trigger before exit.
	weather_request_deinit();
	window_destroy(w);
}
