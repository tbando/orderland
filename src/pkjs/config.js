module.exports = [
  {
    "type": "heading",
    "defaultValue": "Orderland Settings"
  },
  {
    "type": "text",
    "defaultValue": "Customize colors, digit style, and display preferences."
  },
  {
    "type": "section",
    "items": [
      {
        "type": "heading",
        "defaultValue": "Colors"
      },
      {
        "type": "select",
        "messageKey": "WeatherColorMode",
        "defaultValue": "0",
        "label": "Weather-Linked Time Color",
        "description": "Color the time digits dynamically based on the hourly weather color.",
        "options": [
          {
            "label": "Off (Use Manual Colors)",
            "value": "0"
          },
          {
            "label": "Hours & Minutes (Current Hour)",
            "value": "1"
          },
          {
            "label": "Hours Only (Current Hour)",
            "value": "2"
          },
          {
            "label": "Minutes Only (Current Hour)",
            "value": "3"
          },
          {
            "label": "Hours: Current / Minutes: +1h",
            "value": "4"
          }
        ]
      },
      {
        "type": "color",
        "messageKey": "BackgroundColor",
        "defaultValue": "0x000000",
        "label": "Background Color"
      },
      {
        "type": "color",
        "messageKey": "HourColor",
        "defaultValue": "0xFFFFFF",
        "label": "Hour Digits Color"
      },
      {
        "type": "color",
        "messageKey": "MinuteColor",
        "defaultValue": "0xFFFFFF",
        "label": "Minute Digits Color"
      },
      {
        "type": "color",
        "messageKey": "TextColor",
        "defaultValue": "0xFFFFFF",
        "label": "Date & Steps Color"
      },
      {
        "type": "color",
        "messageKey": "TempMaxColor",
        "defaultValue": "0xFF5500",
        "label": "Max Temp Color"
      },
      {
        "type": "color",
        "messageKey": "TempMinColor",
        "defaultValue": "0x55AAFF",
        "label": "Min Temp Color"
      }
    ]
  },
  {
    "type": "section",
    "items": [
      {
        "type": "heading",
        "defaultValue": "Time & Digits"
      },
      {
        "type": "toggle",
        "messageKey": "HourFormat",
        "label": "Use 24-Hour Format",
        "defaultValue": true
      },
      {
        "type": "select",
        "messageKey": "DigitStyle",
        "defaultValue": "0",
        "label": "Digit Design Style",
        "options": [
          {
            "label": "Weighted Random (Default)",
            "value": "0"
          },
          {
            "label": "Equal Random (All 4 Sets)",
            "value": "1"
          },
          {
            "label": "Fixed: Set 1",
            "value": "2"
          },
          {
            "label": "Fixed: Set 2",
            "value": "3"
          },
          {
            "label": "Fixed: Set 3",
            "value": "4"
          },
          {
            "label": "Fixed: Set 4 (Rare)",
            "value": "5"
          }
        ]
      }
    ]
  },
  {
    "type": "section",
    "items": [
      {
        "type": "heading",
        "defaultValue": "Weather & Health"
      },
      {
        "type": "toggle",
        "messageKey": "TemperatureUnit",
        "label": "Use Fahrenheit (°F)",
        "defaultValue": false
      },
      {
        "type": "toggle",
        "messageKey": "ShowSteps",
        "label": "Show Steps",
        "defaultValue": true
      },
      {
        "type": "toggle",
        "messageKey": "ShowWeather",
        "label": "Show Weather",
        "defaultValue": true
      }
    ]
  },
  {
    "type": "submit",
    "defaultValue": "Save Settings"
  }
];
