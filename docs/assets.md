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
| `weather_dots.png` | 144×22 | 6×22 | 天気ドット 24 列 (下記参照) | フルカラー |
| `indicator.png` | 6×4 | 6×4 | 現在時刻インジケータ | フルカラー |
| `large_digits.png` | 3000×90 | 60×90 | 5 セット分の大型数字。**マニフェスト未登録の未使用ファイル** (メモリ制約で 4 セット運用のため) | — |

alpha リソースはグレースケール + アルファとしてビルドされ、Skin の `color` プロパティで
実行時に着色される。`weather_dots.png` と `indicator.png` はフルカラーのまま使う。

## weather_dots.png の生成 (misc/)

`misc/weather_dots.py` + `misc/weather_dots.json5` で生成する
(要 Python: `json5`, `Pillow`)。生成物は `src/embeddedjs/assets/weather_dots.png` と同一。

- パラメータ: マスサイズ `a=6`、マス間の透明ギャップ `b=2`、列数 `c=24`
  → 画像サイズは `(a×c) × (3a+2b)` = 144×22
- 各列は下段 A / 中段 B / 上段 C の 3 マスで構成され、json5 の `colors` 配列
  `[A, B, C]` の順に Pebble 公式 64 色 (`GColor*` 名、エイリアス含む全 84 名対応) で指定する
- 点灯マス数が降水などの強度を表す: 下段のみ = 弱、下+中 = 中、3 段 = 強

### 列ごとの配色 (json5 定義)

| 列 | 天気 | 下段 (A) | 中段 (B) | 上段 (C) |
|---|---|---|---|---|
| 0 | Clear Sky | Orange | — | — |
| 1 | Few Clouds | White | — | — |
| 2 | Scattered Clouds | White | White | — |
| 3 | Overcast | White | White | White |
| 4 | Fog | LightGray | — | — |
| 5 | Freezing Fog | LightGray | LavenderIndigo | — |
| 6–8 | Drizzle (弱/中/強) | ElectricBlue ×1〜3 段 | | |
| 9–11 | Rain (弱/中/強) | BlueMoon ×1〜3 段 | | |
| 12 | Light Freezing Drizzle | ElectricBlue | LavenderIndigo | — |
| 13 | Heavy Freezing Drizzle | ElectricBlue | ElectricBlue | ElectricBlue |
| 14–16 | Snow (弱/中/強) | BabyBlueEyes ×1〜3 段 | | |
| 17 | Snow Grains | BabyBlueEyes | — | — |
| 18–20 | Rain Showers (弱/中/強) | Celeste ×1〜3 段 | | |
| 21–22 | Snow Showers (弱/強) | PaleGreen ×1 / ×3 段 | | |
| 23 | Thunderstorm | Yellow | Yellow | Yellow |

「—」は消灯 (黒)。

> **注意**: この列順は pkjs の内部天気コード (0〜25) と index 9 以降で一致していない。
> 詳細は [ui-spec.md](./ui-spec.md) の「既知の制約・課題」を参照。

## その他のファイル

- `resources/images/img/icon.png` (25×25) — Pebble メニューアイコン (`IMAGE_MENU_ICON`)
- `copy_images.py` (リポジトリ直下) — `large_digits.png` を `large_digits_{0..3}.png` に
  複製する旧構成向けの使い捨てスクリプト。現行の単一ファイル 40 variants 構成では未使用
