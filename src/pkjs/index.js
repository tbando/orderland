var Clay = require('@rebble/clay');
var clayConfig = require('./config');
var clay = new Clay(clayConfig, null, { autoHandleEvents: false });

function getVal(raw, key, def) {
  var entry = raw && raw[key];
  var v = (entry && typeof entry === 'object' && 'value' in entry) ? entry.value : entry;
  return (v !== undefined && v !== null && v !== '') ? v : def;
}

function toColor6(v, def) {
  var n = def;
  if (typeof v === 'number') {
    n = v;
  } else if (typeof v === 'string' && v.length > 0) {
    var parsed = parseInt(v[0] === '#' ? v.slice(1) : v, 16);
    if (!isNaN(parsed)) n = parsed;
  }
  var r = (((n >> 16) & 0xFF) / 85 + 0.5) | 0;
  var g = (((n >> 8) & 0xFF) / 85 + 0.5) | 0;
  var b = ((n & 0xFF) / 85 + 0.5) | 0;
  return (r << 4) | (g << 2) | b;
}

Pebble.addEventListener('showConfiguration', function() {
  Pebble.openURL(clay.generateUrl());
});

Pebble.addEventListener('webviewclosed', function(e) {
  if (!e || !e.response) return;
  var raw = clay.getSettings(e.response, false);
  var codes = [
    toColor6(getVal(raw, 'BackgroundColor'), 0x000000),
    toColor6(getVal(raw, 'HourColor'), 0xFFFFFF),
    toColor6(getVal(raw, 'MinuteColor'), 0xFFFFFF),
    toColor6(getVal(raw, 'TextColor'), 0xFFFFFF),
    toColor6(getVal(raw, 'TempMaxColor'), 0xFF5500),
    toColor6(getVal(raw, 'TempMinColor'), 0x55AAFF),
    parseInt(getVal(raw, 'WeatherColorMode', 0), 10) || 0,
    getVal(raw, 'TemperatureUnit', false) ? 1 : 0,
    getVal(raw, 'HourFormat', true) ? 1 : 0,
    parseInt(getVal(raw, 'DigitStyle', 0), 10) || 0,
    getVal(raw, 'ShowSteps', true) ? 1 : 0,
    getVal(raw, 'ShowWeather', true) ? 1 : 0
  ];
  var cfg = '';
  for (var i = 0; i < codes.length; i++) {
    cfg += String.fromCharCode(65 + (codes[i] & 0x3F));
  }

  Pebble.sendAppMessage({ CFG: cfg },
    function() { console.log('pkjs: Sent config data to Pebble.'); },
    function(err) { console.log('pkjs: Failed to send config data: ' + JSON.stringify(err)); }
  );
});

Pebble.addEventListener('ready', function(e) {
  console.log('pkjs: JS Ready!');
});

Pebble.addEventListener('appmessage', function(e) {
  // Weather request from watch
  if (e.payload.REQ_WEATHER !== undefined) {
    console.log('pkjs: Received weather request (REQ_WEATHER)');
    requestLocationAndWeather();
  }
});

function requestLocationAndWeather() {
  console.log('pkjs: RequestLocationAndWeather() started');

  // Check localStorage cache (60 minutes) and same date
  var lastTime = localStorage.getItem('LAST_WEATHER_TIME');
  var lastPayload = localStorage.getItem('LAST_WEATHER_PAYLOAD_V3');
  var now = Date.now();

  var isSameDay = false;
  if (lastTime) {
    var lastDate = new Date(parseInt(lastTime, 10));
    var nowDate = new Date(now);
    isSameDay = (lastDate.getDate() === nowDate.getDate());
  }

  if (lastTime && lastPayload && isSameDay && (now - parseInt(lastTime, 10) < 60 * 60 * 1000)) {
    console.log('pkjs: Skipping weather fetch. Using cached weather data (within 60 mins)');
    try {
      var payload = JSON.parse(lastPayload);
      Pebble.sendAppMessage(payload,
        function() { console.log('pkjs: Cached weather send success!'); },
        function(err) { console.log('pkjs: Cached weather send failed: ' + JSON.stringify(err)); }
      );
      return;
    } catch (e) {
      console.log('pkjs: Error parsing cached weather. Fetching fresh data...');
    }
  }

  navigator.geolocation.getCurrentPosition(
    function(pos) {
      console.log('pkjs: Location obtained. Fetching weather...');
      fetchWeather(pos.coords.latitude, pos.coords.longitude);
    },
    function(err) {
      console.log('pkjs: Location error. Using default coordinates...');
      fetchWeather(35.7126, 139.7800);
    },
    { timeout: 15000, maximumAge: 60000 }
  );
}

