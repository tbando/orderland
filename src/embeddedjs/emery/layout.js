const digitsTexture = new Texture(`large_digits_40.png`);
const smallDigitsTexture = new Texture(`small_digits.png`);
const monthsTexture = new Texture(`months.png`);
const daysTexture = new Texture(`days.png`);
const labelsTexture = new Texture(`labels.png`);

export function toColor(v) {
  return rgb(((v >> 4) & 3) * 85, ((v >> 2) & 3) * 85, (v & 3) * 85);
}

// --- Weather Dots Color & Pattern Config (Pebble 64-color palette) ---
// Pebble 64-color values use 2 bits per RGB channel (00, 55, AA, FF).
// Index 0 is off (0); 1..10 are 32-bit RGBA integers via rgb().
export const WEATHER_COLORS = [
  0,                     //  0: Off (消灯)
  rgb(0xFF, 0x55, 0x00), //  1: GColorOrange         (Clear sky)
  rgb(0xFF, 0xFF, 0xFF), //  2: GColorWhite          (Clouds)
  rgb(0xAA, 0xAA, 0xAA), //  3: GColorLightGray      (Fog)
  rgb(0xAA, 0x55, 0xFF), //  4: GColorLavenderIndigo (Freezing / Rime)
  rgb(0x00, 0xFF, 0xFF), //  5: GColorElectricBlue   (Drizzle)
  rgb(0x00, 0x55, 0xFF), //  6: GColorBlueMoon       (Rain)
  rgb(0xAA, 0xAA, 0xFF), //  7: GColorBabyBlueEyes   (Snow fall / grains)
  rgb(0xAA, 0xFF, 0xFF), //  8: GColorCeleste        (Rain showers)
  rgb(0xAA, 0xFF, 0xAA), //  9: GColorMintGreen      (Snow showers)
  rgb(0xFF, 0xFF, 0x00), // 10: GColorYellow         (Thunderstorm)
];

// 3-tier dot pattern per internal weather code (0..27).
// Hex 0x[Top][Mid][Bot] where each nibble (0x0..0xA) is a WEATHER_COLORS index.
// Out-of-range / undefined codes (-1 = '@') fall back to 0x000 (blank column).
export const WEATHER_DOT_PATTERNS = [
  0x001, //  0 (WMO  0): Clear sky                       — Bot: Orange
  0x002, //  1 (WMO  1): Mainly clear                    — Bot: White
  0x022, //  2 (WMO  2): Partly cloudy                   — Bot/Mid: White
  0x222, //  3 (WMO  3): Overcast                        — All: White
  0x003, //  4 (WMO 45): Fog                             — Bot: LightGray
  0x043, //  5 (WMO 48): Depositing rime fog             — Bot: LightGray, Mid: LavenderIndigo
  0x005, //  6 (WMO 51): Drizzle: Light                  — Bot: ElectricBlue
  0x055, //  7 (WMO 53): Drizzle: Moderate               — Bot/Mid: ElectricBlue
  0x555, //  8 (WMO 55): Drizzle: Dense                  — All: ElectricBlue
  0x045, //  9 (WMO 56): Freezing Drizzle: Light         — Bot: ElectricBlue, Mid: LavenderIndigo
  0x455, // 10 (WMO 57): Freezing Drizzle: Dense         — Bot/Mid: ElectricBlue, Top: LavenderIndigo
  0x006, // 11 (WMO 61): Rain: Slight                    — Bot: BlueMoon
  0x066, // 12 (WMO 63): Rain: Moderate                  — Bot/Mid: BlueMoon
  0x666, // 13 (WMO 65): Rain: Heavy                     — All: BlueMoon
  0x046, // 14 (WMO 66): Freezing Rain: Light            — Bot: BlueMoon, Mid: LavenderIndigo
  0x466, // 15 (WMO 67): Freezing Rain: Heavy            — Bot/Mid: BlueMoon, Top: LavenderIndigo
  0x007, // 16 (WMO 71): Snow fall: Slight               — Bot: BabyBlueEyes
  0x077, // 17 (WMO 73): Snow fall: Moderate             — Bot/Mid: BabyBlueEyes
  0x777, // 18 (WMO 75): Snow fall: Heavy                — All: BabyBlueEyes
  0x007, // 19 (WMO 77): Snow grains                     — Bot: BabyBlueEyes
  0x008, // 20 (WMO 80): Rain showers: Slight            — Bot: Celeste
  0x088, // 21 (WMO 81): Rain showers: Moderate          — Bot/Mid: Celeste
  0x888, // 22 (WMO 82): Rain showers: Violent           — All: Celeste
  0x009, // 23 (WMO 85): Snow showers: Slight            — Bot: MintGreen
  0x999, // 24 (WMO 86): Snow showers: Heavy             — All: MintGreen
  0xAAA, // 25 (WMO 95/97): Thunderstorm                 — All: Yellow
  0x04A, // 26 (WMO 96): Thunderstorm with slight hail   — Bot: Yellow, Mid: LavenderIndigo
  0x4AA, // 27 (WMO 99): Thunderstorm with heavy hail    — Bot/Mid: Yellow, Top: LavenderIndigo
];

