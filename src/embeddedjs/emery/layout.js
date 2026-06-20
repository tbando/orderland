const backgroundSkin = new Skin({ fill:"#000000" });

const smallTex = new Texture(`small_digits.png`);
export const Skins = {
  digits: new Skin({ texture: new Texture(`large_digits_40.png`), width:60, height:90, variants:60, color:"#FFFFFF" }),
  small: new Skin({ texture: smallTex, width:12, height:30, variants:12, color:"#FFFFFF" }),
  sRed: new Skin({ texture: smallTex, width:12, height:30, variants:12, color:"#FF5500" }),
  sBlue: new Skin({ texture: smallTex, width:12, height:30, variants:12, color:"#55AAFF" }),
  months: new Skin({ texture: new Texture(`months.png`), width:50, height:30, variants:50, color:"#FFFFFF" }),
  days: new Skin({ texture: new Texture(`days.png`), width:50, height:30, variants:50, color:"#FFFFFF" }),
  labels: new Skin({ texture: new Texture(`labels.png`), width:80, height:30, variants:80, color:"#FFFFFF" })
};
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
    Content($, { left:0, top:10, skin:Skins.digits }),
    Content($, { left:60, top:10, skin:Skins.digits }),
    // minutes
    Content($, { left:80, top:100, skin:Skins.digits }),
    Content($, { left:140, top:100, skin:Skins.digits }),
    // month
    Content($, { left:150-2, top:0, skin:Skins.months }),
    // date
    Content($, { left:176-2, top:25, skin:Skins.small }),
    Content($, { left:188-2, top:25, skin:Skins.small }),
    // day
    Content($, { left:150-2, top:50, skin:Skins.days }),
    // step label
    Content($, { left:0+2, top:110, skin:Skins.labels }),
    // step
    Content($, { left:14*0+2, top:135, skin:Skins.small }),
    Content($, { left:14*1+2, top:135, skin:Skins.small }),
    Content($, { left:14*2+2, top:135, skin:Skins.small }),
    Content($, { left:14*3+2, top:135, skin:Skins.small }),
    Content($, { left:14*4+2, top:135, skin:Skins.small }),

    // temp max
    Content($, { left:14*0+2, bottom:5+24, skin:Skins.sRed }),
    Content($, { left:14*1+2, bottom:5+24, skin:Skins.sRed }),
    Content($, { left:14*2+2, bottom:5+24, skin:Skins.small }),
    Content($, { left:14*3+2, bottom:5+24, skin:Skins.sBlue }),
    Content($, { left:14*4+2, bottom:5+24, skin:Skins.sBlue }),
    // weather dots
    ...dots,
    
    // indicator
    Content($, { skin:indicatorSkin }),
	]
}));

export default Layout;
