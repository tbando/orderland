Pebble.addEventListener('ready', function(e) {
  console.log('pkjs: JS Ready!');
});

Pebble.addEventListener('appmessage', function(e) {
  // Weather request from watch
  if (e.payload.REQ_WEATHER !== undefined) {
    console.log('pkjs: Received weather request (REQ_WEATHER)');
    requestLocationAndWeather();
  }


  // Relay health data back to the watch (Alloy JS)
  if (e.payload.HEALTH_STEPS !== undefined) {
    var now = Date.now();
    var lastHealthTime = localStorage.getItem('LAST_HEALTH_TIME');
    var steps = e.payload.HEALTH_STEPS;

    if (lastHealthTime && (now - parseInt(lastHealthTime, 10) < 10 * 60 * 1000)) {
      console.log('pkjs: Skipping health relay. Using cached health data (within 10 mins). Steps: ' + steps);
    } else {
      console.log('pkjs: Relaying health data to Alloy: ' + JSON.stringify(e.payload));
      try {
        localStorage.setItem('LAST_HEALTH_TIME', now.toString());
      } catch (e) {
        console.log('pkjs: Failed to save health time to localStorage: ' + e);
      }
      Pebble.sendAppMessage(e.payload);
    }
  }
});

function requestLocationAndWeather() {
  console.log('pkjs: RequestLocationAndWeather() started');

  // Check localStorage cache (60 minutes)
  var lastTime = localStorage.getItem('LAST_WEATHER_TIME');
  var lastPayload = localStorage.getItem('LAST_WEATHER_PAYLOAD');
  var now = Date.now();

  if (lastTime && lastPayload && (now - parseInt(lastTime, 10) < 60 * 60 * 1000)) {
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
    95: 25  // Thunderstorm: Slight or moderate
  };
  return weatherMap[wmoCode] !== undefined ? weatherMap[wmoCode] : 0;
}

function fetchWeather(latitude, longitude) {
  try {
    var url = "https://api.open-meteo.com/v1/forecast" +
              "?latitude=" + latitude +
              "&longitude=" + longitude +
              "&daily=temperature_2m_max,temperature_2m_min" +
              "&hourly=weather_code" +
              "&current=weather_code" +
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
            localStorage.setItem('LAST_WEATHER_PAYLOAD', JSON.stringify(payload));
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
