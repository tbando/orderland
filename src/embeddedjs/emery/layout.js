const backgroundSkin = new Skin({ fill:"#000000" });

export const digitsSkin = new Skin({ texture: new Texture(`large_digits_40.png`), width:60, height:90, variants:60, color:"#FFFFFF" });

const smallDigitsTexture = new Texture(`small_digits.png`);
export const smallDigitsSkin = new Skin({ texture: smallDigitsTexture, width:12, height:30, variants:12, color:"#FFFFFF" });
export const smallRedDigitsSkin = new Skin({ texture: smallDigitsTexture, width:12, height:30, variants:12, color:"#FF5500" });
export const smallBlueDigitsSkin = new Skin({ texture: smallDigitsTexture, width:12, height:30, variants:12, color:"#55AAFF" });
export const monthsSkin = new Skin({ texture: new Texture(`months.png`), width:50, height:30, variants:50, color:"#FFFFFF" });
export const daysSkin = new Skin({ texture: new Texture(`days.png`), width:50, height:30, variants:50, color:"#FFFFFF" });
export const labelsSkin = new Skin({ texture: new Texture(`labels.png`), width:70, height:30, color:"#FFFFFF" });
const indicatorSkin = new Skin({ texture: new Texture(`indicator.png`), width:6, height:4});

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

// 3-tier dot pattern per internal weather code (0..25).
// Hex 0x[Top][Mid][Bot] where each nibble (0x0..0xA) is a WEATHER_COLORS index.
export const WEATHER_DOT_PATTERNS = [
  0x001, //  0 (WMO  0): Clear sky                — Bot: Orange
  0x002, //  1 (WMO  1): Mainly clear             — Bot: White
  0x022, //  2 (WMO  2): Partly cloudy            — Bot/Mid: White
  0x222, //  3 (WMO  3): Overcast                 — All: White
  0x003, //  4 (WMO 45): Fog                      — Bot: LightGray
  0x043, //  5 (WMO 48): Depositing rime fog      — Bot: LightGray, Mid: LavenderIndigo
  0x005, //  6 (WMO 51): Drizzle: Light           — Bot: ElectricBlue
  0x055, //  7 (WMO 53): Drizzle: Moderate        — Bot/Mid: ElectricBlue
  0x555, //  8 (WMO 55): Drizzle: Dense           — All: ElectricBlue
  0x045, //  9 (WMO 56): Freezing Drizzle: Light  — Bot: ElectricBlue, Mid: LavenderIndigo
  0x555, // 10 (WMO 57): Freezing Drizzle: Dense  — All: ElectricBlue
  0x006, // 11 (WMO 61): Rain: Slight             — Bot: BlueMoon
  0x066, // 12 (WMO 63): Rain: Moderate           — Bot/Mid: BlueMoon
  0x666, // 13 (WMO 65): Rain: Heavy              — All: BlueMoon
  0x046, // 14 (WMO 66): Freezing Rain: Light     — Bot: BlueMoon, Mid: LavenderIndigo
  0x466, // 15 (WMO 67): Freezing Rain: Heavy     — Bot/Mid: BlueMoon, Top: LavenderIndigo
  0x007, // 16 (WMO 71): Snow fall: Slight        — Bot: BabyBlueEyes
  0x077, // 17 (WMO 73): Snow fall: Moderate      — Bot/Mid: BabyBlueEyes
  0x777, // 18 (WMO 75): Snow fall: Heavy         — All: BabyBlueEyes
  0x007, // 19 (WMO 77): Snow grains              — Bot: BabyBlueEyes
  0x008, // 20 (WMO 80): Rain showers: Slight     — Bot: Celeste
  0x088, // 21 (WMO 81): Rain showers: Moderate   — Bot/Mid: Celeste
  0x888, // 22 (WMO 82): Rain showers: Violent    — All: Celeste
  0x009, // 23 (WMO 85): Snow showers: Slight     — Bot: MintGreen
  0x999, // 24 (WMO 86): Snow showers: Heavy      — All: MintGreen
  0xAAA, // 25 (WMO 95): Thunderstorm             — All: Yellow
];

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

const Layout = Container.template($ => ({
	left:0, right:0, top:0, bottom:0, skin:backgroundSkin,
	contents: [
    // hours
    Content($, { left:0, top:10, skin:digitsSkin }),
    Content($, { left:60, top:10, skin:digitsSkin }),
    // minutes
    Content($, { left:80, top:100, skin:digitsSkin }),
    Content($, { left:140, top:100, skin:digitsSkin }),
    // month
    Content($, { left:150-2, top:10, skin:monthsSkin }),
    // date
    Content($, { left:176-2, top:35, skin:smallDigitsSkin }),
    Content($, { left:188-2, top:35, skin:smallDigitsSkin }),
    // day
    Content($, { left:150-2, top:60, skin:daysSkin }),
    // step label
    Content($, { left:0+2, top:105, skin:labelsSkin }),
    // step
    Content($, { left:14*0+2, top:130, skin:smallDigitsSkin }),
    Content($, { left:14*1+2, top:130, skin:smallDigitsSkin }),
    Content($, { left:14*2+2, top:130, skin:smallDigitsSkin }),
    Content($, { left:14*3+2, top:130, skin:smallDigitsSkin }),
    Content($, { left:14*4+2, top:130, skin:smallDigitsSkin }),

    // temp max
    Content($, { left:14*0+2, bottom:10+24, skin:smallRedDigitsSkin }),
    Content($, { left:14*1+2, bottom:10+24, skin:smallRedDigitsSkin }),
    Content($, { left:14*2+2, bottom:10+24, skin:smallDigitsSkin }),
    Content($, { left:14*3+2, bottom:10+24, skin:smallBlueDigitsSkin }),
    Content($, { left:14*4+2, bottom:10+24, skin:smallBlueDigitsSkin }),
    // weather dots (custom drawn via Port)
    Port($, { left:5, bottom:5, width:190, height:22, Behavior:WeatherPortBehavior }),
    
    // indicator
    Content($, { skin:indicatorSkin }),
	]
}));

export default Layout;
