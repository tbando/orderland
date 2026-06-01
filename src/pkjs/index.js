Pebble.addEventListener('ready', function(e) {
  console.log('pkjs: JS Ready!');
});

Pebble.addEventListener('appmessage', function(e) {
  // Weather request from watch
  if (e.payload.req_weather !== undefined) {
    console.log('pkjs: Received weather request (req_weather)');
    requestLocationAndWeather();
  }

  // Relay health data request from Alloy back to C
  if (e.payload.req_health !== undefined) {
    console.log('pkjs: Relaying req_health to C...');
    Pebble.sendAppMessage(e.payload);
  }

  // Relay health data back to the watch (Alloy JS)
  if (e.payload.HEALTH_STEPS !== undefined || e.payload.HEART_RATE_BPM !== undefined) {
    console.log('pkjs: Relaying health data to Alloy: ' + JSON.stringify(e.payload));
    Pebble.sendAppMessage(e.payload);
  }
});

function requestLocationAndWeather() {
  console.log('pkjs: requestLocationAndWeather() started');
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      console.log('pkjs: Location obtained, fetching weather...');
      fetchWeather(pos.coords.latitude, pos.coords.longitude);
    },
    function(err) {
      console.log('pkjs: Location error, using default coordinates');
      fetchWeather(35.7126, 139.7800);
    },
    { timeout: 15000, maximumAge: 60000 }
  );
}

function mapWeatherCode(wmoCode) {
  var weatherMap = {
    0: 0, 1: 1, 2: 2, 3: 3, 45: 4, 48: 5, 51: 6, 53: 7, 55: 8, 56: 9, 57: 10,
    61: 11, 63: 12, 65: 13, 66: 14, 67: 15, 71: 16, 73: 17, 75: 18, 77: 19,
    80: 20, 81: 21, 82: 22, 85: 23, 86: 24, 95: 25
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

    console.log("pkjs: Fetching URL -> " + url);

    var req = new XMLHttpRequest();
    req.open('GET', url, true);
    
    req.onload = function() {
      if (req.status >= 200 && req.status < 400) {
        try {
          var data = JSON.parse(req.responseText);
          var mappedCurrent = mapWeatherCode(data.current.weather_code);
          var hourlyCodes = data.hourly.weather_code.slice(0, 24).map(mapWeatherCode);
          
          var payload = {
            weather: mappedCurrent, 
            temp_max: Math.round(data.daily.temperature_2m_max[0]),
            temp_min: Math.round(data.daily.temperature_2m_min[0]),
            weather_codes: hourlyCodes.join(",") 
          };

          console.log("pkjs: Sending weather payload to watch...");

          Pebble.sendAppMessage(payload, 
            function() { console.log('pkjs: Weather send success!'); },
            function(err) { console.log('pkjs: Weather send failed: ' + JSON.stringify(err)); }
          );
        } catch (e) {
          console.log("pkjs: JSON parse error: " + e);
        }
      }
    };
    req.send();
  } catch (e) {
    console.log("pkjs: fetchWeather exception: " + e);
  }
}
