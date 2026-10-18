import Layout, { toColor, getWeatherColor } from "layout";
import Message from "pebble/message";
import Health from "pebble/health";

console.log("=== BUILD MARKER: V116_SINGLE_PORT_MEMFIX ===");

// 12-char ASCII config: each char is String.fromCharCode(65 + val)
// [0..5]: 6-bit colors (bg=0, hour=63, min=63, text=63, max=52, minT=27)
// [6..11]: weatherColorMode=0, fahrenheit=0, 24h=1, style=0, steps=1, weather=1
const DEFAULT_CFG = "A~~~u\\AABABB";

let isStartup = true;
let lastMinutes = -1;
let weatherDirty = true;
const designOffsets = [-1, -1, -1, -1];
const digits = [0, 0, 0, 0];
const stepQuery = { metric: "step count", start: 0, end: 0 };

const state = {
  bgColor: 0,
  hourColor: 0,
  minuteColor: 0,
  activeHourColor: 0,
  activeMinColor: 0,
  textColor: 0,
  tempMaxColor: 0,
  tempMinColor: 0,
  weatherColorMode: 0,
  useFahrenheit: false,
  use24Hour: true,
  digitStyle: 0,
  showSteps: true,
  showWeather: true,
  vH1: 0,
  vH2: 0,
  vM1: 0,
  vM2: 0,
  month: 0,
  date: 1,
  day: 0,
  steps: 0,
  dMax: 0,
  dMin: 0,
  codes: "",
  hour: -1,
};

let tempMax = parseInt(localStorage.getItem("TEMP_MAX") || "0", 10) || 0;
let tempMin = parseInt(localStorage.getItem("TEMP_MIN") || "0", 10) || 0;
let weatherHourlyCodesStr = localStorage.getItem("WEATHER_CODES") || "";
if (weatherHourlyCodesStr.length !== 24) {
  weatherHourlyCodesStr = "";
}
state.codes = weatherHourlyCodesStr;

function parseCfg(str) {
  const s = (str && str.length === 12) ? str : DEFAULT_CFG;
  const newStyle = s.charCodeAt(9) - 65;
  const new24h = (s.charCodeAt(8) === 66);
  if (state.digitStyle !== newStyle || state.use24Hour !== new24h) {
    isStartup = true;
  }
  state.bgColor = toColor(s.charCodeAt(0) - 65);
  state.hourColor = toColor(s.charCodeAt(1) - 65);
  state.minuteColor = toColor(s.charCodeAt(2) - 65);
  state.textColor = toColor(s.charCodeAt(3) - 65);
  state.tempMaxColor = toColor(s.charCodeAt(4) - 65);
  state.tempMinColor = toColor(s.charCodeAt(5) - 65);
  state.weatherColorMode = s.charCodeAt(6) - 65;
  state.useFahrenheit = (s.charCodeAt(7) === 66);
  state.use24Hour = new24h;
  state.digitStyle = newStyle;
  state.showSteps = (s.charCodeAt(10) === 66);
  state.showWeather = (s.charCodeAt(11) === 66);
}

function syncTimeColors(hours) {
  let hc = state.hourColor;
  let mc = state.minuteColor;
  const mode = state.weatherColorMode;
  if (mode > 0 && weatherHourlyCodesStr.length === 24) {
    const cur = getWeatherColor(weatherHourlyCodesStr.charCodeAt(hours) - 65);
    if (mode === 1) {
      if (cur) { hc = cur; mc = cur; }
    } else if (mode === 2) {
      if (cur) hc = cur;
    } else if (mode === 3) {
      if (cur) mc = cur;
    } else if (mode === 4) {
      if (cur) hc = cur;
      const nxt = getWeatherColor(weatherHourlyCodesStr.charCodeAt((hours + 1) % 24) - 65);
      if (nxt) mc = nxt;
    }
  }
  const changed = (hc !== state.activeHourColor || mc !== state.activeMinColor);
  state.activeHourColor = hc;
  state.activeMinColor = mc;
  return changed;
}

parseCfg(localStorage.getItem("SETTINGS"));
syncTimeColors(new Date().getHours());

// Initialize Message instance at module scope
const messageInstance = new Message({
  keys: ["TEMP_MAX", "TEMP_MIN", "WEATHER_CODES", "REQ_WEATHER", "CFG"],
  input: 256,
  output: 128,

  onReadable() {
    let msg = this.read();
    if (!msg) return;
    const tMax = msg.get("TEMP_MAX");
    const tMin = msg.get("TEMP_MIN");
    const wCodes = msg.get("WEATHER_CODES");
    const cfg = msg.get("CFG");
    // Release Map entries & reference immediately before flash writes / UI update
    msg.clear();
    msg = null;

    let updated = false;
    if (tMax !== undefined && tMax !== tempMax) {
      tempMax = tMax;
      localStorage.setItem("TEMP_MAX", tMax.toString());
      updated = true;
    }
    if (tMin !== undefined && tMin !== tempMin) {
      tempMin = tMin;
      localStorage.setItem("TEMP_MIN", tMin.toString());
      updated = true;
    }
    if (wCodes !== undefined && wCodes !== weatherHourlyCodesStr) {
      weatherHourlyCodesStr = wCodes;
      state.codes = wCodes;
      localStorage.setItem("WEATHER_CODES", wCodes);
      updated = true;
    }
    if (cfg !== undefined) {
      localStorage.setItem("SETTINGS", cfg);
      parseCfg(cfg);
      updated = true;
    }

    if (updated) {
      weatherDirty = true;
      app.distribute("onClockChanged", { date: new Date() });
    }
  }
});