function mapWeatherCode(wmoCode) {
  // 整形・改行した天気マッピング辞書
  var weatherMap = {
    0: 0,   // Clear sky
    1: 1,   // Mainly clear
    2: 2,   // Partly cloudy
    3: 3,   // Overcast
    45: 4,  // Fog
    48: 5,  // Depositing rime fog
    51: 6,  // Drizzle: Light
    53: 7,  // Drizzle: Moderate
    55: 8,  // Drizzle: Dense intensity
    56: 9,  // Freezing Drizzle: Light
    57: 10, // Freezing Drizzle: Dense intensity
    61: 11, // Rain: Slight
    63: 12, // Rain: Moderate
    65: 13, // Rain: Heavy intensity
    66: 14, // Freezing Rain: Light
    67: 15, // Freezing Rain: Heavy intensity
    71: 16, // Snow fall: Slight
    73: 17, // Snow fall: Moderate
    75: 18, // Snow fall: Heavy intensity
    77: 19, // Snow grains
    80: 20, // Rain showers: Slight
    81: 21, // Rain showers: Moderate
    82: 22, // Rain showers: Violent
    85: 23, // Snow showers: Slight
    86: 24, // Snow showers: Heavy
    95: 25, // Thunderstorm: Slight or moderate
    96: 26, // Thunderstorm with slight hail
    97: 25, // Heavy thunderstorm
    99: 27  // Thunderstorm with heavy hail
  };
  return weatherMap[wmoCode] !== undefined ? weatherMap[wmoCode] : -1;
}

function fetchWeather(latitude, longitude) {
  try {
    var url = "https://api.open-meteo.com/v1/forecast" +
              "?latitude=" + latitude +
              "&longitude=" + longitude +
              "&daily=temperature_2m_max,temperature_2m_min" +
              "&hourly=weather_code" +
              "&timezone=Asia%2FTokyo" +
              "&forecast_days=1";

    console.log('pkjs: Fetching URL -> ' + url);

    var req = new XMLHttpRequest();
    req.open('GET', url, true);
    
    req.onload = function() {
      if (req.status >= 200 && req.status < 400) {
        try {
          var data = JSON.parse(req.responseText);
          var hourlyCodes = data.hourly.weather_code.slice(0, 24).map(mapWeatherCode);
          
          var weatherStr = "";
          for (var i = 0; i < hourlyCodes.length; i++) {
            weatherStr += String.fromCharCode(65 + hourlyCodes[i]);
          }

          var payload = {
            TEMP_MAX: Math.round(data.daily.temperature_2m_max[0]),
            TEMP_MIN: Math.round(data.daily.temperature_2m_min[0]),
            WEATHER_CODES: weatherStr
          };

          console.log('pkjs: Sending weather payload to watch...');

          // Save to cache
          try {
            localStorage.setItem('LAST_WEATHER_TIME', Date.now().toString());
            localStorage.setItem('LAST_WEATHER_PAYLOAD_V3', JSON.stringify(payload));
          } catch (e) {
            console.log('pkjs: Failed to save weather to localStorage: ' + e);
          }

          Pebble.sendAppMessage(payload, 
            function() { console.log('pkjs: Weather send success!'); },
            function(err) { console.log('pkjs: Weather send failed: ' + JSON.stringify(err)); }
          );
        } catch (e) {
          console.log('pkjs: JSON parse error: ' + e);
        }
      }
    };
    req.send();
  } catch (e) {
    console.log('pkjs: FetchWeather exception: ' + e);
  }
}
