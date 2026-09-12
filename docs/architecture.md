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
| Phone JS | `src/pkjs/index.js` | 天気取得 (Open-Meteo)、キャッシュ管理 |
| Watch JS | `src/embeddedjs/main.js` | アプリ本体。Message 受信、時刻・health イベント処理、variant 更新 |
| Watch JS | `src/embeddedjs/emery/layout.js` | emery 専用の Skin / レイアウト定義 |
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
  `large_digits_40` / `months` / `days` / `small_digits` / `labels` を、
  フルカラー (`*`) として `weather_dots` / `indicator` を登録
- emery 以外のプラットフォームはビルドエラーにしている (`"error": "Platform not supported"`)

## Application 設定 (`main.js`)

```js
new FaceApplication(null, {
  displayListLength: 2048,
  touchCount: 0,               // watchface なのでタッチ無効
  pixels: screen.width * 4,    // 描画バッファ 4 ライン分
});
```

## バッテリー / 低負荷設計

ウェアラブルなので、毎分走るホットパス (`onClockChanged`) を最小コストに保つ。

- **差分描画**: variant / coordinates は値が変わったときだけ代入する
  (Piu は同値代入でも invalidate するため)。毎分の再描画は変化した要素だけに留まる。
  詳細は [ui-spec.md](./ui-spec.md)
- **フラッシュ書き込みの抑制**: `DESIGN_OFFSETS` は内容が前回保存値から変わったときだけ書き込む
- **通信の抑制**: 天気は 60 分周期 + phone 側 60 分キャッシュで API・Bluetooth 通信を最小化。
  歩数はネイティブ `pebble/health` の同期読みで通信ゼロ
- **C 層の仕事は毎時の `REQ_WEATHER` 送信のみ**。毎分の tick では剰余チェック 1 回で即 return する
  (アプリ自体は Watch JS 層の分針更新で毎分起きるため、C 側の購読粒度を粗くしても追加の省電力効果はない)

## メモリ制約 (重要)

- Watch 側のアプリヒープは約 117KB と極めて小さく、現状ほぼ使い切っている
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
