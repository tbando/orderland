import Layout from "layout";
import Message from "pebble/message";

console.log("=== BUILD MARKER: V19_WEATHER_ROBUST_AUTO ===");

// Load initial values from cache
let weatherCurrentCode = parseInt(localStorage.getItem("weatherCurrentCode") || "0");
let tempMax = parseInt(localStorage.getItem("tempMax") || "0");
let tempMin = parseInt(localStorage.getItem("tempMin") || "0");
let steps = parseInt(localStorage.getItem("steps") || "0");
let weatherHourlyCodes = JSON.parse(localStorage.getItem("weatherHourlyCodes") || "[]");
if (weatherHourlyCodes.length !== 24) weatherHourlyCodes = new Array(24).fill(0);

let isPhoneReady = false;

class FaceApplicationBehavior {
  onDisplaying(application) {
    application.distribute("onClockChanged", { date: new Date() });

    watch.addEventListener('minutechange', (clock) => {
      application.distribute("onClockChanged", clock);
    });

    watch.addEventListener('hourchange', (clock) => {
      // Weather relies on C-side robust automatic updates (V19+).
    });
  }
  
  onClockChanged(application, clock) {
    const now = clock.date || new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const month = now.getMonth();
    const date = now.getDate();
    const day = now.getDay();
    let content = application.first.first;
    
    // 1-4: Hours/Minutes
    if (content) { content.variant = Math.idiv(hours, 10); content = content.next; }
    if (content) { content.variant = hours % 10; content = content.next; }
    if (content) { content.variant = Math.idiv(minutes, 10); content = content.next; }
    if (content) { content.variant = minutes % 10; content = content.next; }
    
    // 5-8: Month/Date/Day
    if (content) { content.variant = month; content = content.next; }
    if (content) { content.variant = Math.idiv(date, 10); content = content.next; }
    if (content) { content.variant = date % 10; content = content.next; }
    if (content) { content.variant = day; content = content.next; }
    
    // 9: Step Label
    if (content) { content.variant = 0; content = content.next; } 
    
    // 10-14: Steps (5 digits)
    let s = Number(steps);
    if (content) { content.variant = Math.idiv(s, 10000) % 10; content = content.next; }
    if (content) { content.variant = Math.idiv(s, 1000) % 10; content = content.next; }
    if (content) { content.variant = Math.idiv(s, 100) % 10; content = content.next; }
    if (content) { content.variant = Math.idiv(s, 10) % 10; content = content.next; }
    if (content) { content.variant = s % 10; content = content.next; }

    // 15-19: Weather/Temp
    if (content) { content.variant = Math.idiv(tempMax, 10); content = content.next; }
    if (content) { content.variant = tempMax % 10; content = content.next; }
    if (content) { content.variant = 10; content = content.next; }
    if (content) { content.variant = Math.idiv(tempMin, 10); content = content.next; }
    if (content) { content.variant = tempMin % 10; content = content.next; }

    // 20-43: Hourly Weather
    for (let i = 0; i < 24; i++) {
      if (content) {
        content.variant = weatherHourlyCodes[i];
        content = content.next;
      }
    }
  }
}

const FaceApplication = Application.template($ => ({
  Behavior: FaceApplicationBehavior,
  contents: [
    Layout($),
  ]
}));

const app = new FaceApplication(null, { 
  displayListLength: 2048, 
  touchCount: 0, 
  pixels: screen.width * 4,
});

globalThis.messageInstance = new Message({
  keys: ["weather", "temp_max", "temp_min", "weather_codes", "req_weather", "req_health", "HEALTH_STEPS", "HEART_RATE_BPM", "10006", "10007"], 
  
  onReadable() {
    isPhoneReady = true; 
    const msg = this.read();
    console.log("Alloy: onReadable triggered");
    
    msg.forEach((value, key) => {
      if (key === "weather") {
        weatherCurrentCode = value;
        localStorage.setItem("weatherCurrentCode", value.toString());
      } else if (key === "temp_max") {
        tempMax = value;
        localStorage.setItem("tempMax", value.toString());
      } else if (key === "temp_min") {
        tempMin = value;
        localStorage.setItem("tempMin", value.toString());
      } else if (key === "weather_codes") {
        const strArray = value.split(",");
        weatherHourlyCodes = [];
        for (let i = 0; i < strArray.length; i++) {
          weatherHourlyCodes.push(parseInt(strArray[i], 10));
        }
        localStorage.setItem("weatherHourlyCodes", JSON.stringify(weatherHourlyCodes));
      } else if (key === "HEALTH_STEPS" || key === "10006") {
        steps = Number(value);
        localStorage.setItem("steps", steps.toString());
        console.log("Alloy: UI update for steps: " + steps);
      }
    });

    app.distribute("onClockChanged", { date: new Date() });
  }
});

export default app;
