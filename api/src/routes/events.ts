/**
 * 行事管理API
 */

import { Hono } from 'hono';
import { getFirebaseUid } from '../middleware/auth';
import { successResponse, validationError, notFoundError, serverError } from '../utils/response';

type Bindings = {
  DB: D1Database;
  FIREBASE_PROJECT_ID: string;
};

const events = new Hono<{ Bindings: Bindings }>();

/**
 * ユーザーIDを取得
 */
async function getUserId(c: any, firebaseUid: string): Promise<string | null> {
  const user = await c.env.DB.prepare(
    'SELECT id FROM users WHERE firebase_uid = ?'
  )
    .bind(firebaseUid)
    .first();

  return user ? user.id as string : null;
}

/**
 * 子どもの所有権確認
 */
async function verifyChildOwnership(c: any, userId: string, childId: string): Promise<boolean> {
  const child = await c.env.DB.prepare(
    'SELECT id FROM children WHERE id = ? AND user_id = ? AND is_active = 1'
  )
    .bind(childId, userId)
    .first();

  return !!child;
}

/**
 * 行事一覧取得
 * GET /api/children/:childId/events?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 */
events.get('/children/:childId/events', async (c) => {
  try {
    const firebaseUid = getFirebaseUid(c);
    const userId = await getUserId(c, firebaseUid);

    if (!userId) {
      return notFoundError('ユーザーが見つかりません');
    }

    const childId = c.req.param('childId');

    // 子どもの所有権確認
    const hasAccess = await verifyChildOwnership(c, userId, childId);
    if (!hasAccess) {
      return notFoundError('子どもが見つかりません');
    }

    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    let query = 'SELECT * FROM events WHERE child_id = ?';
    const bindings: any[] = [childId];

    if (startDate && endDate) {
      // 開始日 <= end_date AND 終了日 >= start_date で範囲検索
      query += ' AND date <= ? AND (end_date >= ? OR end_date IS NULL)';
      bindings.push(endDate, startDate);
    } else if (startDate) {
      query += ' AND (date >= ? OR end_date >= ?)';
      bindings.push(startDate, startDate);
    } else if (endDate) {
      query += ' AND date <= ?';
      bindings.push(endDate);
    }

    query += ' ORDER BY date ASC, start_time ASC';

    const { results } = await c.env.DB.prepare(query)
      .bind(...bindings)
      .all();

    return successResponse({ events: results || [] });
  } catch (error) {
    console.error('Get events error:', error);
    return serverError('行事一覧の取得に失敗しました');
  }
});

/**
 * 行事追加
 * POST /api/events
 *
 * Body: {
 *   child_id,
 *   title,
 *   date,
 *   end_date?,
 *   event_type?,
 *   description?,
 *   is_all_day?,
 *   start_time?,
 *   end_time?
 * }
 */
events.post('/', async (c) => {
  try {
    const firebaseUid = getFirebaseUid(c);
    const userId = await getUserId(c, firebaseUid);

    if (!userId) {
      return notFoundError('ユーザーが見つかりません');
    }

    const body = await c.req.json();
    const {
      child_id,
      title,
      date,
      end_date,
      event_type,
      description,
      is_all_day,
      start_time,
      end_time
    } = body;

    // バリデーション
    if (!child_id || typeof child_id !== 'string') {
      return validationError('child_idは必須です');
    }
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return validationError('タイトルは必須です');
    }
    if (!date || typeof date !== 'string') {
      return validationError('日付は必須です');
    }

    // 日付形式チェック
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return validationError('日付はYYYY-MM-DD形式で指定してください');
    }
    if (end_date && !dateRegex.test(end_date)) {
      return validationError('終了日付はYYYY-MM-DD形式で指定してください');
    }

    // イベントタイプのバリデーション
    const validEventTypes = ['holiday', 'exam', 'event', 'meeting', 'other'];
    const eventType = event_type || 'other';
    if (!validEventTypes.includes(eventType)) {
      return validationError('event_typeは holiday, exam, event, meeting, other のいずれかである必要があります');
    }

    // 子どもの所有権確認
    const hasAccess = await verifyChildOwnership(c, userId, child_id);
    if (!hasAccess) {
      return notFoundError('子どもが見つかりません');
    }

    // 行事IDを生成
    const eventId = `event_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    // 行事を作成
    await c.env.DB.prepare(
      `INSERT INTO events
       (id, child_id, title, date, end_date, event_type, description, is_all_day, start_time, end_time, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        eventId,
        child_id,
        title.trim(),
        date,
        end_date || null,
        eventType,
        description || null,
        is_all_day !== undefined ? (is_all_day ? 1 : 0) : 1,
        start_time || null,
        end_time || null,
        now,
        now
      )
      .run();

    // 作成された行事を取得
    const newEvent = await c.env.DB.prepare(
      'SELECT * FROM events WHERE id = ?'
    )
      .bind(eventId)
      .first();

    if (!newEvent) {
      return serverError('行事の作成に失敗しました');
    }

    return successResponse(newEvent, 201);
  } catch (error) {
    console.error('Create event error:', error);
    return serverError('行事の登録に失敗しました');
  }
});