export function getWeatherColor(code) {
  return WEATHER_COLORS[(WEATHER_DOT_PATTERNS[code] || 0) & 0xF];
}

const INDICATOR_COLOR = rgb(0x00, 0xFF, 0x00); // GColorGreen

class WatchfacePortBehavior extends Behavior {
  onCreate(port, state) {
    this.state = state;
  }
  onDraw(port) {
    const s = this.state;
    const tc = s.textColor;

    // 1. Background
    port.fillColor(s.bgColor, 0, 0, 200, 228);

    // 2. Hours (H1, H2) & Minutes (M1, M2)
    port.drawTexture(digitsTexture, s.activeHourColor, 0, 10, s.vH1 * 60, 0, 60, 90);
    port.drawTexture(digitsTexture, s.activeHourColor, 60, 10, s.vH2 * 60, 0, 60, 90);
    port.drawTexture(digitsTexture, s.activeMinColor, 80, 100, s.vM1 * 60, 0, 60, 90);
    port.drawTexture(digitsTexture, s.activeMinColor, 140, 100, s.vM2 * 60, 0, 60, 90);

    // 3. Month, Date, Day
    port.drawTexture(monthsTexture, tc, 148, 10, s.month * 50, 0, 50, 30);
    port.drawTexture(smallDigitsTexture, tc, 174, 35, Math.idiv(s.date, 10) * 12, 0, 12, 30);
    port.drawTexture(smallDigitsTexture, tc, 186, 35, (s.date % 10) * 12, 0, 12, 30);
    port.drawTexture(daysTexture, tc, 148, 60, s.day * 50, 0, 50, 30);

    // 4. Steps
    if (s.showSteps) {
      port.drawTexture(labelsTexture, tc, 2, 105, 0, 0, 70, 30);
      let rem = s.steps;
      for (let i = 4; i >= 0; i--) {
        port.drawTexture(smallDigitsTexture, tc, 2 + i * 14, 130, (rem % 10) * 12, 0, 12, 30);
        rem = Math.idiv(rem, 10);
      }
    }

    // 5. Weather (Max/Min Temp + 24h Weather Dots + Current Hour Indicator)
    if (s.showWeather) {
      const dMax = s.dMax;
      const dMin = s.dMin;
      const maxC = s.tempMaxColor;
      const minC = s.tempMinColor;
      port.drawTexture(smallDigitsTexture, maxC, 2, 164, Math.idiv(dMax, 10) * 12, 0, 12, 30);
      port.drawTexture(smallDigitsTexture, maxC, 16, 164, (dMax % 10) * 12, 0, 12, 30);
      port.drawTexture(smallDigitsTexture, tc, 30, 164, 120, 0, 12, 30);
      port.drawTexture(smallDigitsTexture, minC, 44, 164, Math.idiv(dMin, 10) * 12, 0, 12, 30);
      port.drawTexture(smallDigitsTexture, minC, 58, 164, (dMin % 10) * 12, 0, 12, 30);

      const codes = s.codes;
      const hour = s.hour;
      if (hour >= 0) {
        const hx = 5 + hour * 8;
        // Top downward pointer (▼)
        port.fillColor(INDICATOR_COLOR, hx, 194, 6, 2);
        port.fillColor(INDICATOR_COLOR, hx + 1, 196, 4, 1);
        port.fillColor(INDICATOR_COLOR, hx + 2, 197, 2, 1);
        // Bottom underline bar (━)
        port.fillColor(INDICATOR_COLOR, hx, 224, 6, 2);
      }
      for (let col = 0; col < 24; col++) {
        const pattern = codes ? (WEATHER_DOT_PATTERNS[codes.charCodeAt(col) - 65] || 0) : 0;
        const x = 5 + col * 8;
        const isCur = (col === hour);
        for (let row = 0; row < 3; row++) {
          const c = WEATHER_COLORS[(pattern >> (row * 4)) & 0xF];
          const y = 216 - row * 8;
          if (c) {
            port.fillColor(c, x, y, 6, 6);
          } else if (isCur) {
            port.fillColor(INDICATOR_COLOR, x + 2, y + 2, 2, 2);
          }
        }
      }
    }
  }
}

const Layout = Port.template($ => ({
  left: 0, right: 0, top: 0, bottom: 0,
  Behavior: WatchfacePortBehavior,
}));

export default Layout;
