import Poco from "commodetto/Poco";
import Resource from "Resource";
import Bitmap from "commodetto/Bitmap";

const render = new Poco(screen);

// Configuration for digit positions
const TIME_CONFIG = {
    h1: { x: 10, y: 40 },
    h2: { x: 50, y: 40 },
    m1: { x: 100, y: 40 },
    m2: { x: 140, y: 40 }
};

// Load digit bitmaps (moved inside a safe block)
const digitBitmaps = [];
try {
    for (let i = 0; i <= 9; i++) {
        let res = Resource.get(`order_num_${i}`);
        if (res) {
            digitBitmaps.push(new Bitmap(res));
        }
    }
} catch (e) {
    // If loading fails, the array will be short or empty
}

// Fonts for date
let dateFont;
try {
    dateFont = new render.Font("Gothic-Bold", 24);
} catch (e) {}

// Colors
const black = render.makeColor(0, 0, 0);
const white = render.makeColor(255, 255, 255);
const gray = render.makeColor(100, 100, 100);

// Day and month names
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function draw(event) {
    const now = event.date || new Date();

    render.begin();
    
    // Background: Use gray instead of black for debugging to see if drawing works
    render.fillRectangle(gray, 0, 0, render.width, render.height);

    // Get digits
    const hours = now.getHours();
    const minutes = now.getMinutes();

    const h1 = Math.floor(hours / 10);
    const h2 = hours % 10;
    const m1 = Math.floor(minutes / 10);
    const m2 = minutes % 10;

    // Draw digits if they exist
    if (digitBitmaps[h1]) render.drawBitmap(digitBitmaps[h1], TIME_CONFIG.h1.x, TIME_CONFIG.h1.y);
    if (digitBitmaps[h2]) render.drawBitmap(digitBitmaps[h2], TIME_CONFIG.h2.x, TIME_CONFIG.h2.y);
    if (digitBitmaps[m1]) render.drawBitmap(digitBitmaps[m1], TIME_CONFIG.m1.x, TIME_CONFIG.m1.y);
    if (digitBitmaps[m2]) render.drawBitmap(digitBitmaps[m2], TIME_CONFIG.m2.x, TIME_CONFIG.m2.y);

    // Date
    if (dateFont) {
        const dayName = DAYS[now.getDay()];
        const monthName = MONTHS[now.getMonth()];
        const dateStr = `${dayName} ${monthName} ${String(now.getDate()).padStart(2, "0")}`;
        const width = render.getTextWidth(dateStr, dateFont);
        render.drawText(dateStr, dateFont, white, (render.width - width) / 2, render.height - 40);
    }

    render.end();
}

// Update every minute
watch.addEventListener("minutechange", draw);

// Initial draw
draw({ date: new Date() });
