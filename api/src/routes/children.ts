/**
 * 子ども管理API
 */

import { Hono } from 'hono';
import { getFirebaseUid } from '../middleware/auth';
import { successResponse, validationError, notFoundError, serverError, unauthorizedError } from '../utils/response';

type Bindings = {
  DB: D1Database;
  FIREBASE_PROJECT_ID: string;
};

const children = new Hono<{ Bindings: Bindings }>();

/**
 * ユーザーIDを取得（firebase_uidから）
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
 * プラン制限チェック
 */
async function checkPlanLimits(c: any, userId: string): Promise<{ canAdd: boolean; plan: string; currentCount: number }> {
  const user = await c.env.DB.prepare(
    'SELECT plan FROM users WHERE id = ?'
  )
    .bind(userId)
    .first();

  if (!user) {
    return { canAdd: false, plan: 'free', currentCount: 0 };
  }

  const result = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM children WHERE user_id = ? AND is_active = 1'
  )
    .bind(userId)
    .first();

  const currentCount = result ? Number(result.count) : 0;
  const plan = user.plan as string;

  // 無料プランは1人まで
  const canAdd = plan === 'free' ? currentCount < 1 : true;

  return { canAdd, plan, currentCount };
}

/**
 * 子ども一覧取得
 * GET /api/children
 */
children.get('/', async (c) => {
  try {
    const firebaseUid = getFirebaseUid(c);
    const userId = await getUserId(c, firebaseUid);

    if (!userId) {
      return notFoundError('ユーザーが見つかりません');
    }

    const { results } = await c.env.DB.prepare(
      `SELECT * FROM children
       WHERE user_id = ? AND is_active = 1
       ORDER BY sort_order ASC, created_at ASC`
    )
      .bind(userId)
      .all();

    return successResponse({ children: results || [] });
  } catch (error) {
    console.error('Get children error:', error);
    return serverError('子ども一覧の取得に失敗しました');
  }
});

/**
 * 子ども登録
 * POST /api/children
 */
children.post('/', async (c) => {
  try {
    const firebaseUid = getFirebaseUid(c);
    const userId = await getUserId(c, firebaseUid);

    if (!userId) {
      return notFoundError('ユーザーが見つかりません');
    }

    // プラン制限チェック
    const { canAdd, plan, currentCount } = await checkPlanLimits(c, userId);
    if (!canAdd) {
      return validationError(
        `無料プランでは子どもを${currentCount}人までしか登録できません`,
        { plan, currentCount, limit: 1 }
      );
    }

    const body = await c.req.json();
    const { name, school_name, grade, class_name, color } = body;

    // バリデーション
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return validationError('子どもの名前は必須です');
    }

    if (grade !== undefined && (typeof grade !== 'number' || grade < 1 || grade > 9)) {
      return validationError('学年は1〜9の範囲で指定してください');
    }

    // 子どもIDを生成
    const childId = `child_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    // 現在の最大sort_orderを取得
    const maxSortOrder = await c.env.DB.prepare(
      'SELECT MAX(sort_order) as max_sort FROM children WHERE user_id = ?'
    )
      .bind(userId)
      .first();

    const sortOrder = maxSortOrder && maxSortOrder.max_sort !== null
      ? Number(maxSortOrder.max_sort) + 1
      : 0;

    // 子どもを作成
    await c.env.DB.prepare(
      `INSERT INTO children
       (id, user_id, name, school_name, grade, class_name, color, sort_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    )
      .bind(
        childId,
        userId,
        name.trim(),
        school_name || null,
        grade || null,
        class_name || null,
        color || '#4CAF50',
        sortOrder,
        now,
        now
      )
      .run();

    // 作成された子ども情報を取得
    const newChild = await c.env.DB.prepare(
      'SELECT * FROM children WHERE id = ?'
    )
      .bind(childId)
      .first();

    if (!newChild) {
      return serverError('子どもの作成に失敗しました');
    }

    return successResponse(newChild, 201);
  } catch (error) {
    console.error('Create child error:', error);
    return serverError('子どもの登録に失敗しました');
  }
});

/**
 * 子ども情報更新
 * PUT /api/children/:id
 */
children.put('/:id', async (c) => {
  try {
    const firebaseUid = getFirebaseUid(c);
    const userId = await getUserId(c, firebaseUid);

    if (!userId) {
      return notFoundError('ユーザーが見つかりません');
    }

    const childId = c.req.param('id');

    // 子どもの存在確認と所有者チェック
    const child = await c.env.DB.prepare(
      'SELECT * FROM children WHERE id = ? AND user_id = ? AND is_active = 1'
    )
      .bind(childId, userId)
      .first();

    if (!child) {
      return notFoundError('子どもが見つかりません');
    }

    const body = await c.req.json();
    const { name, school_name, grade, class_name, color, sort_order } = body;

    // バリデーション
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return validationError('子どもの名前は必須です');
    }

    if (grade !== undefined && grade !== null && (typeof grade !== 'number' || grade < 1 || grade > 9)) {
      return validationError('学年は1〜9の範囲で指定してください');
    }

    // 更新するフィールドを構築
    const updates: string[] = [];
    const bindings: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      bindings.push(name.trim());
    }
    if (school_name !== undefined) {
      updates.push('school_name = ?');
      bindings.push(school_name || null);
    }
    if (grade !== undefined) {
      updates.push('grade = ?');
      bindings.push(grade || null);
    }
    if (class_name !== undefined) {
      updates.push('class_name = ?');
      bindings.push(class_name || null);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      bindings.push(color || '#4CAF50');
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      bindings.push(sort_order);
    }

    if (updates.length === 0) {
      return validationError('更新するフィールドが指定されていません');
    }

    updates.push('updated_at = ?');
    bindings.push(new Date().toISOString());
    bindings.push(childId);

    // 更新実行
    await c.env.DB.prepare(
      `UPDATE children SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...bindings)
      .run();

    // 更新された子ども情報を取得
    const updatedChild = await c.env.DB.prepare(
      'SELECT * FROM children WHERE id = ?'
    )
      .bind(childId)
      .first();

    return successResponse(updatedChild);
  } catch (error) {
    console.error('Update child error:', error);
    return serverError('子ども情報の更新に失敗しました');
  }
});

/**
 * 子ども削除（論理削除）
 * DELETE /api/children/:id
 */
children.delete('/:id', async (c) => {
  try {
    const firebaseUid = getFirebaseUid(c);
    const userId = await getUserId(c, firebaseUid);

    if (!userId) {
      return notFoundError('ユーザーが見つかりません');
    }

    const childId = c.req.param('id');

    // 子どもの存在確認と所有者チェック
    const child = await c.env.DB.prepare(
      'SELECT * FROM children WHERE id = ? AND user_id = ? AND is_active = 1'
    )
      .bind(childId, userId)
      .first();

    if (!child) {
      return notFoundError('子どもが見つかりません');
    }

    // 論理削除
    await c.env.DB.prepare(
      'UPDATE children SET is_active = 0, updated_at = ? WHERE id = ?'
    )
      .bind(new Date().toISOString(), childId)
      .run();

    return successResponse({ message: '子どもを削除しました' });
  } catch (error) {
    console.error('Delete child error:', error);
    return serverError('子どもの削除に失敗しました');
  }
});

export default children;
