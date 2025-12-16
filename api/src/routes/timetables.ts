/**
 * 時間割管理API
 */

import { Hono } from 'hono';
import { getFirebaseUid } from '../middleware/auth';
import { successResponse, validationError, notFoundError, serverError } from '../utils/response';

type Bindings = {
  DB: D1Database;
  FIREBASE_PROJECT_ID: string;
};

const timetables = new Hono<{ Bindings: Bindings }>();

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
 * 時間割取得
 * GET /api/children/:childId/timetable
 */
timetables.get('/children/:childId/timetable', async (c) => {
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

    // 時間割を取得
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM timetables
       WHERE child_id = ?
       ORDER BY day_of_week ASC, period ASC`
    )
      .bind(childId)
      .all();

    return successResponse({ timetable: results || [] });
  } catch (error) {
    console.error('Get timetable error:', error);
    return serverError('時間割の取得に失敗しました');
  }
});

/**
 * 時間割一括更新
 * PUT /api/children/:childId/timetable
 *
 * Body: { timetable: [{ day_of_week, period, subject, teacher?, room?, notes? }] }
 */
timetables.put('/children/:childId/timetable', async (c) => {
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

    const body = await c.req.json();
    const { timetable } = body;

    if (!Array.isArray(timetable)) {
      return validationError('timetableは配列である必要があります');
    }

    // バリデーション
    for (const entry of timetable) {
      if (!entry.day_of_week || typeof entry.day_of_week !== 'number' || entry.day_of_week < 1 || entry.day_of_week > 5) {
        return validationError('day_of_weekは1〜5の範囲で指定してください');
      }
      if (!entry.period || typeof entry.period !== 'number' || entry.period < 1 || entry.period > 6) {
        return validationError('periodは1〜6の範囲で指定してください');
      }
      if (!entry.subject || typeof entry.subject !== 'string' || entry.subject.trim().length === 0) {
        return validationError('subjectは必須です');
      }
    }

    // トランザクション的な処理
    // 既存の時間割を削除
    await c.env.DB.prepare(
      'DELETE FROM timetables WHERE child_id = ?'
    )
      .bind(childId)
      .run();

    // 新しい時間割を挿入
    const now = new Date().toISOString();
    let insertedCount = 0;

    for (const entry of timetable) {
      const timetableId = `timetable_${crypto.randomUUID()}`;

      await c.env.DB.prepare(
        `INSERT INTO timetables
         (id, child_id, day_of_week, period, subject, teacher, room, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          timetableId,
          childId,
          entry.day_of_week,
          entry.period,
          entry.subject.trim(),
          entry.teacher || null,
          entry.room || null,
          entry.notes || null,
          now,
          now
        )
        .run();

      insertedCount++;
    }

    return successResponse({
      message: '時間割を更新しました',
      updated_count: insertedCount
    });
  } catch (error) {
    console.error('Update timetable error:', error);
    return serverError('時間割の更新に失敗しました');
  }
});

/**
 * 特定の時間割エントリ更新
 * PUT /api/timetables/:id
 */
timetables.put('/:id', async (c) => {
  try {
    const firebaseUid = getFirebaseUid(c);
    const userId = await getUserId(c, firebaseUid);

    if (!userId) {
      return notFoundError('ユーザーが見つかりません');
    }

    const timetableId = c.req.param('id');

    // 時間割の存在確認と所有者チェック
    const timetable = await c.env.DB.prepare(
      `SELECT t.* FROM timetables t
       INNER JOIN children c ON t.child_id = c.id
       WHERE t.id = ? AND c.user_id = ? AND c.is_active = 1`
    )
      .bind(timetableId, userId)
      .first();

    if (!timetable) {
      return notFoundError('時間割が見つかりません');
    }

    const body = await c.req.json();
    const { subject, teacher, room, notes } = body;

    // 更新するフィールドを構築
    const updates: string[] = [];
    const bindings: any[] = [];

    if (subject !== undefined) {
      if (typeof subject !== 'string' || subject.trim().length === 0) {
        return validationError('科目名は必須です');
      }
      updates.push('subject = ?');
      bindings.push(subject.trim());
    }
    if (teacher !== undefined) {
      updates.push('teacher = ?');
      bindings.push(teacher || null);
    }
    if (room !== undefined) {
      updates.push('room = ?');
      bindings.push(room || null);
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
    bindings.push(timetableId);

    // 更新実行
    await c.env.DB.prepare(
      `UPDATE timetables SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...bindings)
      .run();

    // 更新された時間割を取得
    const updatedTimetable = await c.env.DB.prepare(
      'SELECT * FROM timetables WHERE id = ?'
    )
      .bind(timetableId)
      .first();

    return successResponse(updatedTimetable);
  } catch (error) {
    console.error('Update timetable entry error:', error);
    return serverError('時間割の更新に失敗しました');
  }
});

export default timetables;
