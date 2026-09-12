# データフロー

## AppMessage キー

`package.json` の `messageKeys` で定義。Watch JS 層の `Message` インスタンスは
入出力とも 512 byte バッファで初期化される。

| キー | 方向 | 型 | 内容 |
|---|---|---|---|
| `REQ_WEATHER` | Watch C → Phone | int8 (1) | 天気取得のリクエストフラグ |
| `TEMP_MAX` | Phone → Watch JS | int | 当日の最高気温 (℃、四捨五入) |
| `TEMP_MIN` | Phone → Watch JS | int | 当日の最低気温 (℃、四捨五入) |
| `WEATHER_CODES` | Phone → Watch JS | string (24 文字) | 1 時間ごとの天気コード。後述のエンコード方式 |

歩数は AppMessage を経由しない (後述のネイティブ Health API で取得)。

## 天気コードのエンコード方式

Watch 側の JS ヒープ・C ヒープを節約するため、24 時間分の天気コード (0〜25) は
JSON 配列やカンマ区切り文字列ではなく、**1 コード = 1 文字の 24 文字文字列**として送る。

- エンコード (Phone 側): `String.fromCharCode(65 + code)` — コード 0 → `"A"`、25 → `"Z"`
- デコード (Watch 側): 描画時に `charCodeAt(i) - 65`
- Watch 側は起動時に `/^[A-Z]{24}$/` で検証し、不正なら全時間 "Clear" (`"AAAA…A"`) にフォールバック

## 天気リクエストのスケジュール (Watch C 層: `weather_request.c`)

| タイミング | 送信内容 |
|---|---|
| 起動 5 秒後 (startup timer。pkjs / Alloy の準備待ち) | `REQ_WEATHER` |
| 毎時 0 分 (`tm_min % 60 == 0`) | `REQ_WEATHER` |

- outbox がビジー (`APP_MSG_OK` 以外) の場合は 2 秒後に 1 回だけリトライ
  (`s_retry_timer` が非 NULL の間は追加スケジュールしない = リトライの多重登録防止)

## 歩数の取得 (Watch JS 層: ネイティブ Health API)

SDK 4.33 / firmware 4.32 以降で利用可能になった `pebble/health` モジュールを使い、
Watch JS 層が描画のたびに歩数を直接読む。C 層・Phone 層は一切関与しない。

```js
import Health from "pebble/health";
const steps = Health.metric.get("step count"); // 当日の歩数
```

- `main.js` の `readSteps()` が try/catch でラップし、取得失敗時
  (エミュレータで health データ未設定、モバイルアプリで Pebble Health 無効など) は 0 を返す
- 毎分の再描画 (`minutechange`) のたびに再取得されるため、表示の遅延は最大 1 分
- さらに `watch.addEventListener("health", ...)` で health イベント
  (significant update / movement など) を受けたら即座に再描画する
- `package.json` の `capabilities` に `health` が必要 (継続)。モバイルアプリ側で
  Pebble Health が有効になっていることが前提

## 天気取得フロー (Phone JS 層: `pkjs/index.js`)

```
REQ_WEATHER 受信
  → キャッシュ判定: LAST_WEATHER_TIME から「60 分以内」かつ「同じ日 (getDate() 比較)」
      ├─ ヒット → LAST_WEATHER_PAYLOAD_V3 をパースしてそのまま Watch へ送信 (API を叩かない)
      └─ ミス  → navigator.geolocation.getCurrentPosition (timeout 15s, maximumAge 60s)
                   ├─ 成功 → その座標で取得
                   └─ 失敗 → デフォルト座標 (35.7126, 139.7800 = 東京) で取得
  → Open-Meteo API (https://api.open-meteo.com/v1/forecast)
       パラメータ: daily=temperature_2m_max,temperature_2m_min
                  hourly=weather_code / current=weather_code
                  timezone=Asia/Tokyo / forecast_days=1
  → WMO 天気コードを内部コード 0〜25 にマッピング → 24 文字にエンコード
  → { TEMP_MAX, TEMP_MIN, WEATHER_CODES } をキャッシュ保存 + Watch へ送信
```

日付が変わった場合は 60 分キャッシュが残っていても再取得する (同日チェックのため)。

### WMO コード → 内部コード対応

| WMO | 内部 | 天気 | | WMO | 内部 | 天気 |
|---|---|---|---|---|---|---|
| 0 | 0 | Clear sky | | 66 | 14 | Freezing Rain: Light |
| 1 | 1 | Mainly clear | | 67 | 15 | Freezing Rain: Heavy |
| 2 | 2 | Partly cloudy | | 71 | 16 | Snow fall: Slight |
| 3 | 3 | Overcast | | 73 | 17 | Snow fall: Moderate |
| 45 | 4 | Fog | | 75 | 18 | Snow fall: Heavy |
| 48 | 5 | Depositing rime fog | | 77 | 19 | Snow grains |
| 51 | 6 | Drizzle: Light | | 80 | 20 | Rain showers: Slight |
| 53 | 7 | Drizzle: Moderate | | 81 | 21 | Rain showers: Moderate |
| 55 | 8 | Drizzle: Dense | | 82 | 22 | Rain showers: Violent |
| 56 | 9 | Freezing Drizzle: Light | | 85 | 23 | Snow showers: Slight |
| 57 | 10 | Freezing Drizzle: Dense | | 86 | 24 | Snow showers: Heavy |
| 61 | 11 | Rain: Slight | | 95 | 25 | Thunderstorm |
| 63 | 12 | Rain: Moderate | | 未定義 | 0 | (Clear にフォールバック) |
| 65 | 13 | Rain: Heavy | | | | |

## localStorage キー一覧

### Phone JS 層 (`pkjs/index.js`)

| キー | 内容 | TTL |
|---|---|---|
| `LAST_WEATHER_TIME` | 最後に天気を取得した時刻 (epoch ms) | — |
| `LAST_WEATHER_PAYLOAD_V3` | 天気ペイロードの JSON キャッシュ | 60 分 かつ 同日 |

### Watch JS 層 (`embeddedjs/main.js`)

再起動直後でも前回値を即座に描画するためのキャッシュ。受信のたびに上書きされる。
歩数はネイティブ API で毎回読むためキャッシュしない。

| キー | 内容 |
|---|---|
| `TEMP_MAX` / `TEMP_MIN` | 最高・最低気温 |
| `WEATHER_CODES` | 24 文字の天気コード文字列 |
| `DESIGN_OFFSETS` | 時刻 4 桁のデザインセット選択状態 (詳細は [ui-spec.md](./ui-spec.md)) |
