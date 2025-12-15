# スクールポケット 開発指示書

## プロジェクト概要

**サービス名**: スクールポケット（SchoolPocket）
**概要**: 保護者向け学校情報一元管理アプリ
**ターゲット**: 小中学生の保護者
**コンセプト**: 「学校からのプリント、もう失くさない」

---

## 技術スタック

### フロントエンド
- **Flutter** (iOS/Android クロスプラットフォーム)
- Dart 3.x
- 状態管理: Riverpod
- ローカルDB: Hive（オフライン対応）

### バックエンド
- **Cloudflare Workers** (TypeScript)
- **Cloudflare D1** (SQLite)
- **Cloudflare R2** (画像ストレージ)

### 認証
- **Firebase Authentication**
  - メール/パスワード
  - Google Sign-In
  - Apple Sign-In（iOS必須）

### 課金（MVP後）
- **RevenueCat**

---

## DB設計 (Cloudflare D1)

### users テーブル
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  firebase_uid TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  plan TEXT DEFAULT 'free',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### children テーブル（子ども）
```sql
CREATE TABLE children (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  school_name TEXT,
  grade INTEGER, -- 1〜9（小1〜中3）
  class_name TEXT, -- '1組', 'A組' など
  color TEXT DEFAULT '#4CAF50', -- テーマカラー
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### timetables テーブル（時間割）
```sql
CREATE TABLE timetables (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL, -- 1=月曜〜5=金曜
  period INTEGER NOT NULL, -- 1〜6時限
  subject TEXT NOT NULL,
  teacher TEXT,
  room TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id),
  UNIQUE(child_id, day_of_week, period)
);
```

### items テーブル（持ち物）
```sql
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  is_checked INTEGER DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id)
);
```

### events テーブル（行事）
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  end_date DATE, -- 複数日の場合
  event_type TEXT DEFAULT 'other', -- 'holiday', 'exam', 'event', 'meeting', 'other'
  description TEXT,
  is_all_day INTEGER DEFAULT 1,
  start_time TIME,
  end_time TIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id)
);
```

### prints テーブル（プリント）
```sql
CREATE TABLE prints (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'other', -- 'notice', 'schedule', 'form', 'pta', 'other'
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  captured_at DATETIME NOT NULL,
  deadline DATE, -- 提出期限
  is_archived INTEGER DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id)
);
```

### 行事タイプ (event_type)
| タイプ | 表示名 | アイコン |
|--------|--------|----------|
| holiday | 休日・休校 | 🏖 |
| exam | テスト | 📝 |
| event | 行事 | 🎉 |
| meeting | 保護者会 | 👥 |
| other | その他 | 📌 |

### プリントカテゴリ (category)
| カテゴリ | 表示名 |
|----------|--------|
| notice | お知らせ |
| schedule | 予定表 |
| form | 提出書類 |
| pta | PTA |
| other | その他 |

---

## API設計 (Cloudflare Workers)

### エンドポイント一覧

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/auth/register` | ユーザー登録 |
| GET | `/api/users/me` | ユーザー情報取得 |
| PUT | `/api/users/me` | ユーザー情報更新 |
| GET | `/api/children` | 子ども一覧取得 |
| POST | `/api/children` | 子ども登録 |
| PUT | `/api/children/:id` | 子ども情報更新 |
| DELETE | `/api/children/:id` | 子ども削除 |
| GET | `/api/children/:id/timetable` | 時間割取得 |
| PUT | `/api/children/:id/timetable` | 時間割一括更新 |
| GET | `/api/children/:id/items` | 持ち物一覧 |
| POST | `/api/items` | 持ち物追加 |
| PUT | `/api/items/:id` | 持ち物更新 |
| DELETE | `/api/items/:id` | 持ち物削除 |
| GET | `/api/children/:id/events` | 行事一覧 |
| POST | `/api/events` | 行事追加 |
| PUT | `/api/events/:id` | 行事更新 |
| DELETE | `/api/events/:id` | 行事削除 |
| GET | `/api/children/:id/prints` | プリント一覧 |
| POST | `/api/prints` | プリント追加 |
| PUT | `/api/prints/:id` | プリント更新 |
| DELETE | `/api/prints/:id` | プリント削除 |
| POST | `/api/upload/image` | 画像アップロード |

### リクエスト/レスポンス例

#### PUT /api/children/:id/timetable（時間割一括更新）
```json
// Request
{
  "timetable": [
    { "day_of_week": 1, "period": 1, "subject": "国語" },
    { "day_of_week": 1, "period": 2, "subject": "算数" },
    { "day_of_week": 1, "period": 3, "subject": "体育" },
    { "day_of_week": 1, "period": 4, "subject": "理科" },
    { "day_of_week": 2, "period": 1, "subject": "社会" },
    ...
  ]
}

