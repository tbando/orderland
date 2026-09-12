# Orderland ドキュメント

Orderland は Pebble Time 2 (プラットフォーム名: **emery**) 向けの watchface です。
Pebble SDK (C) と Moddable Alloy ランタイム (組み込み JavaScript) を組み合わせたハイブリッド構成で、
時刻・日付・歩数・気温・24 時間の天気予報ドットを 1 画面に表示します。

## ドキュメント構成

| ファイル | 内容 |
|---|---|
| [architecture.md](./architecture.md) | 3 層アーキテクチャ、ビルド構成、メモリ制約、開発ルール |
| [data-flow.md](./data-flow.md) | AppMessage キー、天気・歩数データの流れ、キャッシュ戦略 |
| [ui-spec.md](./ui-spec.md) | 画面レイアウト、数字デザインのランダム選択ロジック、天気ドット表示 |
| [assets.md](./assets.md) | 画像アセット一覧と生成ツール |

## 概要

- **表示名**: Orderland / **UUID**: `d217355a-7c0d-4663-af1d-710a75f17b52` / **version**: 0.1.0
- **対象プラットフォーム**: emery (Pebble Time 2, 200×228 px カラー液晶) のみ
- **projectType**: `moddable` (`@moddable/pebbleproxy` を使用)、SDK version 3
- **capabilities**: `location` (天気取得用)、`health` (歩数取得用)
- **watchapp**: `watchface: true` (ウォッチフェイスとして動作)

## 画面に表示されるもの

1. **時刻 (HH:MM)** — 60×90 px の大型数字 4 桁。桁ごとに 4 種類のデザインセットから重み付きランダムで選ばれる (本プロジェクトの特徴的な仕様。詳細は [ui-spec.md](./ui-spec.md))
2. **日付** — 月 (英語表記)、日 (2 桁)、曜日 (英語表記)
3. **歩数** — 当日の歩数 5 桁 + "STEP" ラベル
4. **気温** — 当日の最高気温 (赤) / 最低気温 (青)
5. **24 時間天気ドット** — 画面下部に 1 時間ごとの天気を色付きドット列で表示。現在時刻の位置をインジケータで指す
