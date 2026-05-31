import Layout from "layout";
import Message from "pebble/message";

console.log("=== BUILD MARKER: V10_FIX_UNIT_FUNC ===");

let weatherCurrentCode = 0;
let tempMax = 0;
let tempMin = 0;
let steps = 0;
let weatherHourlyCodes = new Array(24).fill(0); 
let isPhoneReady = false;

class FaceApplicationBehavior {
  onDisplaying(application) {
    application.distribute("onClockChanged", { date: new Date() });

    watch.addEventListener('minutechange', (clock) => {
      application.distribute("onClockChanged", clock);

      const now = clock.date || new Date();
      if (now.getMinutes() % 5 === 0) {
        if (isPhoneReady && globalThis.messageInstance) {
          console.log("Alloy: Requesting health data update...");
          globalThis.messageInstance.write({ req_health: 1 });
        }
      }
    });

    watch.addEventListener('hourchange', (clock) => {
      if (isPhoneReady && globalThis.messageInstance) {
        globalThis.messageInstance.write({ req_weather: 1 });
      }
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
    
    // 基本時計・カレンダー描画
    if (content) { content.variant = Math.idiv(hours, 10); content = content.next; }
    if (content) { content.variant = hours % 10; content = content.next; }
    if (content) { content.variant = Math.idiv(minutes, 10); content = content.next; }
    if (content) { content.variant = minutes % 10; content = content.next; }
    if (content) { content.variant = month; content = content.next; }
    if (content) { content.variant = Math.idiv(date, 10); content = content.next; }
    if (content) { content.variant = date % 10; content = content.next; }
    if (content) { content.variant = day; content = content.next; }
    if (content) { content.variant = 0; content = content.next; } 
    
    // 歩数 (5桁: 00000)
    if (content) { content.variant = Math.idiv(steps, 10000) % 10; content = content.next; }
    if (content) { content.variant = Math.idiv(steps, 1000) % 10; content = content.next; }
    if (content) { content.variant = Math.idiv(steps, 100) % 10; content = content.next; }
    if (content) { content.variant = Math.idiv(steps, 10) % 10; content = content.next; }
    if (content) { content.variant = steps % 10; content = content.next; }

    // 現在の天気、最高気温、最低気温の順にUIマッピング
    if (content) { content.variant = Math.idiv(tempMax, 10); content = content.next; }
    if (content) { content.variant = tempMax % 10; content = content.next; }
    if (content) { content.variant = 10; content = content.next; }
    if (content) { content.variant = Math.idiv(tempMin, 10); content = content.next; }
    if (content) { content.variant = tempMin % 10; content = content.next; }

    // 復元された24時間分の配列をループで安全に適用
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
  keys: ["weather", "temp_max", "temp_min", "weather_codes", "req_weather", "req_health", "HEALTH_STEPS", "HEART_RATE_BPM"], 
  
  onReadable() {
    isPhoneReady = true; 
    const msg = this.read();
    
    msg.forEach((value, key) => {
      if (key === "weather") {
        weatherCurrentCode = value;
      } else if (key === "temp_max") {
        tempMax = value;
      } else if (key === "temp_min") {
        tempMin = value;
      } else if (key === "weather_codes") {
        // 文字列から24個の整数配列へとクリーンに復元
        const strArray = value.split(",");
        weatherHourlyCodes = [];
        for (let i = 0; i < strArray.length; i++) {
          weatherHourlyCodes.push(parseInt(strArray[i], 10));
        }
        console.log("Watch successfully restored 24h data: " + JSON.stringify(weatherHourlyCodes));
      } else if (key === "HEALTH_STEPS") {
        steps = value;
        console.log("Received steps: " + value);
      } else if (key === "HEART_RATE_BPM") {
        console.log("Received heart rate: " + value);
      }
    });

    // 正確な気温と配列が揃った状態で画面を一斉再描画
    app.distribute("onClockChanged", { date: new Date() });
  }
});

export default app;