// Response
{
  "success": true,
  "data": {
    "updated_count": 30
  }
}
```

### 認証
- Firebase ID Token を Authorization ヘッダーで送信
- `Authorization: Bearer <firebase_id_token>`

---

## 画面設計

### 1. ホーム画面（今日の情報）
```
┌─────────────────────────────┐
│ スクールポケット     [設定]  │
├─────────────────────────────┤
│ [太郎 ▼]  小学3年1組        │
├─────────────────────────────┤
│ 📅 1月15日（水）            │
├─────────────────────────────┤
│                             │
│ 📚 今日の時間割             │
│ ┌─────────────────────────┐ │
│ │ 1. 国語                 │ │
│ │ 2. 算数                 │ │
│ │ 3. 体育                 │ │
│ │ 4. 理科                 │ │
│ │ 5. 図工                 │ │
│ │ 6. --                   │ │
│ └─────────────────────────┘ │
│                             │
│ 🎒 今日の持ち物             │
│ ┌─────────────────────────┐ │
│ │ ☑ 体操服                │ │
│ │ ☐ 絵の具セット          │ │
│ │ ☐ 図書の本              │ │
│ │ [+ 追加]                │ │
│ └─────────────────────────┘ │
│                             │
│ 📌 今週の予定               │
│ ┌─────────────────────────┐ │
│ │ 1/17(金) 授業参観       │ │
│ │ 1/20(月) 振替休日       │ │
│ └─────────────────────────┘ │
│                             │
├─────────────────────────────┤
│[ホーム][時間割][プリント][カレンダー]│
└─────────────────────────────┘
```

### 2. 時間割画面
```
┌─────────────────────────────┐
│ ← 時間割            [編集]  │
├─────────────────────────────┤
│ [太郎 ▼]                    │
├─────────────────────────────┤
│     月   火   水   木   金   │
├─────────────────────────────┤
│ 1  国語 社会 算数 理科 国語 │
│ 2  算数 国語 国語 算数 社会 │
│ 3  体育 算数 体育 音楽 理科 │
│ 4  理科 理科 社会 図工 算数 │
│ 5  図工 音楽 総合 図工 道徳 │
│ 6  --   --   クラブ --  --  │
└─────────────────────────────┘
```

### 3. 時間割編集画面
```
┌─────────────────────────────┐
│ ← 時間割を編集      [保存]  │
├─────────────────────────────┤
│                             │
│ 月曜日                      │
│ ┌─────────────────────────┐ │
│ │ 1時限 [国語      ▼]     │ │
│ │ 2時限 [算数      ▼]     │ │
│ │ 3時限 [体育      ▼]     │ │
│ │ 4時限 [理科      ▼]     │ │
│ │ 5時限 [図工      ▼]     │ │
│ │ 6時限 [--        ▼]     │ │
│ └─────────────────────────┘ │
│                             │
│ 火曜日                      │
│ ┌─────────────────────────┐ │
│ │ 1時限 [社会      ▼]     │ │
│ │ ...                     │ │
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

