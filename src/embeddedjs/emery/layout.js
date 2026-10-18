const digitsTexture = new Texture(`large_digits_40.png`);
const smallDigitsTexture = new Texture(`small_digits.png`);
const monthsTexture = new Texture(`months.png`);
const daysTexture = new Texture(`days.png`);
const labelsTexture = new Texture(`labels.png`);
const indicatorSkin = new Skin({ texture: new Texture(`indicator.png`), width:6, height:4});

let curBg, curHour, curMin, curText, curMax, curMinT;
let bgSkin, hourSkin, minSkin, smallSkin, maxSkin, minTSkin, monthsSkin, daysSkin, labelsSkin;

function syncSkins(s) {
  const hc = s.activeHourColor || s.hourColor;
  const mc = s.activeMinColor || s.minuteColor;
  if (s.bgColor !== curBg) {
    bgSkin = new Skin({ fill: (curBg = s.bgColor) });
  }
  if (hc !== curHour) {
    hourSkin = new Skin({ texture: digitsTexture, width:60, height:90, variants:60, color: (curHour = hc) });
  }
  if (mc !== curMin || (mc === hc && minSkin !== hourSkin)) {
    curMin = mc;
    minSkin = (mc === hc)
      ? hourSkin
      : new Skin({ texture: digitsTexture, width:60, height:90, variants:60, color: mc });
  }
  if (s.textColor !== curText) {
    curText = s.textColor;
    smallSkin = new Skin({ texture: smallDigitsTexture, width:12, height:30, variants:12, color: curText });
    monthsSkin = new Skin({ texture: monthsTexture, width:50, height:30, variants:50, color: curText });
    daysSkin = new Skin({ texture: daysTexture, width:50, height:30, variants:50, color: curText });
    labelsSkin = new Skin({ texture: labelsTexture, width:70, height:30, color: curText });
  }
  if (s.tempMaxColor !== curMax) {
    maxSkin = new Skin({ texture: smallDigitsTexture, width:12, height:30, variants:12, color: (curMax = s.tempMaxColor) });
  }
  if (s.tempMinColor !== curMinT) {
    minTSkin = new Skin({ texture: smallDigitsTexture, width:12, height:30, variants:12, color: (curMinT = s.tempMinColor) });
  }
}

function setSkin(c, skin, vis) {
  if (c.skin !== skin) c.skin = skin;
  if (vis !== undefined && c.visible !== vis) c.visible = vis;
  return c.next;
}

export function applyTimeColors(container, s) {
  syncSkins(s);
  let c = container.first;
  c = setSkin(c, hourSkin);
  c = setSkin(c, hourSkin);
  c = setSkin(c, minSkin);
  setSkin(c, minSkin);
}

export function applyTheme(container, s) {
  syncSkins(s);
  if (container.skin !== bgSkin) container.skin = bgSkin;
  let c = container.first;
  c = setSkin(c, hourSkin);
  c = setSkin(c, hourSkin);
  c = setSkin(c, minSkin);
  c = setSkin(c, minSkin);
  c = setSkin(c, monthsSkin);
  c = setSkin(c, smallSkin);
  c = setSkin(c, smallSkin);
  c = setSkin(c, daysSkin);
  c = setSkin(c, labelsSkin, s.showSteps);
  for (let i = 0; i < 5; i++) c = setSkin(c, smallSkin, s.showSteps);
  c = setSkin(c, maxSkin, s.showWeather);
  c = setSkin(c, maxSkin, s.showWeather);
  c = setSkin(c, smallSkin, s.showWeather);
  c = setSkin(c, minTSkin, s.showWeather);
  c = setSkin(c, minTSkin, s.showWeather);
  for (; c; c = c.next) {
    if (c.visible !== s.showWeather) c.visible = s.showWeather;
  }
}

// --- Weather Dots Color & Pattern Config (Pebble 64-color palette) ---
// Pebble 64-color hex values use 2 bits per RGB channel (00, 55, AA, FF).
// Index 0 is off (black); 1..10 are palette colors.
export const WEATHER_COLORS = [
  null,      //  0: Off (消灯)
  "#FF5500", //  1: GColorOrange         (Clear sky)
  "#FFFFFF", //  2: GColorWhite          (Clouds)
  "#AAAAAA", //  3: GColorLightGray      (Fog)
  "#AA55FF", //  4: GColorLavenderIndigo (Freezing / Rime)
  "#00FFFF", //  5: GColorElectricBlue   (Drizzle)
  "#0055FF", //  6: GColorBlueMoon       (Rain)
  "#AAAAFF", //  7: GColorBabyBlueEyes   (Snow fall / grains)
  "#AAFFFF", //  8: GColorCeleste        (Rain showers)
  "#AAFFAA", //  9: GColorMintGreen      (Snow showers)
  "#FFFF00", // 10: GColorYellow         (Thunderstorm)
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

class WeatherPortBehavior extends Behavior {
  onWeatherChanged(port, codes) {
    this.codes = codes;
    port.invalidate();
  }
  onDraw(port) {
    const codes = this.codes;
    if (!codes) return;
    for (let col = 0; col < 24; col++) {
      const pattern = WEATHER_DOT_PATTERNS[codes.charCodeAt(col) - 65] || 0;
      const x = col * 8;
      for (let row = 0; row < 3; row++) {
        const c = WEATHER_COLORS[(pattern >> (row * 4)) & 0xF];
        if (c) port.fillColor(c, x, 16 - row * 8, 6, 6);
      }
    }
  }
}

const Layout = Container.template($ => {
  syncSkins($);
  return {
    left:0, right:0, top:0, bottom:0, skin:bgSkin,
    contents: [
      // hours
      Content($, { left:0, top:10, skin:hourSkin }),
      Content($, { left:60, top:10, skin:hourSkin }),
      // minutes
      Content($, { left:80, top:100, skin:minSkin }),
      Content($, { left:140, top:100, skin:minSkin }),
      // month
      Content($, { left:150-2, top:10, skin:monthsSkin }),
      // date
      Content($, { left:176-2, top:35, skin:smallSkin }),
      Content($, { left:188-2, top:35, skin:smallSkin }),
      // day
      Content($, { left:150-2, top:60, skin:daysSkin }),
      // step label
      Content($, { left:0+2, top:105, skin:labelsSkin, visible:$.showSteps }),
      // step
      Content($, { left:14*0+2, top:130, skin:smallSkin, visible:$.showSteps }),
      Content($, { left:14*1+2, top:130, skin:smallSkin, visible:$.showSteps }),
      Content($, { left:14*2+2, top:130, skin:smallSkin, visible:$.showSteps }),
      Content($, { left:14*3+2, top:130, skin:smallSkin, visible:$.showSteps }),
      Content($, { left:14*4+2, top:130, skin:smallSkin, visible:$.showSteps }),

      // temp max
      Content($, { left:14*0+2, bottom:10+24, skin:maxSkin, visible:$.showWeather }),
      Content($, { left:14*1+2, bottom:10+24, skin:maxSkin, visible:$.showWeather }),
      Content($, { left:14*2+2, bottom:10+24, skin:smallSkin, visible:$.showWeather }),
      Content($, { left:14*3+2, bottom:10+24, skin:minTSkin, visible:$.showWeather }),
      Content($, { left:14*4+2, bottom:10+24, skin:minTSkin, visible:$.showWeather }),
      // weather dots (custom drawn via Port)
      Port($, { left:5, bottom:5, width:190, height:22, visible:$.showWeather, Behavior:WeatherPortBehavior }),
      
      // indicator
      Content($, { skin:indicatorSkin, visible:$.showWeather }),
    ]
  };
});

export default Layout;
