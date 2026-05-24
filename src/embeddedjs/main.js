import Poco from "commodetto/Poco";
import Resource from "Resource";
import Bitmap from "commodetto/Bitmap";

const render = new Poco(screen);

const black = render.makeColor(0, 0, 0);
const white = render.makeColor(255, 255, 255);
const red = render.makeColor(255, 0, 0);
const blue = render.makeColor(0, 0, 255);

const TIME_CONFIG = {
    h1: { x: 10, y: 50 },
    h2: { x: 50, y: 50 },
    m1: { x: 100, y: 50 },
    m2: { x: 140, y: 50 }
};

const digitBitmaps = [];

// Explicitly load using the keys defined in the manifest object
for (let i = 0; i <= 9; i++) {
    let bmp = null;
    let res = null;
    let key = `n${i}`;

    try {
        res = new Resource(key);
    } catch (e) {
        // Fallback to searching other common patterns if explicit key fails
        const fallbacks = [
            `${key}-color`,
            `${key}-mask`,
            `order_num_${i}`,
            `order_num_${i}-color`
        ];
        for (let f of fallbacks) {
            try {
                res = new Resource(f);
                if (res) break;
            } catch (e2) {}
        }
    }

    if (res) {
        try {
            bmp = new Bitmap(res);
        } catch (e) {
            bmp = "INVALID_BITMAP";
        }
    }

    digitBitmaps.push(bmp);
}

function draw(event) {
    const now = event.date || new Date();

    render.begin();
    render.fillRectangle(black, 0, 0, render.width, render.height);

    const hours = now.getHours();
    const minutes = now.getMinutes();
    const digits = [
        Math.floor(hours / 10),
        hours % 10,
        Math.floor(minutes / 10),
        minutes % 10
    ];
    const configs = [TIME_CONFIG.h1, TIME_CONFIG.h2, TIME_CONFIG.m1, TIME_CONFIG.m2];

    for (let i = 0; i < 4; i++) {
        const digit = digits[i];
        const config = configs[i];
        const bmp = digitBitmaps[digit];

        if (bmp && bmp !== "INVALID_BITMAP") {
            render.drawBitmap(bmp, config.x, config.y);
        } else if (bmp === "INVALID_BITMAP") {
            render.fillRectangle(blue, config.x, config.y, 30, 50);
        } else {
            render.fillRectangle(red, config.x, config.y, 30, 50);
        }
    }

    render.end();
}

watch.addEventListener("minutechange", draw);
draw({ date: new Date() });
