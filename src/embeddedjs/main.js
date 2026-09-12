import Layout from "layout";
import Message from "pebble/message";
import Health from "pebble/health";

console.log("=== BUILD MARKER: V101_NATIVE_HEALTH ===");

// 1. Initialize Message instance AT THE ABSOLUTE TOP
const messageInstance = new Message({
  keys: ["TEMP_MAX", "TEMP_MIN", "WEATHER_CODES", "REQ_WEATHER"],
  input: 512,
  output: 512,

  onReadable() {
    const msg = this.read();
    let shouldUpdateSkins = false;

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
      }
    });

    app.distribute("onClockChanged", { date: new Date() });
  }
});


let tempMax = parseInt(localStorage.getItem("TEMP_MAX") || "0");
let tempMin = parseInt(localStorage.getItem("TEMP_MIN") || "0");
let weatherHourlyCodesStr = localStorage.getItem("WEATHER_CODES") || "";
if (!/^[A-Z]{24}$/.test(weatherHourlyCodesStr)) {
  weatherHourlyCodesStr = "AAAAAAAAAAAAAAAAAAAAAAAA";
}

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
const WEIGHTS = [0.43, 0.33, 0.23, 0.01]; // 各セットの確率の重み

function readSteps() {
  try {
    const s = Health.metric.get("step count");
    return (typeof s === "number" && s > 0) ? s : 0;
  } catch (e) {
    return 0;
  }
}

function getRandomOffsetForDigit(targetIdx, digits, currentOffsets) {
  let usedOffsets = {};
  for(let i=0; i<4; i++) {
    if(i !== targetIdx && digits[i] === digits[targetIdx] && currentOffsets[i] !== -1) {
      usedOffsets[currentOffsets[i]] = true;
    }
  }
  
  let totalWeight = 0;
  let firstUnused = -1;
  let lastUnused = -1;
  
  for (let i = 0; i < SET_COUNT; i++) {
    const offset = i * 10;
    if (!usedOffsets[offset]) {
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
    if (!usedOffsets[offset]) {
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

    // Health events (significant update / movement) trigger an immediate redraw;
    // steps are re-read from Health.metric at render time.
    watch.addEventListener('health', () => {
      application.distribute("onClockChanged", { date: new Date() });
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
        let digits = [newH1, newH2, newM1, newM2];
        for(let i=0; i<4; i++) {
          if(designOffsets[i] < 0 || designOffsets[i] >= SET_COUNT * 10 || designOffsets[i] % 10 !== 0) isValid = false;
        }
        for(let i=0; i<4; i++) {
          for(let j=i+1; j<4; j++) {
            if(digits[i] === digits[j] && designOffsets[i] === designOffsets[j]) {
              isValid = false;
            }
          }
        }
      }
      
      if (!isValid) {
        designOffsets = [-1, -1, -1, -1];
        let digits = [newH1, newH2, newM1, newM2];
        for(let i=0; i<4; i++) {
          designOffsets[i] = getRandomOffsetForDigit(i, digits, designOffsets);
        }
        changed = true;
      }
      
      lastMinutes = minutes;
      isStartup = false;
    } else if (minutes !== lastMinutes) {
      let digits = [newH1, newH2, newM1, newM2];
      let changedIndices = [];
      if (minutes === 0 && newH2 === 0) changedIndices.push(0);
      if (minutes === 0) changedIndices.push(1);
      if (newM2 === 0) changedIndices.push(2);
      changedIndices.push(3);

      for(let i = 0; i < changedIndices.length; i++) {
        designOffsets[changedIndices[i]] = -1;
      }
      for(let i = 0; i < changedIndices.length; i++) {
        let idx = changedIndices[i];
        designOffsets[idx] = getRandomOffsetForDigit(idx, digits, designOffsets);
      }

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
    
    // 1-4: Hours/Minutes
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
    
    // 10-14: Steps
    let s = readSteps();
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
    
    // indicator
    if (content) { content.coordinates = {left: 5+hours*8, bottom:28 }; content = content.next; }
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
