/**
 * 持ち物管理API
 */

import { Hono } from 'hono';
import { getFirebaseUid } from '../middleware/auth';
import { successResponse, validationError, notFoundError, serverError } from '../utils/response';

type Bindings = {
  DB: D1Database;
  FIREBASE_PROJECT_ID: string;
};

const items = new Hono<{ Bindings: Bindings }>();

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
 * 持ち物一覧取得
 * GET /api/children/:childId/items?date=YYYY-MM-DD&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 */
items.get('/children/:childId/items', async (c) => {
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

    const date = c.req.query('date');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    let query = 'SELECT * FROM items WHERE child_id = ?';
    const bindings: any[] = [childId];

    if (date) {
      query += ' AND date = ?';
      bindings.push(date);
    } else if (startDate && endDate) {
      query += ' AND date >= ? AND date <= ?';
      bindings.push(startDate, endDate);
    } else if (startDate) {
      query += ' AND date >= ?';
      bindings.push(startDate);
    } else if (endDate) {
      query += ' AND date <= ?';
      bindings.push(endDate);
    }

    query += ' ORDER BY date ASC, created_at ASC';

    const { results } = await c.env.DB.prepare(query)
      .bind(...bindings)
      .all();

    return successResponse({ items: results || [] });
  } catch (error) {
    console.error('Get items error:', error);
    return serverError('持ち物一覧の取得に失敗しました');
  }
});

/**
 * 持ち物追加
 * POST /api/items
 *
 * Body: { child_id, date, name, notes? }
 */
items.post('/', async (c) => {
  try {
    const firebaseUid = getFirebaseUid(c);
    const userId = await getUserId(c, firebaseUid);

    if (!userId) {
      return notFoundError('ユーザーが見つかりません');
    }

    const body = await c.req.json();
    const { child_id, date, name, notes } = body;

    // バリデーション
    if (!child_id || typeof child_id !== 'string') {
      return validationError('child_idは必須です');
    }
    if (!date || typeof date !== 'string') {
      return validationError('dateは必須です');
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return validationError('持ち物名は必須です');
    }

    // 日付形式チェック（YYYY-MM-DD）
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return validationError('日付はYYYY-MM-DD形式で指定してください');
    }

    // 子どもの所有権確認
    const hasAccess = await verifyChildOwnership(c, userId, child_id);
    if (!hasAccess) {
      return notFoundError('子どもが見つかりません');
    }

    // 持ち物IDを生成
    const itemId = `item_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    // 持ち物を作成
    await c.env.DB.prepare(
      `INSERT INTO items
       (id, child_id, date, name, is_checked, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?)`
    )
      .bind(itemId, child_id, date, name.trim(), notes || null, now, now)
      .run();

    // 作成された持ち物を取得
    const newItem = await c.env.DB.prepare(
      'SELECT * FROM items WHERE id = ?'
    )
      .bind(itemId)
      .first();

    if (!newItem) {
      return serverError('持ち物の作成に失敗しました');
    }

    return successResponse(newItem, 201);
  } catch (error) {
    console.error('Create item error:', error);
    return serverError('持ち物の登録に失敗しました');
  }
});

/**
 * 持ち物更新
 * PUT /api/items/:id
 *
 * Body: { name?, is_checked?, notes? }
 */
items.put('/:id', async (c) => {
  try {
    const firebaseUid = getFirebaseUid(c);
    const userId = await getUserId(c, firebaseUid);

    if (!userId) {
      return notFoundError('ユーザーが見つかりません');
    }

    const itemId = c.req.param('id');

    // 持ち物の存在確認と所有者チェック
    const item = await c.env.DB.prepare(
      `SELECT i.* FROM items i
       INNER JOIN children c ON i.child_id = c.id
       WHERE i.id = ? AND c.user_id = ? AND c.is_active = 1`
    )
      .bind(itemId, userId)
      .first();

    if (!item) {
      return notFoundError('持ち物が見つかりません');
    }

    const body = await c.req.json();
    const { name, is_checked, notes } = body;

    // 更新するフィールドを構築
    const updates: string[] = [];
    const bindings: any[] = [];

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return validationError('持ち物名は必須です');
      }
      updates.push('name = ?');
      bindings.push(name.trim());
    }
    if (is_checked !== undefined) {
      updates.push('is_checked = ?');
      bindings.push(is_checked ? 1 : 0);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      bindings.push(notes || null);
    }

    if (updates.length === 0) {
      return validationError('更新するフィールドが指定されていません');
    }

    updates.push('updated_at = ?');
    bindings.push(new Date().toISOString());
    bindings.push(itemId);

    // 更新実行
    await c.env.DB.prepare(
      `UPDATE items SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...bindings)
      .run();

    // 更新された持ち物を取得
    const updatedItem = await c.env.DB.prepare(
      'SELECT * FROM items WHERE id = ?'
    )
      .bind(itemId)
      .first();

    return successResponse(updatedItem);
  } catch (error) {
    console.error('Update item error:', error);
    return serverError('持ち物の更新に失敗しました');
  }
});

/**
 * 持ち物削除
 * DELETE /api/items/:id
 */
items.delete('/:id', async (c) => {
  try {
    const firebaseUid = getFirebaseUid(c);
    const userId = await getUserId(c, firebaseUid);

    if (!userId) {
      return notFoundError('ユーザーが見つかりません');
    }

    const itemId = c.req.param('id');

    // 持ち物の存在確認と所有者チェック
    const item = await c.env.DB.prepare(
      `SELECT i.* FROM items i
       INNER JOIN children c ON i.child_id = c.id
       WHERE i.id = ? AND c.user_id = ? AND c.is_active = 1`
    )
      .bind(itemId, userId)
      .first();

    if (!item) {
      return notFoundError('持ち物が見つかりません');
    }

    // 削除
    await c.env.DB.prepare(
      'DELETE FROM items WHERE id = ?'
    )
      .bind(itemId)
      .run();

    return successResponse({ message: '持ち物を削除しました' });
  } catch (error) {
    console.error('Delete item error:', error);
    return serverError('持ち物の削除に失敗しました');
  }
});

export default items;
