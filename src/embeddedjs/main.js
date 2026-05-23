import Poco from "commodetto/Poco";
import Resource from "Resource";
import Bitmap from "commodetto/Bitmap";

const render = new Poco(screen);

// Configuration for digit positions (Adjust these as needed)
const TIME_CONFIG = {
    h1: { x: 10, y: 40 }, // Hour tens
    h2: { x: 45, y: 40 }, // Hour units
    m1: { x: 95, y: 40 }, // Minute tens
    m2: { x: 130, y: 40 } // Minute units
};

// Load digit bitmaps
const digitBitmaps = [];
for (let i = 0; i <= 9; i++) {
    digitBitmaps.push(new Bitmap(Resource.get(`order_num_${i}`)));
}

// Fonts for date
const dateFont = new render.Font("Gothic-Bold", 24);

// Colors
const black = render.makeColor(0, 0, 0);
const white = render.makeColor(255, 255, 255);

// Day and month names for date formatting
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function draw(event) {
    const now = event.date;

    render.begin();
    render.fillRectangle(black, 0, 0, render.width, render.height);

    // Get digits for time
    const hours = now.getHours();
    const minutes = now.getMinutes();

    const h1 = Math.floor(hours / 10);
    const h2 = hours % 10;
    const m1 = Math.floor(minutes / 10);
    const m2 = minutes % 10;

    // Draw digits using bitmaps at configured positions
    render.drawBitmap(digitBitmaps[h1], TIME_CONFIG.h1.x, TIME_CONFIG.h1.y);
    render.drawBitmap(digitBitmaps[h2], TIME_CONFIG.h2.x, TIME_CONFIG.h2.y);
    render.drawBitmap(digitBitmaps[m1], TIME_CONFIG.m1.x, TIME_CONFIG.m1.y);
    render.drawBitmap(digitBitmaps[m2], TIME_CONFIG.m2.x, TIME_CONFIG.m2.y);

    // Format date as "Mon Jan 01"
    const dayName = DAYS[now.getDay()];
    const monthName = MONTHS[now.getMonth()];
    const dateStr = `${dayName} ${monthName} ${String(now.getDate()).padStart(2, "0")}`;

    // Draw date below the time (using a fixed position or calculating based on digits)
    const width = render.getTextWidth(dateStr, dateFont);
    render.drawText(dateStr, dateFont, white,
        (render.width - width) / 2,
        render.height - 40);

    render.end();
}

// Update every minute (fires immediately when registered)
watch.addEventListener("minutechange", draw);
