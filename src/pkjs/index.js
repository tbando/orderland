Pebble.addEventListener('ready', function(e) {
  console.log('pkjs: JS Ready!');
});

Pebble.addEventListener('appmessage', function(e) {
  if (e.payload.req_weather !== undefined) {
    console.log('pkjs: Received req_weather from watch!');
    requestLocationAndWeather();
  }

  // Relay health data request from Alloy back to C
  if (e.payload.req_health !== undefined) {
    console.log('pkjs: Received req_health from Alloy, relaying to C...');
    Pebble.sendAppMessage(e.payload,
      function() { console.log('pkjs: req_health relay success!'); },
      function(err) { console.log('pkjs: req_health relay failed: ' + JSON.stringify(err)); }
    );
  }

  // Relay health data back to the watch (Alloy JS)
  if (e.payload.HEALTH_STEPS !== undefined || e.payload.HEART_RATE_BPM !== undefined) {
    console.log('pkjs: Relaying health data to Alloy: ' + JSON.stringify(e.payload));
    Pebble.sendAppMessage(e.payload,
      function() { console.log('pkjs: Health relay success!'); },
      function(err) { console.log('pkjs: Health relay failed: ' + JSON.stringify(err)); }
    );
  }
});

function requestLocationAndWeather() {
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      fetchWeather(pos.coords.latitude, pos.coords.longitude);
    },
    function(err) {
      console.log('pkjs: Location error, using default coordinates');
      // GPS失敗時は現在地（東京都台東区）の座標を使用
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

    console.log("pkjs: Requesting URL -> " + url);

    var req = new XMLHttpRequest();
    req.open('GET', url, true);
    
    req.onload = function() {
      if (req.status >= 200 && req.status < 400) {
        try {
          var data = JSON.parse(req.responseText);
          
          var mappedCurrent = mapWeatherCode(data.current.weather_code);
          var hourlyCodes = data.hourly.weather_code.slice(0, 24);
          var mappedHourlyCodes = hourlyCodes.map(function(code) {
            return mapWeatherCode(code);
          });
          
          var payload = {
            weather: mappedCurrent, 
            temp_max: Math.round(data.daily.temperature_2m_max[0]),
            temp_min: Math.round(data.daily.temperature_2m_min[0]),
            // 24個の数値をカンマ区切りの1本の文字列にしてパケット詰まりを防止
            weather_codes: mappedHourlyCodes.join(",") 
          };

          console.log("pkjs: Sending payload -> " + JSON.stringify(payload));

          Pebble.sendAppMessage(payload, 
            function() { console.log('pkjs: Send success!'); },
            function(err) { console.log('pkjs: Send failed: ' + JSON.stringify(err)); }
          );

        } catch (parseError) {
          console.log("pkjs: parse error: " + parseError);
        }
      }
    };
    req.send();
  } catch (e) {
    console.log("pkjs: exception: " + e);
  }
}