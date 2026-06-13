const backgroundSkin = new Skin({ fill:"#000000" });

// 使用する画像は1枚だけ。variantsを40（10文字×4セット）に設定
const digitsSkin = new Skin({ texture: new Texture(`large_digits.png`), width:60, height:90, variants:60, color:"#FFFFFF" });

const smallDigitsSkin = new Skin({ texture: new Texture(`small_digits.png`), width:12, height:30, variants:12, color:"#FFFFFF" });
const smallRedDigitsSkin = new Skin({ texture: new Texture(`small_digits.png`), width:12, height:30, variants:12, color:"#FF5500" });
const smallBlueDigitsSkin = new Skin({ texture: new Texture(`small_digits.png`), width:12, height:30, variants:12, color:"#55AAFF" });
const monthsSkin = new Skin({ texture: new Texture(`months.png`), width:50, height:30, variants:50, color:"#FFFFFF" });
const daysSkin = new Skin({ texture: new Texture(`days.png`), width:50, height:30, variants:50, color:"#FFFFFF" });
const labelsSkin = new Skin({ texture: new Texture(`labels.png`), width:80, height:30, variants:80, color:"#FFFFFF" });
const weatherSkin = new Skin({ texture: new Texture(`weather_dots.png`), width:6, height:6*3+2*2, variants:6});


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
    Content($, { left:0, top:10, skin:digitsSkin }),
    Content($, { left:60, top:10, skin:digitsSkin }),
    // minutes
    Content($, { left:80, top:100, skin:digitsSkin }),
    Content($, { left:140, top:100, skin:digitsSkin }),
    // month
    Content($, { left:150-2, top:0, skin:monthsSkin }),
    // date
    Content($, { left:176-2, top:25, skin:smallDigitsSkin }),
    Content($, { left:188-2, top:25, skin:smallDigitsSkin }),
    // day
    Content($, { left:150-2, top:50, skin:daysSkin }),
    // step label
    Content($, { left:0+2, top:110, skin:labelsSkin }),
    // step
    Content($, { left:12*0+2, top:135, skin:smallDigitsSkin }),
    Content($, { left:12*1+2, top:135, skin:smallDigitsSkin }),
    Content($, { left:12*2+2, top:135, skin:smallDigitsSkin }),
    Content($, { left:12*3+2, top:135, skin:smallDigitsSkin }),
    Content($, { left:12*4+2, top:135, skin:smallDigitsSkin }),

    // temp max
    Content($, { left:0+2, bottom:5+24, skin:smallRedDigitsSkin }),
    Content($, { left:12+2, bottom:5+24, skin:smallRedDigitsSkin }),
    Content($, { left:24+2, bottom:5+24, skin:smallDigitsSkin }),
    Content($, { left:36+2, bottom:5+24, skin:smallBlueDigitsSkin }),
    Content($, { left:48+2, bottom:5+24, skin:smallBlueDigitsSkin }),
    // weather dots
    ...dots
	]
}));

export default Layout;