### 4. プリント一覧画面
```
┌─────────────────────────────┐
│ ← プリント          [撮影]  │
├─────────────────────────────┤
│ [すべて ▼] [太郎 ▼]         │
├─────────────────────────────┤
│ 📁 お知らせ (3)             │
│ ┌─────────────────────────┐ │
│ │ 📄 学年だより 1月号     │ │
│ │    1月10日              │ │
│ ├─────────────────────────┤ │
│ │ 📄 給食献立表           │ │
│ │    1月8日               │ │
│ └─────────────────────────┘ │
│                             │
│ 📁 提出書類 (2)             │
│ ┌─────────────────────────┐ │
│ │ 📄 保護者会出欠表 ⚠️    │ │
│ │    期限: 1月18日        │ │
│ ├─────────────────────────┤ │
│ │ 📄 健康調査票           │ │
│ │    期限: 1月20日        │ │
│ └─────────────────────────┘ │
│                             │
│ 📁 PTA (1)                  │
│ ┌─────────────────────────┐ │
│ │ 📄 PTA総会のお知らせ    │ │
│ │    1月5日               │ │
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

### 5. プリント撮影・登録画面
```
┌─────────────────────────────┐
│ ← プリントを追加            │
├─────────────────────────────┤
│                             │
│ ┌─────────────────────────┐ │
│ │                         │ │
│ │      [撮影した画像]      │ │
│ │                         │ │
│ │                         │ │
│ └─────────────────────────┘ │
│ [📷 撮り直し]               │
│                             │
│ タイトル *                  │
│ [                        ]  │
│                             │
│ カテゴリ                    │
│ [お知らせ ▼]                │
│                             │
│ 子ども                      │
│ [太郎 ▼]                    │
│                             │
│ 提出期限                    │
│ [          ]  [なし]        │
│                             │
│ メモ                        │
│ [                        ]  │
│                             │
│      [ 保存する ]           │
│                             │
└─────────────────────────────┘
```

### 6. カレンダー画面
```
┌─────────────────────────────┐
│ ← カレンダー        [追加]  │
├─────────────────────────────┤
│ [太郎 ▼]                    │
├─────────────────────────────┤
│       2025年 1月            │
│  日 月 火 水 木 金 土       │
│           1  2  3  4       │
│   5  6  7  8  9 10 11      │
│  12 13 14 15 16 17●18      │
│  19 20◯21 22 23 24 25      │
│  26 27 28 29 30 31         │
├─────────────────────────────┤
│ ● 行事あり  ◯ 休日         │
├─────────────────────────────┤
│ 1月の予定                   │
│ ┌─────────────────────────┐ │
│ │ 17日(金) 🎉 授業参観    │ │
│ │ 20日(月) 🏖 振替休日    │ │
│ │ 24日(金) 📝 漢字テスト  │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### 7. 設定画面
```
┌─────────────────────────────┐
│ ← 設定                      │
├─────────────────────────────┤
│                             │
│ 子ども                      │
│ ┌─────────────────────────┐ │
│ │ 🟢 太郎 小3-1           │ │
│ │ [編集]                  │ │
│ ├─────────────────────────┤ │
│ │ [+ 子どもを追加] 🔒     │ │
│ │ ※有料プランで追加可能   │ │
│ └─────────────────────────┘ │
│                             │
│ プラン                      │
│ ┌─────────────────────────┐ │
│ │ 無料プラン              │ │
│ │ 子ども1人・プリント10枚/月│
│ │ [プレミアムにアップグレード]│
│ └─────────────────────────┘ │
│                             │
│ 通知（将来）                │
│ ┌─────────────────────────┐ │
│ │ 持ち物リマインド  [OFF] │ │
│ │ 行事リマインド    [OFF] │ │
│ └─────────────────────────┘ │
│                             │
│ アカウント                  │
│ ┌─────────────────────────┐ │
│ │ ログアウト              │ │
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

---

## ディレクトリ構成

```
school-pocket/
├── app/                          # Flutter アプリ
│   ├── lib/
│   │   ├── main.dart
│   │   ├── app.dart
│   │   ├── config/
│   │   │   ├── constants.dart
│   │   │   ├── theme.dart
│   │   │   └── routes.dart
│   │   ├── models/
│   │   │   ├── user.dart
│   │   │   ├── child.dart
│   │   │   ├── timetable.dart
│   │   │   ├── item.dart
│   │   │   ├── event.dart
│   │   │   └── print_doc.dart
│   │   ├── providers/
│   │   │   ├── auth_provider.dart
│   │   │   ├── child_provider.dart
│   │   │   ├── timetable_provider.dart
│   │   │   ├── item_provider.dart
│   │   │   ├── event_provider.dart
│   │   │   └── print_provider.dart
│   │   ├── services/
│   │   │   ├── api_service.dart
│   │   │   ├── auth_service.dart
│   │   │   └── storage_service.dart
│   │   ├── screens/
│   │   │   ├── splash_screen.dart
│   │   │   ├── login_screen.dart
│   │   │   ├── home_screen.dart
│   │   │   ├── timetable_screen.dart
│   │   │   ├── timetable_edit_screen.dart
│   │   │   ├── print_list_screen.dart
│   │   │   ├── print_capture_screen.dart
│   │   │   ├── print_detail_screen.dart
│   │   │   ├── calendar_screen.dart
│   │   │   ├── event_form_screen.dart
│   │   │   ├── settings_screen.dart
│   │   │   └── child_form_screen.dart
│   │   ├── widgets/
│   │   │   ├── child_selector.dart
│   │   │   ├── timetable_grid.dart
│   │   │   ├── item_checkbox.dart
│   │   │   ├── event_card.dart
│   │   │   ├── print_card.dart
│   │   │   ├── calendar_widget.dart
│   │   │   └── category_chip.dart
│   │   └── utils/
│   │       ├── date_utils.dart
│   │       └── subject_list.dart
│   ├── pubspec.yaml
│   └── ...
│
├── api/                          # Cloudflare Workers
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── children.ts
│   │   │   ├── timetables.ts
│   │   │   ├── items.ts
│   │   │   ├── events.ts
│   │   │   ├── prints.ts
│   │   │   └── upload.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── cors.ts
│   │   ├── services/
│   │   │   ├── firebase.ts
│   │   │   └── r2.ts
│   │   └── utils/
│   │       └── response.ts
│   ├── wrangler.toml
│   ├── package.json
│   └── tsconfig.json
│
└── README.md
```

---

## 実装手順

### Phase 1: 環境構築（Day 5 午前）

1. Flutter プロジェクト作成
```bash
flutter create --org com.schoolpocket school_pocket
cd school_pocket
```

2. 必要パッケージ追加 (pubspec.yaml)
```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^2.4.9
  firebase_core: ^2.24.2
  firebase_auth: ^4.16.0
  google_sign_in: ^6.2.1
  sign_in_with_apple: ^5.0.0
  dio: ^5.4.0
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  image_picker: ^1.0.7
  table_calendar: ^3.0.9
  intl: ^0.18.1
  go_router: ^13.1.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.4.8
  hive_generator: ^2.0.1
