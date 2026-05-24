import Poco from "commodetto/Poco";
import Resource from "Resource";
import Bitmap from "commodetto/Bitmap";

const render = new Poco(screen);

const black = render.makeColor(0, 0, 0);
const white = render.makeColor(255, 255, 255);
const yellow = render.makeColor(255, 255, 0);

// Configuration for digit positions
const TIME_CONFIG = {
    h1: { x: 10, y: 40 },
    h2: { x: 50, y: 40 },
    m1: { x: 100, y: 40 },
    m2: { x: 140, y: 40 }
};

// Load digit bitmaps using the standard constructor
const digitBitmaps = [];
for (let i = 0; i <= 9; i++) {
    try {
        // Standard Moddable resource access
        let res = new Resource(`order_num_${i}`);
        digitBitmaps.push(new Bitmap(res));
    } catch (e) {
        digitBitmaps.push(null);
    }
}

function draw(event) {
    const now = event.date || new Date();

    render.begin();
    
    // 1. Fill with Yellow background (Very visible if it works)
    render.fillRectangle(yellow, 0, 0, render.width, render.height);

    // 2. Draw a black rectangle in the center to confirm rendering
    render.fillRectangle(black, 20, 20, render.width - 40, render.height - 40);

    const hours = now.getHours();
    const minutes = now.getMinutes();
    const digits = [
        Math.floor(hours / 10),
        hours % 10,
        Math.floor(minutes / 10),
        minutes % 10
    ];
    const configs = [TIME_CONFIG.h1, TIME_CONFIG.h2, TIME_CONFIG.m1, TIME_CONFIG.m2];

    // 3. Draw digits
    for (let i = 0; i < 4; i++) {
        const digit = digits[i];
        const config = configs[i];
        const bmp = digitBitmaps[digit];

        if (bmp) {
            render.drawBitmap(bmp, config.x, config.y);
        } else {
            // Draw a white small box as fallback for missing image
            render.fillRectangle(white, config.x, config.y, 20, 30);
        }
    }

    render.end();
}

// Update every minute
watch.addEventListener("minutechange", draw);

// Initial draw
draw({ date: new Date() });
