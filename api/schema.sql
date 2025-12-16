-- ================================================================
-- スクールポケット D1 データベーススキーマ
-- ================================================================

-- users テーブル（ユーザー情報）
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  firebase_uid TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  plan TEXT DEFAULT 'free',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_email ON users(email);

-- children テーブル（子ども情報）
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
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_children_user_id ON children(user_id);
CREATE INDEX idx_children_is_active ON children(is_active);

-- timetables テーブル（時間割）
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
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  UNIQUE(child_id, day_of_week, period)
);

CREATE INDEX idx_timetables_child_id ON timetables(child_id);
CREATE INDEX idx_timetables_day_period ON timetables(day_of_week, period);

-- items テーブル（持ち物）
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  is_checked INTEGER DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE INDEX idx_items_child_id ON items(child_id);
CREATE INDEX idx_items_date ON items(date);
CREATE INDEX idx_items_child_date ON items(child_id, date);

-- events テーブル（行事）
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
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE INDEX idx_events_child_id ON events(child_id);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_child_date ON events(child_id, date);
CREATE INDEX idx_events_type ON events(event_type);

-- prints テーブル（プリント）
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
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE INDEX idx_prints_child_id ON prints(child_id);
CREATE INDEX idx_prints_category ON prints(category);
CREATE INDEX idx_prints_captured_at ON prints(captured_at);
CREATE INDEX idx_prints_deadline ON prints(deadline);
CREATE INDEX idx_prints_is_archived ON prints(is_archived);
