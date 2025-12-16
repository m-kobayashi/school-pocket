/**
 * プリント管理API
 */

import { Hono } from 'hono';
import { getFirebaseUid } from '../middleware/auth';
import { successResponse, validationError, notFoundError, serverError } from '../utils/response';

type Bindings = {
  DB: D1Database;
  FIREBASE_PROJECT_ID: string;
  // IMAGES: R2Bucket;
};

const prints = new Hono<{ Bindings: Bindings }>();

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
 * プラン制限チェック（プリント月間上限）
 */
async function checkPrintLimit(c: any, userId: string): Promise<{ canAdd: boolean; plan: string; currentCount: number; limit: number }> {
  const user = await c.env.DB.prepare(
    'SELECT plan FROM users WHERE id = ?'
  )
    .bind(userId)
    .first();

  if (!user) {
    return { canAdd: false, plan: 'free', currentCount: 0, limit: 10 };
  }

  const plan = user.plan as string;

  // 今月のプリント数をカウント
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const result = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM prints p
     INNER JOIN children c ON p.child_id = c.id
     WHERE c.user_id = ?
     AND DATE(p.created_at) >= ?
     AND DATE(p.created_at) <= ?
     AND p.is_archived = 0`
  )
    .bind(userId, firstDayOfMonth, lastDayOfMonth)
    .first();

  const currentCount = result ? Number(result.count) : 0;

  // 無料プランは月10枚まで
  const limit = plan === 'free' ? 10 : 999999;
  const canAdd = currentCount < limit;

  return { canAdd, plan, currentCount, limit };
}

/**
 * プリント一覧取得
 * GET /api/children/:childId/prints?category=notice&is_archived=0
 */
prints.get('/children/:childId/prints', async (c) => {
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

    const category = c.req.query('category');
    const isArchived = c.req.query('is_archived');

    let query = 'SELECT * FROM prints WHERE child_id = ?';
    const bindings: any[] = [childId];

    if (category) {
      query += ' AND category = ?';
      bindings.push(category);
    }

    if (isArchived !== undefined) {
      query += ' AND is_archived = ?';
      bindings.push(isArchived === '1' ? 1 : 0);
    }

    query += ' ORDER BY captured_at DESC, created_at DESC';

    const { results } = await c.env.DB.prepare(query)
      .bind(...bindings)
      .all();

    return successResponse({ prints: results || [] });
  } catch (error) {
    console.error('Get prints error:', error);
    return serverError('プリント一覧の取得に失敗しました');
  }
});

/**
 * プリント追加
 * POST /api/prints
 *
 * Body: {
 *   child_id,
 *   title,
 *   category,
 *   image_url,
 *   thumbnail_url?,
 *   captured_at?,
 *   deadline?,
 *   notes?
 * }
 */
prints.post('/', async (c) => {
  try {
    const firebaseUid = getFirebaseUid(c);
    const userId = await getUserId(c, firebaseUid);

    if (!userId) {
      return notFoundError('ユーザーが見つかりません');
    }

    // プリント月間制限チェック
    const { canAdd, plan, currentCount, limit } = await checkPrintLimit(c, userId);
    if (!canAdd) {
      return validationError(
        `${plan}プランでは月${limit}枚までしかプリントを保存できません（現在: ${currentCount}枚）`,
        { plan, currentCount, limit }
      );
    }

    const body = await c.req.json();
    const {
      child_id,
      title,
      category,
      image_url,
      thumbnail_url,
      captured_at,
      deadline,
      notes
    } = body;

    // バリデーション
    if (!child_id || typeof child_id !== 'string') {
      return validationError('child_idは必須です');
    }
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return validationError('タイトルは必須です');
    }
    if (!image_url || typeof image_url !== 'string') {
      return validationError('画像URLは必須です');
    }

    // カテゴリのバリデーション
    const validCategories = ['notice', 'schedule', 'form', 'pta', 'other'];
    const printCategory = category || 'other';
    if (!validCategories.includes(printCategory)) {
      return validationError('categoryは notice, schedule, form, pta, other のいずれかである必要があります');
    }

    // 子どもの所有権確認
    const hasAccess = await verifyChildOwnership(c, userId, child_id);
    if (!hasAccess) {
      return notFoundError('子どもが見つかりません');
    }

    // プリントIDを生成
    const printId = `print_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    // プリントを作成
    await c.env.DB.prepare(
      `INSERT INTO prints
       (id, child_id, title, category, image_url, thumbnail_url, captured_at, deadline, is_archived, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
    )
      .bind(
        printId,
        child_id,
        title.trim(),
        printCategory,
        image_url,
        thumbnail_url || null,
        captured_at || now,
        deadline || null,
        notes || null,
        now,
        now
      )
      .run();

    // 作成されたプリントを取得
    const newPrint = await c.env.DB.prepare(
      'SELECT * FROM prints WHERE id = ?'
    )
      .bind(printId)
      .first();

    if (!newPrint) {
      return serverError('プリントの作成に失敗しました');
    }

    return successResponse(newPrint, 201);
  } catch (error) {
    console.error('Create print error:', error);
    return serverError('プリントの登録に失敗しました');
  }
});

/**
 * プリント更新
 * PUT /api/prints/:id
 */
prints.put('/:id', async (c) => {
  try {
    const firebaseUid = getFirebaseUid(c);
    const userId = await getUserId(c, firebaseUid);

    if (!userId) {
      return notFoundError('ユーザーが見つかりません');
    }

    const printId = c.req.param('id');

    // プリントの存在確認と所有者チェック
    const print = await c.env.DB.prepare(
      `SELECT p.* FROM prints p
       INNER JOIN children c ON p.child_id = c.id
       WHERE p.id = ? AND c.user_id = ? AND c.is_active = 1`
    )
      .bind(printId, userId)
      .first();

    if (!print) {
      return notFoundError('プリントが見つかりません');
    }

    const body = await c.req.json();
    const { title, category, deadline, is_archived, notes } = body;

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
    if (category !== undefined) {
      const validCategories = ['notice', 'schedule', 'form', 'pta', 'other'];
      if (!validCategories.includes(category)) {
        return validationError('categoryは notice, schedule, form, pta, other のいずれかである必要があります');
      }
      updates.push('category = ?');
      bindings.push(category);
    }
    if (deadline !== undefined) {
      updates.push('deadline = ?');
      bindings.push(deadline || null);
    }
    if (is_archived !== undefined) {
      updates.push('is_archived = ?');
      bindings.push(is_archived ? 1 : 0);
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
    bindings.push(printId);

    // 更新実行
    await c.env.DB.prepare(
      `UPDATE prints SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...bindings)
      .run();

    // 更新されたプリントを取得
    const updatedPrint = await c.env.DB.prepare(
      'SELECT * FROM prints WHERE id = ?'
    )
      .bind(printId)
      .first();

    return successResponse(updatedPrint);
  } catch (error) {
    console.error('Update print error:', error);
    return serverError('プリントの更新に失敗しました');
  }
});

