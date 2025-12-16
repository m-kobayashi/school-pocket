# School Pocket API

スクールポケット バックエンドAPI (Cloudflare Workers + D1)

## 技術スタック

- **Cloudflare Workers**: サーバーレスエッジコンピューティング
- **Cloudflare D1**: SQLiteベースのデータベース
- **Hono**: 高速Webフレームワーク
- **Firebase Authentication**: ユーザー認証

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. D1データベースの作成

```bash
# 本番用データベース作成
npx wrangler d1 create school-pocket-db

# ステージング用データベース作成（オプション）
npx wrangler d1 create school-pocket-db-staging
```

作成されたデータベースIDを `wrangler.toml` に設定してください。

### 3. スキーマのマイグレーション

```bash
# 本番用
npx wrangler d1 execute school-pocket-db --file=./schema.sql

# ステージング用（オプション）
npx wrangler d1 execute school-pocket-db-staging --file=./schema.sql
```

### 4. ローカル開発

```bash
# ローカル開発サーバー起動
npm run dev
```

ローカルサーバーは `http://localhost:8787` で起動します。

### 5. デプロイ

```bash
# 本番環境にデプロイ
npm run deploy

# ステージング環境にデプロイ
npx wrangler deploy --env staging
```

## API エンドポイント

### 認証関連

#### ユーザー登録
```
POST /api/auth/register
Authorization: Bearer <firebase_id_token>

Body:
{
  "display_name": "山田太郎" (optional)
}

Response:
{
  "success": true,
  "data": {
    "id": "user_xxx",
    "firebase_uid": "xxx",
    "email": "user@example.com",
    "display_name": "山田太郎",
    "plan": "free",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### ユーザー情報

#### ユーザー情報取得
```
GET /api/users/me
Authorization: Bearer <firebase_id_token>

Response:
{
  "success": true,
  "data": {
    "id": "user_xxx",
    "firebase_uid": "xxx",
    "email": "user@example.com",
    "display_name": "山田太郎",
    "plan": "free",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### ユーザー情報更新
```
PUT /api/users/me
Authorization: Bearer <firebase_id_token>

Body:
{
  "display_name": "山田花子"
}

Response:
{
  "success": true,
  "data": {
    "id": "user_xxx",
    "firebase_uid": "xxx",
    "email": "user@example.com",
    "display_name": "山田花子",
    "plan": "free",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

## 認証

すべてのAPIエンドポイントは、Firebase ID Tokenによる認証が必要です。

リクエストヘッダーに以下を含めてください：

```
Authorization: Bearer <firebase_id_token>
```

## データベーススキーマ

データベーススキーマは `schema.sql` に定義されています。

### テーブル一覧

- **users**: ユーザー情報
- **children**: 子ども情報
- **timetables**: 時間割
- **items**: 持ち物
- **events**: 行事
- **prints**: プリント

詳細は `schema.sql` を参照してください。

## D1データベース操作コマンド

### ローカルでSQLを実行

```bash
npx wrangler d1 execute school-pocket-db --local --command="SELECT * FROM users"
```

### リモート（本番）でSQLを実行

```bash
npx wrangler d1 execute school-pocket-db --command="SELECT * FROM users"
```

### データベースのバックアップ

```bash
npx wrangler d1 export school-pocket-db --output=backup.sql
```

## 開発コマンド

```bash
# 型チェック
npm run typecheck

# Lint
npm run lint

# フォーマット
npm run format

# テスト
npm run test
```

## セキュリティ注意事項

### 本番環境での認証強化

現在の実装は、開発・MVP段階での簡易的なFirebase ID Token検証です。

本番環境では、以下のいずれかの方法で適切な署名検証を実装してください：

1. **Firebase Admin SDK** の使用
   - `firebase-admin` パッケージをWorkers互換のエッジ環境で使用
   - JWKSエンドポイントから公開鍵を取得して検証

2. **JWTライブラリ** の使用
   - `jose` などのJWTライブラリでRS256署名を検証
   - Firebaseの公開鍵を使用

3. **Cloudflare Access** の統合
   - Cloudflare Accessで認証を管理

### 環境変数の管理

`wrangler.toml` には機密情報を含めないでください。

機密情報は Cloudflare Workers Secrets で管理します：

```bash
npx wrangler secret put FIREBASE_PRIVATE_KEY
```

## トラブルシューティング

### D1データベースが見つからない

`wrangler.toml` の `database_id` が正しく設定されているか確認してください。

### 認証エラー

Firebase ID Tokenが有効か、有効期限が切れていないか確認してください。

### CORS エラー

必要に応じて `src/index.ts` のCORS設定を調整してください。

## ライセンス

Private
