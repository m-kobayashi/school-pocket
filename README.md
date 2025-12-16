# スクールポケット (SchoolPocket)

保護者向け学校情報一元管理アプリ

「学校からのプリント、もう失くさない」

## プロジェクト概要

小中学生の保護者向けに、時間割、持ち物、プリント、行事などの学校情報を一元管理できるモバイルアプリです。

## 技術スタック

### フロントエンド
- Flutter 3.x
- Riverpod (状態管理)
- Firebase Authentication (認証)
- Hive (ローカルDB)

### バックエンド
- Cloudflare Workers (TypeScript + Hono)
- Cloudflare D1 (SQLite)
- Cloudflare R2 (画像ストレージ) ※要設定

## 実装済み機能

### Issue #2: ログイン・登録画面
- メール/パスワード認証
- Google Sign-In
- Apple Sign-In (iOS/macOS)

### Issue #3: 子ども管理API
- 子どもCRUD操作
- プラン制限チェック（無料: 1人まで）

### Issue #4: ホーム画面
- 子ども切り替えタブ
- 今日の時間割表示
- 今日の持ち物表示
- 今週の予定表示

### Issue #5: 時間割API + 画面
- 週間時間割表示
- 時間割一括更新API

### Issue #6: 持ち物API + 画面
- 日付別持ち物リスト
- チェック機能

### Issue #7: プリント機能
- プリント管理API
- カテゴリ分類
- 期限管理
- 月間制限（無料: 10枚）
- 画像アップロードAPI (R2連携準備済み)

### Issue #8: カレンダー・行事機能
- 月間カレンダー表示
- 行事登録API

### Issue #9: 設定画面
- ユーザー情報表示
- 子ども一覧表示
- ログアウト機能

## セットアップ

### 1. Firebase設定

```bash
cd app
firebase login
flutterfire configure
```

### 2. Cloudflare Workers設定

```bash
cd api

# D1データベース作成
npx wrangler d1 create school-pocket-db

# wrangler.tomlのdatabase_idを更新

# マイグレーション実行
npx wrangler d1 execute school-pocket-db --local --file=./migrations/0001_initial.sql
npx wrangler d1 execute school-pocket-db --file=./migrations/0001_initial.sql

# デプロイ
npx wrangler deploy
```

### 3. Flutter App設定

```bash
cd app

# パッケージインストール
flutter pub get

# 実行
flutter run
```

## 手動設定が必要な項目

### 1. Cloudflare R2バケット設定

プリント画像保存機能を有効化するには、R2バケットの設定が必要です。

```bash
# R2バケット作成
npx wrangler r2 bucket create school-pocket-images

# wrangler.tomlのコメントを解除して設定
# [[r2_buckets]]
# binding = "IMAGES"
# bucket_name = "school-pocket-images"
```

その後、`api/src/routes/upload.ts`のコメント部分を有効化してください。

### 2. API Base URL設定

`app/lib/config/constants.dart`を編集して、デプロイしたWorkers URLを設定してください。

```dart
static const String apiBaseUrl = 'https://school-pocket-api.YOUR_SUBDOMAIN.workers.dev';
```

### 3. D1 Database ID設定

`api/wrangler.toml`の`database_id`を実際のデータベースIDに更新してください。

```toml
[[d1_databases]]
binding = "DB"
database_name = "school-pocket-db"
database_id = "YOUR_DATABASE_ID"  # ここを更新
```

## プラン制限

### 無料プラン
- 子ども登録: 1人まで
- プリント保存: 月10枚まで

### プレミアムプラン（今後実装予定）
- 子ども登録: 無制限
- プリント保存: 無制限
- 夫婦共有機能
- リマインダー機能

## ディレクトリ構成

```
school-pocket/
├── app/                    # Flutter アプリ
│   ├── lib/
│   │   ├── config/        # 設定
│   │   ├── models/        # データモデル
│   │   ├── providers/     # Riverpod プロバイダー
│   │   ├── services/      # API/認証サービス
│   │   ├── screens/       # 画面
│   │   ├── utils/         # ユーティリティ
│   │   └── main.dart
│   └── pubspec.yaml
│
├── api/                    # Cloudflare Workers
│   ├── src/
│   │   ├── routes/        # APIルート
│   │   ├── middleware/    # 認証ミドルウェア
│   │   └── utils/         # ユーティリティ
│   └── wrangler.toml
│
└── README.md
```

## 開発状況

- [x] Issue #2: ログイン・登録画面UI
- [x] Issue #3: 子ども管理API実装
- [x] Issue #4: ホーム画面（今日の情報）実装
- [x] Issue #5: 時間割API + 画面実装
- [x] Issue #6: 持ち物API + チェック機能実装
- [x] Issue #7: プリント機能（撮影・保存）実装
- [x] Issue #8: カレンダー・行事機能実装
- [x] Issue #9: 設定画面 + 子ども編集実装

## ライセンス

MIT License

## 連絡先

GitHub: [@m-kobayashi](https://github.com/m-kobayashi)
