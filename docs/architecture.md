# アーキテクチャ

## 3 層構成

Orderland は 3 つの実行環境にまたがるハイブリッド構成です。

```
┌─────────────────────────── Watch (Pebble Time 2) ───────────────────────────┐
│                                                                             │
│  C 層 (src/c/)                        Watch JS 層 (src/embeddedjs/)          │
│  Pebble SDK                           Moddable Alloy ランタイム               │
│  ─ OS ライフサイクル管理                ─ UI レイアウト・描画 (Piu)              │
│  ─ 天気リクエストの定期トリガー          ─ 時刻・日付・天気・歩数の表示            │
│  ─ moddable_createMachine() で         ─ pebble/health から歩数を直接取得       │
│    Alloy ランタイムを起動               ─ 数字デザインのランダム選択             │
│                                       ─ localStorage による表示キャッシュ      │
│                                                                             │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │ AppMessage
┌────────────────────────────────┴────────────────────────────────────────────┐
│  Phone JS 層 (src/pkjs/) — PebbleKit JS (スマートフォン上で実行)                │
│  ─ REQ_WEATHER を受けて位置情報取得 → Open-Meteo API から天気取得               │
│  ─ localStorage による API キャッシュ                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 各層のファイル

| 層 | ファイル | 役割 |
|---|---|---|
| C | `src/c/mdbl.c` | エントリポイント。Window 生成 → weather request 起動 → Alloy ランタイム起動 |
| C | `src/c/modules/weather_request.{c,h}` | 天気リクエスト (`REQ_WEATHER`) の定期トリガー |
| Phone JS | `src/pkjs/index.js` | Clay 初期化、天気取得 (Open-Meteo)、キャッシュ管理 |
| Phone JS | `src/pkjs/config.js` | `@rebble/clay` による設定画面の定義 (色・12h/24h・摂氏/華氏・数字スタイル・表示切替) |
| Watch JS | `src/embeddedjs/main.js` | アプリ本体。Message 受信 (天気・Clay 設定)、時刻・health イベント処理、variant 更新 |
| Watch JS | `src/embeddedjs/emery/layout.js` | emery 専用の Skin / レイアウト定義・動的テーマ適用 (`applyTheme`) |
| Watch JS | `src/embeddedjs/manifest.json` | Moddable マニフェスト。emery 向けモジュール・リソース定義 |

### 歩数はネイティブ Health API で取得する

SDK 4.33 / firmware 4.32 以降、Alloy (Watch JS 層) から `pebble/health` モジュールで
健康データを直接読めるようになったため、歩数は描画時に `Health.metric.query`
(当日 0 時〜現在の sum) で同期的に取得しています。
`Health.metric.get` はドキュメントに反して実機で常に 0 を返すため使いません
(詳細は [data-flow.md](./data-flow.md))。

かつては C 層 (`HealthService`) → AppMessage → Phone JS 層 → AppMessage → Watch JS 層
という往復リレー (`HEALTH_STEPS` キー + 10 分スロットリング) が必要でしたが、
この経路は撤去済みです。

## Moddable マニフェスト (`src/embeddedjs/manifest.json`)

- モジュール解決: 共通は `./main`、emery では `./emery/layout` を追加
- リソース: `*-alpha` (アルファ付きグレースケール → 実行時に色を乗せる) として
  `large_digits_40` / `months` / `days` / `small_digits` / `labels` を登録
  (24 時間天気ドットと現在時刻インジケータは Piu の `Port` で直接描画するため画像リソース不使用)
- emery 以外のプラットフォームはビルドエラーにしている (`"error": "Platform not supported"`)

## Application 設定 (`main.js`)

```js
new FaceApplication(state, {
  touchCount: 0,               // watchface なのでタッチ無効
});
```

## バッテリー / 低負荷・省メモリ設計

ウェアラブルかつ Moddable XS のヒープ制約 (8KB chunk heap / 512 slots) が厳しいため、毎分・毎時走るパスでの動的メモリ確保とフラッシュ書き込みを最小限に抑える。

- **単一 `Port` による描画 (`WatchfacePortBehavior`)**: `Container`・19 個の `Content`・9 個の `Skin` を廃止し、単一のフルスクリーン `Port` 上で `port.drawTexture` / `port.fillColor` を用いて全要素を描画する。これにより **約 2.2KB の XS chunk heap** と **約 60 個の XS slot** を恒久的に解放し、設定変更時や毎時の `WeatherColorMode` 色変化時にも `new Skin` の動的確保が一切発生しない
- **毎分の動的オブジェクト生成ゼロ**: `onClockChanged` / `readSteps` / `getRandomOffsetForDigit` ではモジュールスコープの `stepQuery`・`digits` 配列およびビットマスク (`usedMask`) を再利用し、毎分の tick で Object / Array / String を一切新規確保しない
- **AppMessage 受信時の即時 `Map` 解放**: `onReadable()` では `msg.get(...)` で値を取り出した直後に `msg.clear(); msg = null;` を呼び、`localStorage.setItem` や `onClockChanged` を実行する前に `Map` のエントリと参照を解放する
- **初回フレームのチラつき防止と不要な再処理の排除**: `onDisplaying` 内で最初のフレームが描画される前に同期的に `this.onClockChanged` を 1 回呼び出し、デフォルトの `00:00` がメニュー復帰時に一瞬表示されるのを防ぐ。直後に非同期発火する `minutechange` 初回コールバックは `if (!isStartup && minutes === lastMinutes && !weatherDirty) return;` で即座にスキップする。また心拍数や歩行イベントで頻繁に発火する `"health"` イベントは購読せず、歩数は毎分の `minutechange` 時に 1 回だけ取得する
- **フラッシュ書き込みの抑制**: `designOffsets` は RAM のみで保持し、毎分の `localStorage` (`SettingsFile`) 書き込みを行わない (毎分書き込むと約 3.8 時間で 8KB の `SettingsFile` が満杯になりコンパクションが走るため)。`TEMP_MAX` / `TEMP_MIN` / `WEATHER_CODES` も現在値から変わったときだけ `localStorage` に書き込む
- **通信の抑制**: 天気は 60 分周期 + phone 側 60 分キャッシュで API・Bluetooth 通信を最小化。
  歩数はネイティブ `pebble/health` の同期読みで通信ゼロ
- **C 層の仕事は毎時の `REQ_WEATHER` 送信のみ**。毎分の tick では剰余チェック 1 回で即 return する

## メモリ制約 (重要)

- Watch 側のアプリヒープは約 122KB、さらに PebbleOS ファームウェア側の Moddable XS ホスト VM は **chunk heap が 8,192 bytes (8KB) 固定**、**slot heap が 512 slots (8KB) 固定** と極めて小さい
- 大型数字アセットを 5 セット (50 variants) 以上にすると `GBitmap` 確保時に
  C ヒープが枯渇し、インストール時・起動時にフリーズ / クラッシュする。
  **4 セット (`large_digits_40.png`) を維持すること**
- JS バイトコードサイズにも制約があるため、Watch JS 層では重いインラインループや
  複雑な分岐を避け、ヘルパーを薄く保つ

## 開発ルール

`.antigravity/rules.md` に定められた運用ルールの要点:

- **BUILD MARKER**: コードを変更したら、デプロイ確認用のビルドマーカーを必ず更新する
  - C 層: `weather_request.c` の `APP_LOG(... "=== BUILD MARKER: VXX_... ===")`
  - Watch JS 層: `main.js` の `console.log("=== BUILD MARKER: VXX_... ===")`
- 仕様・アセット構成・アーキテクチャが変わったら `rules.md` (および本 docs) を同期更新する
- Phone JS 層のログは `'pkjs: '` プレフィックス + 大文字始まり + 終端ピリオド/感嘆符で統一する