/**
 * プリント削除
 * DELETE /api/prints/:id
 */
prints.delete('/:id', async (c) => {
  try {
    const firebaseUid = getFirebaseUid(c);
    const userId = await getUserId(c, firebaseUid);

    if (!userId) {
      return notFoundError('ユーザーが見つかりません');
    }

    const printId = c.req.param('id');

    // プリントの存在確認と所有者チェック
    const print = await c.env.DB.prepare(
      `SELECT p.* FROM prints p
       INNER JOIN children c ON p.child_id = c.id
       WHERE p.id = ? AND c.user_id = ? AND c.is_active = 1`
    )
      .bind(printId, userId)
      .first();

    if (!print) {
      return notFoundError('プリントが見つかりません');
    }

    // TODO: R2から画像を削除する処理を追加
    // if (c.env.IMAGES) {
    //   const imageKey = extractKeyFromUrl(print.image_url);
    //   await c.env.IMAGES.delete(imageKey);
    // }

    // 削除
    await c.env.DB.prepare(
      'DELETE FROM prints WHERE id = ?'
    )
      .bind(printId)
      .run();

    return successResponse({ message: 'プリントを削除しました' });
  } catch (error) {
    console.error('Delete print error:', error);
    return serverError('プリントの削除に失敗しました');
  }
});

export default prints;
