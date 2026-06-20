const backgroundSkin = new Skin({ fill:"#000000" });

export const largeDigitsTexture = new Texture(`large_digits_40.png`);
export const smallDigitsTexture = new Texture(`small_digits.png`);
export const monthsTexture = new Texture(`months.png`);
export const daysTexture = new Texture(`days.png`);
export const labelsTexture = new Texture(`labels.png`);

export const smallWhiteDigitsSkin = new Skin({ texture: smallDigitsTexture, width:12, height:30, variants:12, color:"#FFFFFF" });
export const smallRedDigitsSkin = new Skin({ texture: smallDigitsTexture, width:12, height:30, variants:12, color:"#FF5500" });
export const smallBlueDigitsSkin = new Skin({ texture: smallDigitsTexture, width:12, height:30, variants:12, color:"#55AAFF" });
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
    Content($, { left:0, top:10 }),
    Content($, { left:60, top:10 }),
    // minutes
    Content($, { left:80, top:100 }),
    Content($, { left:140, top:100 }),
    // month
    Content($, { left:150-2, top:0 }),
    // date
    Content($, { left:176-2, top:25 }),
    Content($, { left:188-2, top:25 }),
    // day
    Content($, { left:150-2, top:50 }),
    // step label
    Content($, { left:0+2, top:110 }),
    // step
    Content($, { left:14*0+2, top:135 }),
    Content($, { left:14*1+2, top:135 }),
    Content($, { left:14*2+2, top:135 }),
    Content($, { left:14*3+2, top:135 }),
    Content($, { left:14*4+2, top:135 }),

    // temp max
    Content($, { left:14*0+2, bottom:5+24 }),
    Content($, { left:14*1+2, bottom:5+24 }),
    Content($, { left:14*2+2, bottom:5+24 }),
    Content($, { left:14*3+2, bottom:5+24 }),
    Content($, { left:14*4+2, bottom:5+24 }),
    // weather dots
    ...dots,
    
    // indicator
    Content($, { skin:indicatorSkin }),
	]
}));

export default Layout;