const SET_COUNT = 4; // 6セットの画像を用意した際に 6 に変更してください
const WEIGHTS = [0.43, 0.33, 0.23, 0.01]; // 各セットの確率の重み

// Health.metric.get("step count") returns 0 on current firmware despite the
// docs, so read steps with a midnight-to-now query instead. Reuses stepQuery
// object so zero JS objects are allocated per minute.
function readSteps(now, hours, minutes) {
  try {
    const end = now.getTime();
    stepQuery.start = end - (hours * 3600000 + minutes * 60000 + now.getSeconds() * 1000);
    stepQuery.end = end;
    const s = Health.metric.query(stepQuery);
    return (typeof s === "number" && s > 0) ? (s > 99999 ? 99999 : s) : 0;
  } catch (e) {
    return 0;
  }
}

function getRandomOffsetForDigit(targetIdx) {
  if (state.digitStyle >= 2) {
    return (state.digitStyle - 2) * 10;
  }

  let usedMask = 0;
  const targetDigit = digits[targetIdx];
  for (let i = 0; i < 4; i++) {
    if (i !== targetIdx && digits[i] === targetDigit && designOffsets[i] >= 0) {
      usedMask |= (1 << Math.idiv(designOffsets[i], 10));
    }
  }

  const equalWeight = (state.digitStyle === 1);
  let totalWeight = 0;
  let firstUnused = -1;
  let lastUnused = -1;

  for (let i = 0; i < SET_COUNT; i++) {
    if (!(usedMask & (1 << i))) {
      const offset = i * 10;
      totalWeight += equalWeight ? 1 : (WEIGHTS[i] || 0);
      if (firstUnused === -1) firstUnused = offset;
      lastUnused = offset;
    }
  }

  if (lastUnused === -1) return 0;
  if (totalWeight <= 0) return firstUnused;

  const r = Math.random() * totalWeight;
  let sum = 0;
  for (let i = 0; i < SET_COUNT; i++) {
    if (!(usedMask & (1 << i))) {
      sum += equalWeight ? 1 : (WEIGHTS[i] || 0);
      if (r <= sum) return i * 10;
    }
  }

  return lastUnused;
}

class FaceApplicationBehavior {
  onDisplaying(application) {
    // Synchronously set state before the first frame is drawn so
    // default 00:00 never flashes when returning from menu.
    this.onClockChanged(application, { date: new Date() });

    watch.addEventListener('minutechange', (clock) => {
      this.onClockChanged(application, clock);
    });
  }

  onClockChanged(application, clock) {
    const now = clock.date || new Date();
    const minutes = now.getMinutes();
    if (!isStartup && minutes === lastMinutes && !weatherDirty) return;

    const hours = now.getHours();
    const dispHours = state.use24Hour ? hours : (hours % 12 || 12);

    const newH1 = Math.idiv(dispHours, 10);
    const newH2 = dispHours % 10;
    const newM1 = Math.idiv(minutes, 10);
    const newM2 = minutes % 10;
    digits[0] = newH1;
    digits[1] = newH2;
    digits[2] = newM1;
    digits[3] = newM2;

    if (isStartup) {
      for (let i = 0; i < 4; i++) designOffsets[i] = -1;
      for (let i = 0; i < 4; i++) {
        designOffsets[i] = getRandomOffsetForDigit(i);
      }
      lastMinutes = minutes;
      isStartup = false;
    } else if (minutes !== lastMinutes) {
      if (state.digitStyle < 2) {
        const c0 = (minutes === 0 && (newH2 === 0 || (!state.use24Hour && dispHours === 1)));
        const c1 = (minutes === 0);
        const c2 = (newM2 === 0);
        if (c0) designOffsets[0] = -1;
        if (c1) designOffsets[1] = -1;
        if (c2) designOffsets[2] = -1;
        designOffsets[3] = -1;

        if (c0) designOffsets[0] = getRandomOffsetForDigit(0);
        if (c1) designOffsets[1] = getRandomOffsetForDigit(1);
        if (c2) designOffsets[2] = getRandomOffsetForDigit(2);
        designOffsets[3] = getRandomOffsetForDigit(3);
      }
      lastMinutes = minutes;
    }

    state.vH1 = designOffsets[0] + newH1;
    state.vH2 = designOffsets[1] + newH2;
    state.vM1 = designOffsets[2] + newM1;
    state.vM2 = designOffsets[3] + newM2;

    state.month = now.getMonth();
    state.date = now.getDate();
    state.day = now.getDay();

    if (state.showSteps) {
      state.steps = readSteps(now, hours, minutes);
    }

    let dMax = state.useFahrenheit ? Math.idiv(tempMax * 9 + 160, 5) : tempMax;
    let dMin = state.useFahrenheit ? Math.idiv(tempMin * 9 + 160, 5) : tempMin;
    if (dMax < 0) dMax = 0; else if (dMax > 99) dMax = 99;
    if (dMin < 0) dMin = 0; else if (dMin > 99) dMin = 99;
    state.dMax = dMax;
    state.dMin = dMin;
    state.hour = hours;
    syncTimeColors(hours);
    weatherDirty = false;

    if (application.first) {
      application.first.invalidate();
    }
  }
}

const FaceApplication = Application.template($ => ({
  Behavior: FaceApplicationBehavior,
  contents: [
    Layout($),
  ]
}));

const app = new FaceApplication(state, {
  touchCount: 0,
});

export default app;
