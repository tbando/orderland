import Layout from "layout";
import Message from "pebble/message";
import Timer from "timer";

console.log("=== BUILD MARKER: V32_STATIC_MSG_FIX ===");

// Global state
let weatherCurrentCode = parseInt(localStorage.getItem("weatherCurrentCode") || "0");
let tempMax = parseInt(localStorage.getItem("tempMax") || "0");
let tempMin = parseInt(localStorage.getItem("tempMin") || "0");
let steps = parseInt(localStorage.getItem("steps") || "0");
let weatherHourlyCodes = JSON.parse(localStorage.getItem("weatherHourlyCodes") || "[]");
if (weatherHourlyCodes.length !== 24) weatherHourlyCodes = new Array(24).fill(0);

let isPhoneReady = false;

class FaceApplicationBehavior {
  onDisplaying(application) {
    console.log("Alloy: onDisplaying (application started)");
    application.distribute("onClockChanged", { date: new Date() });

    // Internal ready flag after 5 seconds to ensure system stability
    Timer.set(() => {
      isPhoneReady = true;
      console.log("Alloy: Bridge considered READY");
    }, 5000);

    watch.addEventListener('minutechange', (clock) => {
      application.distribute("onClockChanged", clock);
    });

    watch.addEventListener('hourchange', (clock) => {
      console.log("Alloy: hourchange event");
      // Use 10s delay to allow full system initialization
      Timer.set(() => {
        if (globalThis.messageInstance && globalThis.messageInstance.write) {
          try {
            console.log("Alloy: Requesting weather...");
            globalThis.messageInstance.write({ req_weather: 1 });
          } catch (e) {
            console.log("Alloy: req_weather write failed: " + e);
          }
        }
      }, 10000);
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

// Initialize Message instance at the very end (global scope)
globalThis.messageInstance = new Message({
  keys: ["weather", "temp_max", "temp_min", "weather_codes", "req_weather", "req_health", "HEALTH_STEPS", "HEART_RATE_BPM"], 
  
  onReadable() {
    const msg = this.read();
    console.log("Alloy: onReadable (msg received)");
    
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
        console.log("Alloy: Weather array updated");
      } else if (key === "HEALTH_STEPS" || key === "10006") {
        steps = Number(value);
        localStorage.setItem("steps", steps.toString());
        console.log("Alloy: Internal steps updated to: " + steps);
      } else if (key === "HEART_RATE_BPM" || key === "10007") {
        console.log("Alloy: Heart rate update: " + value);
      }
    });

    app.distribute("onClockChanged", { date: new Date() });
  }
});

export default app;