/**
 * 行事更新
 * PUT /api/events/:id
 */
events.put('/:id', async (c) => {
  try {
    const firebaseUid = getFirebaseUid(c);
    const userId = await getUserId(c, firebaseUid);

    if (!userId) {
      return notFoundError('ユーザーが見つかりません');
    }

    const eventId = c.req.param('id');

    // 行事の存在確認と所有者チェック
    const event = await c.env.DB.prepare(
      `SELECT e.* FROM events e
       INNER JOIN children c ON e.child_id = c.id
       WHERE e.id = ? AND c.user_id = ? AND c.is_active = 1`
    )
      .bind(eventId, userId)
      .first();

    if (!event) {
      return notFoundError('行事が見つかりません');
    }

    const body = await c.req.json();
    const {
      title,
      date,
      end_date,
      event_type,
      description,
      is_all_day,
      start_time,
      end_time
    } = body;

    // 更新するフィールドを構築
    const updates: string[] = [];
    const bindings: any[] = [];

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return validationError('タイトルは必須です');
      }
      updates.push('title = ?');
      bindings.push(title.trim());
    }
    if (date !== undefined) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return validationError('日付はYYYY-MM-DD形式で指定してください');
      }
      updates.push('date = ?');
      bindings.push(date);
    }
    if (end_date !== undefined) {
      if (end_date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(end_date)) {
          return validationError('終了日付はYYYY-MM-DD形式で指定してください');
        }
      }
      updates.push('end_date = ?');
      bindings.push(end_date || null);
    }
    if (event_type !== undefined) {
      const validEventTypes = ['holiday', 'exam', 'event', 'meeting', 'other'];
      if (!validEventTypes.includes(event_type)) {
        return validationError('event_typeは holiday, exam, event, meeting, other のいずれかである必要があります');
      }
      updates.push('event_type = ?');
      bindings.push(event_type);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      bindings.push(description || null);
    }
    if (is_all_day !== undefined) {
      updates.push('is_all_day = ?');
      bindings.push(is_all_day ? 1 : 0);
    }
    if (start_time !== undefined) {
      updates.push('start_time = ?');
      bindings.push(start_time || null);
    }
    if (end_time !== undefined) {
      updates.push('end_time = ?');
      bindings.push(end_time || null);
    }

    if (updates.length === 0) {
      return validationError('更新するフィールドが指定されていません');
    }

    updates.push('updated_at = ?');
    bindings.push(new Date().toISOString());
    bindings.push(eventId);

    // 更新実行
    await c.env.DB.prepare(
      `UPDATE events SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...bindings)
      .run();

    // 更新された行事を取得
    const updatedEvent = await c.env.DB.prepare(
      'SELECT * FROM events WHERE id = ?'
    )
      .bind(eventId)
      .first();

    return successResponse(updatedEvent);
  } catch (error) {
    console.error('Update event error:', error);
    return serverError('行事の更新に失敗しました');
  }
});

/**
 * 行事削除
 * DELETE /api/events/:id
 */
events.delete('/:id', async (c) => {
  try {
    const firebaseUid = getFirebaseUid(c);
    const userId = await getUserId(c, firebaseUid);

    if (!userId) {
      return notFoundError('ユーザーが見つかりません');
    }

    const eventId = c.req.param('id');

    // 行事の存在確認と所有者チェック
    const event = await c.env.DB.prepare(
      `SELECT e.* FROM events e
       INNER JOIN children c ON e.child_id = c.id
       WHERE e.id = ? AND c.user_id = ? AND c.is_active = 1`
    )
      .bind(eventId, userId)
      .first();

    if (!event) {
      return notFoundError('行事が見つかりません');
    }

    // 削除
    await c.env.DB.prepare(
      'DELETE FROM events WHERE id = ?'
    )
      .bind(eventId)
      .run();

    return successResponse({ message: '行事を削除しました' });
  } catch (error) {
    console.error('Delete event error:', error);
    return serverError('行事の削除に失敗しました');
  }
});

export default events;
