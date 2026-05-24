import Poco from "commodetto/Poco";
import Resource from "Resource";
import Bitmap from "commodetto/Bitmap";

const render = new Poco(screen);

const black = render.makeColor(0, 0, 0);
const white = render.makeColor(255, 255, 255);
const red = render.makeColor(255, 0, 0);

// Configuration for digit positions
const TIME_CONFIG = {
    h1: { x: 10, y: 40 },
    h2: { x: 50, y: 40 },
    m1: { x: 100, y: 40 },
    m2: { x: 140, y: 40 }
};

// Attempt to load bitmaps with potential path variations
const digitBitmaps = [];
for (let i = 0; i <= 9; i++) {
    let name = `order_num_${i}`;
    let res = Resource.exists(name) ? Resource.get(name) : null;
    
    // Fallback: try with assets/ prefix if the above fails
    if (!res) {
        name = `assets/order_num_${i}`;
        res = Resource.exists(name) ? Resource.get(name) : null;
    }

    if (res) {
        digitBitmaps.push(new Bitmap(res));
    } else {
        digitBitmaps.push(null);
    }
}

function draw(event) {
    const now = event.date || new Date();

    render.begin();
    
    // 1. Clear screen with black
    render.fillRectangle(black, 0, 0, render.width, render.height);

    // 2. Heartbeat: Draw a small white square at the top-left 
    // to confirm the draw function is actually running
    render.fillRectangle(white, 0, 0, 10, 10);

    const hours = now.getHours();
    const minutes = now.getMinutes();
    const digits = [
        Math.floor(hours / 10),
        hours % 10,
        Math.floor(minutes / 10),
        minutes % 10
    ];
    const configs = [TIME_CONFIG.h1, TIME_CONFIG.h2, TIME_CONFIG.m1, TIME_CONFIG.m2];

    // 3. Draw digits or fallback rectangles
    for (let i = 0; i < 4; i++) {
        const digit = digits[i];
        const config = configs[i];
        const bmp = digitBitmaps[digit];

        if (bmp) {
            render.drawBitmap(bmp, config.x, config.y);
        } else {
            // Fallback: If image fails to load, draw a red rectangle
            // so we know WHERE it's supposed to be
            render.fillRectangle(red, config.x, config.y, 30, 50);
        }
    }

    render.end();
}

// Update every minute
watch.addEventListener("minutechange", draw);

// Initial draw
draw({ date: new Date() });
