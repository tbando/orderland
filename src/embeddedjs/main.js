import Layout from "layout";
import Message from "pebble/message";

console.log("=== BUILD MARKER: V77_SHUFFLE_EACH_DIGIT ===");

// 1. Initialize Message instance AT THE ABSOLUTE TOP
const messageInstance = new Message({
  keys: ["TEMP_MAX", "TEMP_MIN", "WEATHER_CODES", "REQ_WEATHER", "HEALTH_STEPS"], 
  input: 512,
  output: 512, 
  
  onReadable() {
    const msg = this.read();
    
    msg.forEach((value, key) => {
      if (key === "TEMP_MAX") {
        tempMax = value;
        localStorage.setItem("TEMP_MAX", value.toString());
      } else if (key === "TEMP_MIN") {
        tempMin = value;
        localStorage.setItem("TEMP_MIN", value.toString());
      } else if (key === "WEATHER_CODES") {
        const strArray = value.split(",");
        weatherHourlyCodes = [];
        for (let i = 0; i < strArray.length; i++) {
          weatherHourlyCodes.push(parseInt(strArray[i], 10));
        }
        localStorage.setItem("WEATHER_CODES", JSON.stringify(weatherHourlyCodes));
      } else if (key === "HEALTH_STEPS" || key === "10006") {
        steps = Number(value);
        localStorage.setItem("HEALTH_STEPS", steps.toString());
      }
    });

    app.distribute("onClockChanged", { date: new Date() });
  }
});

let tempMax = parseInt(localStorage.getItem("TEMP_MAX") || "0");
let tempMin = parseInt(localStorage.getItem("TEMP_MIN") || "0");
let steps = parseInt(localStorage.getItem("HEALTH_STEPS") || "0");
let weatherHourlyCodes = JSON.parse(localStorage.getItem("WEATHER_CODES") || "[]");
if (weatherHourlyCodes.length !== 24) weatherHourlyCodes = new Array(24).fill(0);

let currentMday = parseInt(localStorage.getItem("DESIGN_MDAY") || "-1", 10);
let designOffsets = [];
try {
  designOffsets = JSON.parse(localStorage.getItem("DESIGN_OFFSETS") || "[]");
} catch (e) {
  designOffsets = [];
}
if (!Array.isArray(designOffsets) || designOffsets.length !== 4) {
  designOffsets = [0, 10, 20, 30];
}

function updateDesignOffsets(mday) {
  const base = [0, 10, 20, 30];
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = base[i];
    base[i] = base[j];
    base[j] = temp;
  }
  designOffsets = base;
  currentMday = mday;
  localStorage.setItem("DESIGN_MDAY", mday.toString());
  localStorage.setItem("DESIGN_OFFSETS", JSON.stringify(designOffsets));
}

class FaceApplicationBehavior {
  onDisplaying(application) {
    application.distribute("onClockChanged", { date: new Date() });

    watch.addEventListener('minutechange', (clock) => {
      application.distribute("onClockChanged", clock);
    });
  }
  
  onClockChanged(application, clock) {
    const now = clock.date || new Date();
    const mday = now.getDate();

    if (mday !== currentMday) {
      updateDesignOffsets(mday);
    }

    const hours = now.getHours();
    const minutes = now.getMinutes();
    const month = now.getMonth();
    const date = now.getDate();
    const day = now.getDay();
    let content = application.first.first;
    
    // 1-4: Hours/Minutes (HH and MM using single 40-digit image, dynamic offset)
    if (content) { content.variant = designOffsets[0] + Math.idiv(hours, 10); content = content.next; }
    if (content) { content.variant = designOffsets[1] + (hours % 10); content = content.next; }
    if (content) { content.variant = designOffsets[2] + Math.idiv(minutes, 10); content = content.next; }
    if (content) { content.variant = designOffsets[3] + (minutes % 10); content = content.next; }
    
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

export default app;
