# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

**サービス名**: スクールポケット（SchoolPocket）
**概要**: 保護者向け学校情報一元管理アプリ
**詳細仕様**: SPEC.md を参照

## 技術スタック

### フロントエンド (app/)
- Flutter 3.x (Dart)
- 状態管理: flutter_riverpod
- ローカルDB: hive
- HTTPクライアント: dio
- ルーティング: go_router

### バックエンド (api/)
- Cloudflare Workers (TypeScript)
- Cloudflare D1 (SQLite)
- Cloudflare R2 (画像ストレージ)
- APIフレームワーク: hono

### 認証
- Firebase Authentication
- Apple Sign-In（iOS必須）

## 開発コマンド

### Flutter (app/)
```bash
cd app
flutter pub get          # 依存関係インストール
flutter run              # 開発実行
flutter test             # テスト実行
flutter analyze          # 静的解析
flutter build appbundle  # Android リリースビルド
flutter build ios        # iOS リリースビルド
```

### Cloudflare Workers (api/)
```bash
cd api
npm install              # 依存関係インストール
npm run dev              # ローカル開発サーバー
npm test                 # テスト実行
npm run lint             # Lint実行
npx wrangler deploy      # デプロイ
npx wrangler tail        # ログ確認
```

### D1 データベース
```bash
cd api
npx wrangler d1 execute school-pocket-db --local --file=./schema.sql  # ローカル
npx wrangler d1 execute school-pocket-db --file=./schema.sql          # 本番
```

## ディレクトリ構成

```
school-pocket/
├── app/                    # Flutter アプリ
│   ├── lib/
│   │   ├── main.dart
│   │   ├── config/         # 設定・定数
│   │   ├── models/         # データモデル
│   │   ├── providers/      # Riverpod プロバイダ
│   │   ├── services/       # API・認証サービス
│   │   ├── screens/        # 画面
│   │   ├── widgets/        # 共通ウィジェット
│   │   └── utils/          # ユーティリティ
│   └── pubspec.yaml
│
├── api/                    # Cloudflare Workers
│   ├── src/
│   │   ├── index.ts        # エントリポイント
│   │   ├── routes/         # APIルート
│   │   ├── middleware/     # 認証・CORS
│   │   ├── services/       # Firebase・R2連携
│   │   └── utils/          # ユーティリティ
│   ├── wrangler.toml
│   └── package.json
│
├── .github/workflows/      # GitHub Actions
├── CLAUDE.md               # このファイル
├── SPEC.md                 # 詳細仕様
└── README.md
```

## 開発ルール

### オフラインファースト
- 必ずHiveでローカル保存を実装
- API失敗時はローカルデータで継続
- オンライン復帰時に同期

### 子ども情報の保護
- 名前・学校名は暗号化
- 写真には子どもの顔が映る可能性あり → 取り扱い注意

### Apple Sign-In必須
- iOSでログイン機能を提供する場合は必須

### 画像処理
- アップロード前に1MB以下に圧縮
- サムネイル生成（一覧用）
- R2に保存、URLをDBに記録
