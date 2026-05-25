import Layout from "layout";

class FaceApplicationBehavior {
	onDisplaying(application) {
		watch.addEventListener('minutechange', (clock) => {
			application.distribute("onClockChanged", clock);
		});
	}
	onClockChanged(application, clock) {
		const now = clock.date;
		const hours = now.getHours();
		const minutes = now.getMinutes();
    const month = now.getMonth();
    const date = now.getDate();
    const day = now.getDay();
		let content = application.first.first;
    // hours
		content.variant = Math.idiv(hours, 10);
		content = content.next;
		content.variant = hours % 10;
		content = content.next;
		// minutes
    content.variant = Math.idiv(minutes, 10);
		content = content.next;
		content.variant = minutes % 10;
		content = content.next;
		// month
    content.variant = month;
  	content = content.next;
		// date
    content.variant = Math.idiv(date, 10);
  	content = content.next;
    content.variant = date % 10;
  	content = content.next;
		// day
    content.variant = day;
		content = content.next;
    // step label
		content.variant = 0;
		content = content.next;
  // weather
    content.variant = 0;
		content = content.next;
		content.variant = 3;
		content = content.next;
		

    // test
    
	}
}

const FaceApplication = Application.template($ => ({
	Behavior:FaceApplicationBehavior,
	contents: [
		Layout($),
	]
}));

export default new FaceApplication(null, { 
	displayListLength:2048, 
	touchCount:0, 
	pixels: screen.width * 4,
});
