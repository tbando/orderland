#include <pebble.h>
//#include "modules/health_relay.h"

//
// C entrypoint
//
// Wires together the Pebble OS lifecycle, the health relay module, and the
// Moddable Alloy runtime. All relay logic lives in modules/health_relay.c.

int main(void) {
	Window *w = window_create();
	window_stack_push(w, true);

	// Start the health relay, which samples health data and sends it to the phone
	// to be relayed back to watch JS.
	//health_relay_init();

	// Start the Alloy runtime.
	moddable_createMachine(NULL);

	// Clean up the relay before exit.
	//health_relay_deinit();
	window_destroy(w);
}