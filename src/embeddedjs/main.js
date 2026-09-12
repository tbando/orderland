import Layout from "layout";
import Message from "pebble/message";
import Health from "pebble/health";

console.log("=== BUILD MARKER: V104_STEPS_FALLBACK ===");

// 1. Initialize Message instance AT THE ABSOLUTE TOP
const messageInstance = new Message({
  keys: ["TEMP_MAX", "TEMP_MIN", "WEATHER_CODES", "REQ_WEATHER"],
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
let lastIndicatorHour = -1;
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

// Piu invalidates a content on every variant assignment even when the value is
// unchanged, so guard writes to keep the dirty region (and battery cost) minimal.
function setVariant(content, value) {
  if (!content) return null;
  if (content.variant !== value) content.variant = value;
  return content.next;
}

// Temporary diagnostics (V103): log the first read result / failure once.
let stepsDebugLogged = false;
try {
  const now = Date.now();
  console.log("health: accessible = " +
    Health.metric.accessible({ metric: "step count", start: now, end: now }) +
    " (available=" + Health.access.available + ")");
} catch (e) {
  console.log("health: accessible check failed: " + e);
}

function readSteps() {
  try {
    let s = Health.metric.get("step count");
    // The health service can report today's sum as 0 (same quirk the old
    // C-side health_service_sum_today had); fall back to the last-24h sum.
    if (!(typeof s === "number" && s > 0)) {
      const now = Date.now();
      const q = Health.metric.query({
        metric: "step count",
        start: now - 86400000,
        end: now,
        aggregation: "sum",
        scope: "once"
      });
      if (!stepsDebugLogged) {
        stepsDebugLogged = true;
        console.log("health: get -> " + s + ", query 24h -> " + q + " (" + typeof q + ")");
      }
      if (typeof q === "number" && q > 0) s = q;
    }
    return (typeof s === "number" && s > 0) ? s : 0;
  } catch (e) {
    if (!stepsDebugLogged) {
      stepsDebugLogged = true;
      console.log("health: step read failed: " + e);
    }
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
      const str = designOffsets.join(",");
      if (str !== dStr) {
        dStr = str;
        localStorage.setItem("DESIGN_OFFSETS", str);
      }
    }

    const month = now.getMonth();
    const date = now.getDate();
    const day = now.getDay();
    let content = application.first.first;

    // 1-4: Hours/Minutes
    content = setVariant(content, designOffsets[0] + newH1);
    content = setVariant(content, designOffsets[1] + newH2);
    content = setVariant(content, designOffsets[2] + newM1);
    content = setVariant(content, designOffsets[3] + newM2);

    // 5-8: Month/Date/Day
    content = setVariant(content, month);
    content = setVariant(content, Math.idiv(date, 10));
    content = setVariant(content, date % 10);
    content = setVariant(content, day);

    // 9: Step Label
    content = setVariant(content, 0);

    // 10-14: Steps
    let s = readSteps();
    content = setVariant(content, Math.idiv(s, 10000) % 10);
    content = setVariant(content, Math.idiv(s, 1000) % 10);
    content = setVariant(content, Math.idiv(s, 100) % 10);
    content = setVariant(content, Math.idiv(s, 10) % 10);
    content = setVariant(content, s % 10);

    // 15-19: Weather/Temp
    content = setVariant(content, Math.idiv(tempMax, 10));
    content = setVariant(content, tempMax % 10);
    content = setVariant(content, 10);
    content = setVariant(content, Math.idiv(tempMin, 10));
    content = setVariant(content, tempMin % 10);

    // 20-43: Hourly Weather
    for (let i = 0; i < 24; i++) {
      content = setVariant(content, weatherHourlyCodesStr.charCodeAt(i) - 65);
    }

    // indicator (setting coordinates always invalidates, so move only on hour change)
    if (content && lastIndicatorHour !== hours) {
      lastIndicatorHour = hours;
      content.coordinates = { left: 5 + hours * 8, bottom: 28 };
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
