import Poco from "commodetto/Poco";
import Resource from "Resource";
import Bitmap from "commodetto/Bitmap";

const render = new Poco(screen);

const black = render.makeColor(0, 0, 0);
const white = render.makeColor(255, 255, 255);
const red = render.makeColor(255, 0, 0);
const blue = render.makeColor(0, 0, 255);
const green = render.makeColor(0, 255, 0);

const TIME_CONFIG = {
    h1: { x: 10, y: 50 },
    h2: { x: 50, y: 50 },
    m1: { x: 100, y: 50 },
    m2: { x: 140, y: 50 }
};

const digitBitmaps = [];

for (let i = 0; i <= 9; i++) {
    let bmp = null;
    let res = null;
    let foundName = null;
    
    // Expanded list of possible internal resource names
    const possibleNames = [
        `order_num_${i}`,
        `order_num_${i}-color`,
        `order_num_${i}-mask`,
        `order_num_${i}-alpha`,
        `assets/order_num_${i}`,
        `assets/order_num_${i}-color`,
        `./assets/order_num_${i}`,
        `order_num_${i}.png`,
        `order_num_${i}.bmp`
    ];

    for (let name of possibleNames) {
        // Try as constructor (Standard Moddable)
        try {
            res = new Resource(name);
            if (res) { foundName = name; break; }
        } catch (e) {}
        
        // Try as static get method (Some Pebble/Alloy environments)
        try {
            if (Resource.get) {
                res = Resource.get(name);
                if (res) { foundName = name; break; }
            }
        } catch (e) {}
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
            // Blue: Resource found, but failed to parse as Bitmap
            render.fillRectangle(blue, config.x, config.y, 30, 50);
        } else {
            // Red: Resource not found with any name
            render.fillRectangle(red, config.x, config.y, 30, 50);
        }
    }

    // Success indicator: draw a tiny green pixel if at least one resource was found
    if (digitBitmaps.some(b => b !== null)) {
        render.fillRectangle(green, 0, 0, 5, 5);
    }

    render.end();
}

watch.addEventListener("minutechange", draw);
draw({ date: new Date() });
