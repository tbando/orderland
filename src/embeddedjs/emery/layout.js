const backgroundSkin = new Skin({ fill:"#000000" });

let colorHour = localStorage.getItem("ColorHour") || "#FFFFFF";
let colorMinute = localStorage.getItem("ColorMinute") || "#FFFFFF";
let colorDate = localStorage.getItem("ColorDate") || "#FFFFFF";
let colorSteps = localStorage.getItem("ColorSteps") || "#FFFFFF";

export const largeDigitsTexture = new Texture(`large_digits_40.png`);
export let skinHour = new Skin({ texture: largeDigitsTexture, width:60, height:90, variants:60, color: colorHour });
export let skinMinute = new Skin({ texture: largeDigitsTexture, width:60, height:90, variants:60, color: colorMinute });

export const smallDigitsTexture = new Texture(`small_digits.png`);
export let skinDate = new Skin({ texture: smallDigitsTexture, width:12, height:30, variants:12, color: colorDate });
export let skinStep = new Skin({ texture: smallDigitsTexture, width:12, height:30, variants:12, color: colorSteps });

export const smallRedDigitsSkin = new Skin({ texture: smallDigitsTexture, width:12, height:30, variants:12, color:"#FF5500" });
export const smallBlueDigitsSkin = new Skin({ texture: smallDigitsTexture, width:12, height:30, variants:12, color:"#55AAFF" });

export const monthsTexture = new Texture(`months.png`);
export let skinDateM = new Skin({ texture: monthsTexture, width:50, height:30, variants:50, color: colorDate });

export const daysTexture = new Texture(`days.png`);
export let skinDateD = new Skin({ texture: daysTexture, width:50, height:30, variants:50, color: colorDate });

export const labelsTexture = new Texture(`labels.png`);
export let skinStepL = new Skin({ texture: labelsTexture, width:80, height:30, variants:80, color: colorSteps });
const weatherSkin = new Skin({ texture: new Texture(`weather_dots.png`), width:6, height:6*3+2*2, variants:6});
const indicatorSkin = new Skin({ texture: new Texture(`indicator.png`), width:6, height:4});

const dots = [];

  for (let col = 0; col < 24; col++) {
    dots.push(
      new Content(null, {
        width: 6,
        height: 6,
        bottom: 5,
        left: 5 + col * 8,
        skin: weatherSkin,
        variant: col
      })
    );
  }

const Layout = Container.template($ => ({
	left:0, right:0, top:0, bottom:0, skin:backgroundSkin,
	contents: [
    // hours
    Content($, { left:0, top:10, skin:skinHour }),
    Content($, { left:60, top:10, skin:skinHour }),
    // minutes
    Content($, { left:80, top:100, skin:skinMinute }),
    Content($, { left:140, top:100, skin:skinMinute }),
    // month
    Content($, { left:150-2, top:0, skin:skinDateM }),
    // date
    Content($, { left:176-2, top:25, skin:skinDate }),
    Content($, { left:188-2, top:25, skin:skinDate }),
    // day
    Content($, { left:150-2, top:50, skin:skinDateD }),
    // step label
    Content($, { left:0+2, top:110, skin:skinStepL }),
    // step
    Content($, { left:14*0+2, top:135, skin:skinStep }),
    Content($, { left:14*1+2, top:135, skin:skinStep }),
    Content($, { left:14*2+2, top:135, skin:skinStep }),
    Content($, { left:14*3+2, top:135, skin:skinStep }),
    Content($, { left:14*4+2, top:135, skin:skinStep }),

    // temp max
    Content($, { left:14*0+2, bottom:5+24, skin:smallRedDigitsSkin }),
    Content($, { left:14*1+2, bottom:5+24, skin:smallRedDigitsSkin }),
    Content($, { left:14*2+2, bottom:5+24, skin:smallDigitsSkin }),
    Content($, { left:14*3+2, bottom:5+24, skin:smallBlueDigitsSkin }),
    Content($, { left:14*4+2, bottom:5+24, skin:smallBlueDigitsSkin }),
    // weather dots
    ...dots,
    
    // indicator
    Content($, { skin:indicatorSkin }),
	]
}));

export default Layout;
