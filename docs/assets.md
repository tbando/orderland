# アセット仕様

すべて `src/embeddedjs/assets/` 配下。Skin 定義は `src/embeddedjs/emery/layout.js`。

Moddable の Skin における `variants` は「variant 1 つ分の横方向ピクセルストライド」であり、
描画時に `content.variant = n` とすると画像の `x = n × variants` の位置から切り出される。

## アセット一覧

| ファイル | 画像サイズ | 1 マス | 収録内容 | リソース種別 |
|---|---|---|---|---|
| `large_digits_40.png` | 2400×90 | 60×90 | 大型数字 4 セット × 0〜9 = 40 マス | alpha (白 #FFFFFF を着色) |
| `small_digits.png` | 132×30 | 12×30 | 数字 0〜9 + 区切り記号 (variant 10) = 11 マス | alpha (白 / 赤 #FF5500 / 青 #55AAFF の 3 Skin で共用) |
| `months.png` | 600×30 | 50×30 | 月名 12 マス (variant = `getMonth()`) | alpha |
| `days.png` | 350×30 | 50×30 | 曜日名 7 マス (variant = `getDay()`、0 = 日曜) | alpha |
| `labels.png` | 70×30 | 70×30 | "STEP" ラベル 1 マス | alpha |
| `weather_dots.png` | 144×22 | 6×22 | 旧天気ドット画像。**マニフェスト未登録の未使用ファイル** (現在は `layout.js` の `Port` で直接描画) | — |
| `indicator.png` | 6×4 | 6×4 | 現在時刻インジケータ | フルカラー |
| `large_digits.png` | 3000×90 | 60×90 | 5 セット分の大型数字。**マニフェスト未登録の未使用ファイル** (メモリ制約で 4 セット運用のため) | — |

alpha リソースはグレースケール + アルファとしてビルドされ、Skin の `color` プロパティで
実行時に着色される。`indicator.png` はフルカラーのまま使う。

## 24 時間天気ドットの配色設定 (`src/embeddedjs/emery/layout.js`)

天気ドットは画像ではなく Piu の `Port` (`WeatherPortBehavior.onDraw`) で `port.fillColor` により直接描画される。
配色と段数は `layout.js` 内の `WEATHER_COLORS` (Pebble 公式 64 色パレット: 各 RGB チャネルが `00`, `55`, `AA`, `FF`) と `WEATHER_DOT_PATTERNS` (`0x[上段][中段][下段]` の 12bit ニブル表記、全 26 天気コード対応) で定義されている。

- 1 列あたり横 6 px (8 px ピッチ × 24 列 = 190 px 幅)、縦は 6×6 px の正方形 3 段 + 隙間 2 px = 22 px 高 (`y = 16` 下段、`y = 8` 中段、`y = 0` 上段)
- 点灯マス数が降水などの強度を表す: 下段のみ = 弱、下+中 = 中、3 段 = 強

### 内部天気コード (0〜25) ごとの配色

| コード | WMO | 天気 | 下段 (Bot) | 中段 (Mid) | 上段 (Top) |
|---|---|---|---|---|---|
| 0 | 0 | Clear sky | Orange (`#FF5500`) | — | — |
| 1 | 1 | Mainly clear | White (`#FFFFFF`) | — | — |
| 2 | 2 | Partly cloudy | White (`#FFFFFF`) | White (`#FFFFFF`) | — |
| 3 | 3 | Overcast | White (`#FFFFFF`) | White (`#FFFFFF`) | White (`#FFFFFF`) |
| 4 | 45 | Fog | LightGray (`#AAAAAA`) | — | — |
| 5 | 48 | Depositing rime fog | LightGray (`#AAAAAA`) | LavenderIndigo (`#AA55FF`) | — |
| 6–8 | 51/53/55 | Drizzle (弱/中/強) | ElectricBlue (`#00FFFF`) ×1〜3 段 | | |
| 9 | 56 | Freezing Drizzle: Light | ElectricBlue (`#00FFFF`) | LavenderIndigo (`#AA55FF`) | — |
| 10 | 57 | Freezing Drizzle: Dense | ElectricBlue (`#00FFFF`) ×3 段 | | |
| 11–13 | 61/63/65 | Rain (弱/中/強) | BlueMoon (`#0055FF`) ×1〜3 段 | | |
| 14 | 66 | Freezing Rain: Light | BlueMoon (`#0055FF`) | LavenderIndigo (`#AA55FF`) | — |
| 15 | 67 | Freezing Rain: Heavy | BlueMoon (`#0055FF`) | BlueMoon (`#0055FF`) | LavenderIndigo (`#AA55FF`) |
| 16–18 | 71/73/75 | Snow fall (弱/中/強) | BabyBlueEyes (`#AAAAFF`) ×1〜3 段 | | |
| 19 | 77 | Snow grains | BabyBlueEyes (`#AAAAFF`) | — | — |
| 20–22 | 80/81/82 | Rain showers (弱/中/強) | Celeste (`#AAFFFF`) ×1〜3 段 | | |
| 23–24 | 85/86 | Snow showers (弱/強) | MintGreen (`#AAFFAA`) ×1 / ×3 段 | | |
| 25 | 95 | Thunderstorm | Yellow (`#FFFF00`) ×3 段 | | |

「—」は消灯 (黒)。

## その他のファイル

- `resources/images/img/icon.png` (25×25) — Pebble メニューアイコン (`IMAGE_MENU_ICON`)
- `copy_images.py` (リポジトリ直下) — `large_digits.png` を `large_digits_{0..3}.png` に
  複製する旧構成向けの使い捨てスクリプト。現行の単一ファイル 40 variants 構成では未使用