```

3. Cloudflare Workers プロジェクト作成
```bash
mkdir api && cd api
npm init -y
npm install wrangler typescript @cloudflare/workers-types hono firebase-admin
```

### Phase 2: バックエンド実装（Day 5 午後）

1. D1 データベース作成・マイグレーション
2. Workers API エンドポイント実装
3. Firebase Auth 連携
4. R2 画像アップロード実装

### Phase 3: フロントエンド実装（Day 6）

1. 認証フロー（ログイン/登録）
2. ホーム画面（今日の情報表示）
3. 時間割画面・編集
4. プリント一覧・撮影・登録
5. カレンダー画面
6. 設定画面

### Phase 4: 統合・テスト（Day 6 夜）

1. API連携確認
2. 画像アップロード確認
3. 子ども切り替え確認
4. エラーハンドリング

---

## MVP制限事項

| 項目 | 無料プラン制限 |
|------|---------------|
| 子ども登録 | 1人まで |
| プリント保存 | 月10枚まで |
| 夫婦共有 | 不可 |
| リマインダー | 不可 |
| 広告 | あり |

制限チェックはフロントエンド + バックエンド両方で実装

---

## 教科リスト（プリセット）

```dart
const subjects = [
  '--',
  '国語',
  '算数',
  '数学',
  '理科',
  '社会',
  '英語',
  '外国語',
  '体育',
  '音楽',
  '図工',
  '美術',
  '家庭科',
  '技術',
  '道徳',
  '総合',
  'クラブ',
  '委員会',
  '学活',
  'その他',
];
```

---

## 注意事項

1. **子ども情報の保護**
   - 名前・学校名は暗号化
   - 写真には子どもの顔が映る可能性 → 取り扱い注意

2. **Apple Sign-In必須**
   - iOSでログイン機能を提供する場合は必須

3. **オフライン対応**
   - Hiveにローカル保存
   - オンライン復帰時に同期
   - 画像は要注意（容量）

4. **画像最適化**
   - アップロード前に圧縮（max 1MB）
   - サムネイル生成（一覧用）
   - R2に保存、URLをDBに記録

5. **カレンダーUI**
   - table_calendar パッケージ使用
   - 行事のある日にドット表示

---

## デプロイ

### Cloudflare Workers
```bash
cd api
npx wrangler deploy
```

### Flutter App
```bash
# Android
flutter build appbundle --release

# iOS
flutter build ios --release
```

---

## 成功基準

- [ ] ユーザー登録/ログインできる
- [ ] 子どもを登録できる
- [ ] 時間割を設定・表示できる
- [ ] 持ち物を追加・チェックできる
- [ ] プリントを撮影・保存できる
- [ ] 行事を登録・カレンダー表示できる
- [ ] 子ども1人制限が機能する
- [ ] プリント月10枚制限が機能する
