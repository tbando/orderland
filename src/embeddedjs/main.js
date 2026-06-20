import Layout from "layout";
import Message from "pebble/message";

console.log("=== BUILD MARKER: V86_REMOVE_UNUSED_ASSETS ===");

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
        weatherHourlyCodesStr = value;
        localStorage.setItem("WEATHER_CODES", weatherHourlyCodesStr);
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
let weatherHourlyCodesStr = localStorage.getItem("WEATHER_CODES") || "";
if (weatherHourlyCodesStr.length !== 24) weatherHourlyCodesStr = "AAAAAAAAAAAAAAAAAAAAAAAA";

let isStartup = true;
let lastMinutes = -1;
let designOffsets = [];
let dStr = localStorage.getItem("DESIGN_OFFSETS") || "";
if (dStr) {
  let arr = dStr.split(",");
  for (let i = 0; i < arr.length; i++) {
    designOffsets.push(parseInt(arr[i], 10));
  }
}

const SET_COUNT = 4; // 6セットの画像を用意した際に 6 に変更してください
const WEIGHTS = [0.4, 0.3, 0.2, 0.1, 0.0, 0.0]; // 各セットの確率の重み

function isOffsetUsed(offset, d0, d1, d2, d3, mask) {
  if ((mask & 1) && d0 === offset) return true;
  if ((mask & 2) && d1 === offset) return true;
  if ((mask & 4) && d2 === offset) return true;
  if ((mask & 8) && d3 === offset) return true;
  return false;
}

function getRandomOffsetExcept2(d0, d1, d2, d3, mask) {
  let totalWeight = 0;
  let firstUnused = -1;
  let lastUnused = -1;
  
  for (let i = 0; i < SET_COUNT; i++) {
    const offset = i * 10;
    if (!isOffsetUsed(offset, d0, d1, d2, d3, mask)) {
      totalWeight += WEIGHTS[i] || 0;
      if (firstUnused === -1) firstUnused = offset;
      lastUnused = offset;
    }
  }
  
  if (lastUnused === -1) return 0;
  if (totalWeight <= 0) return firstUnused;
  
  const r = Math.random() * totalWeight;
  let sum = 0;
  for (let i = 0; i < SET_COUNT; i++) {
    const offset = i * 10;
    if (!isOffsetUsed(offset, d0, d1, d2, d3, mask)) {
      sum += WEIGHTS[i] || 0;
      if (r <= sum) return offset;
    }
  }
  
  return lastUnused;
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
    const hours = now.getHours();
    const minutes = now.getMinutes();

    const newH1 = Math.idiv(hours, 10);
    const newH2 = hours % 10;
    const newM1 = Math.idiv(minutes, 10);
    const newM2 = minutes % 10;

    let changed = false;

    if (isStartup) {
      let isValid = Array.isArray(designOffsets) && designOffsets.length === 4;
      if (isValid) {
        const d0 = designOffsets[0], d1 = designOffsets[1], d2 = designOffsets[2], d3 = designOffsets[3];
        isValid = (d0 !== d1 && d0 !== d2 && d0 !== d3 && d1 !== d2 && d1 !== d3 && d2 !== d3) &&
                  (d0 >= 0 && d0 < SET_COUNT * 10 && d0 % 10 === 0) &&
                  (d1 >= 0 && d1 < SET_COUNT * 10 && d1 % 10 === 0) &&
                  (d2 >= 0 && d2 < SET_COUNT * 10 && d2 % 10 === 0) &&
                  (d3 >= 0 && d3 < SET_COUNT * 10 && d3 % 10 === 0);
      }
      
      if (!isValid) {
        const d0 = getRandomOffsetExcept2(0, 0, 0, 0, 0);
        const d1 = getRandomOffsetExcept2(d0, 0, 0, 0, 1);
        const d2 = getRandomOffsetExcept2(d0, d1, 0, 0, 3);
        const d3 = getRandomOffsetExcept2(d0, d1, d2, 0, 7);
        designOffsets[0] = d0;
        designOffsets[1] = d1;
        designOffsets[2] = d2;
        designOffsets[3] = d3;
        changed = true;
      }
      
      lastMinutes = minutes;
      isStartup = false;
    } else if (minutes !== lastMinutes) {
      let updateMask = 8; // 分の2桁目は毎分必ず変わる
      if (newM2 === 0) updateMask |= 4;
      if (minutes === 0) updateMask |= 2;
      if (minutes === 0 && newH2 === 0) updateMask |= 1;

      let d0 = designOffsets[0];
      let d1 = designOffsets[1];
      let d2 = designOffsets[2];
      let d3 = designOffsets[3];

      let mask = ~updateMask & 15;

      if (updateMask & 1) {
        d0 = getRandomOffsetExcept2(d0, d1, d2, d3, mask);
        mask |= 1;
      }
      if (updateMask & 2) {
        d1 = getRandomOffsetExcept2(d0, d1, d2, d3, mask);
        mask |= 2;
      }
      if (updateMask & 4) {
        d2 = getRandomOffsetExcept2(d0, d1, d2, d3, mask);
        mask |= 4;
      }
      if (updateMask & 8) {
        d3 = getRandomOffsetExcept2(d0, d1, d2, d3, mask);
        mask |= 8;
      }

      designOffsets[0] = d0;
      designOffsets[1] = d1;
      designOffsets[2] = d2;
      designOffsets[3] = d3;

      lastMinutes = minutes;
      changed = true;
    }

    if (changed) {
      localStorage.setItem("DESIGN_OFFSETS", designOffsets.join(","));
    }

    const month = now.getMonth();
    const date = now.getDate();
    const day = now.getDay();
    let content = application.first.first;
    
    // 1-4: Hours/Minutes (HH and MM using single 40-digit image, dynamic offset)
    if (content) { content.variant = designOffsets[0] + newH1; content = content.next; }
    if (content) { content.variant = designOffsets[1] + newH2; content = content.next; }
    if (content) { content.variant = designOffsets[2] + newM1; content = content.next; }
    if (content) { content.variant = designOffsets[3] + newM2; content = content.next; }
    
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
        content.variant = weatherHourlyCodesStr.charCodeAt(i) - 65;
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
