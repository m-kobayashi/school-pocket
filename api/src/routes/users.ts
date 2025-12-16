/**
 * ユーザー情報関連のAPIルート
 */

import { Hono } from 'hono';
import { getFirebaseUid } from '../middleware/auth';
import {
  successResponse,
  notFoundError,
  validationError,
  serverError,
} from '../utils/response';

type Bindings = {
  DB: D1Database;
  FIREBASE_PROJECT_ID: string;
};

const users = new Hono<{ Bindings: Bindings }>();

/**
 * 現在のユーザー情報を取得
 *
 * GET /api/users/me
 *
 * 認証: Firebase ID Token必須
 *
 * レスポンス:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "user_xxx",
 *     "firebase_uid": "xxx",
 *     "email": "user@example.com",
 *     "display_name": "山田太郎",
 *     "plan": "free",
 *     "created_at": "2024-01-01T00:00:00.000Z",
 *     "updated_at": "2024-01-01T00:00:00.000Z"
 *   }
 * }
 */
users.get('/me', async (c) => {
  try {
    const firebaseUid = getFirebaseUid(c);

    // ユーザー情報を取得
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE firebase_uid = ?'
    )
      .bind(firebaseUid)
      .first();

    if (!user) {
      return notFoundError('ユーザーが見つかりません');
    }

    return successResponse({
      id: user.id,
      firebase_uid: user.firebase_uid,
      email: user.email,
      display_name: user.display_name,
      plan: user.plan,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return serverError('ユーザー情報の取得中にエラーが発生しました', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * 現在のユーザー情報を更新
 *
 * PUT /api/users/me
 *
 * リクエストボディ:
 * {
 *   "display_name": "山田花子" (optional)
 * }
 *
 * 認証: Firebase ID Token必須
 *
 * レスポンス:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "user_xxx",
 *     "firebase_uid": "xxx",
 *     "email": "user@example.com",
 *     "display_name": "山田花子",
 *     "plan": "free",
 *     "created_at": "2024-01-01T00:00:00.000Z",
 *     "updated_at": "2024-01-01T00:00:00.000Z"
 *   }
 * }
 */
users.put('/me', async (c) => {
  try {
    const firebaseUid = getFirebaseUid(c);

    // 既存ユーザーを確認
    const existingUser = await c.env.DB.prepare(
      'SELECT * FROM users WHERE firebase_uid = ?'
    )
      .bind(firebaseUid)
      .first();

    if (!existingUser) {
      return notFoundError('ユーザーが見つかりません');
    }

    // リクエストボディを取得
    const body = await c.req.json();

    // 更新可能なフィールドを抽出
    const updates: string[] = [];
    const values: any[] = [];

    if (body.display_name !== undefined) {
      updates.push('display_name = ?');
      values.push(body.display_name);
    }

    // 更新するフィールドがない場合
    if (updates.length === 0) {
      return validationError('更新するフィールドが指定されていません');
    }

    // updated_atを追加
    updates.push('updated_at = ?');
    const now = new Date().toISOString();
    values.push(now);

    // firebase_uidを条件に追加
    values.push(firebaseUid);

    // ユーザー情報を更新
    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE firebase_uid = ?`;
    await c.env.DB.prepare(updateQuery).bind(...values).run();

    // 更新後のユーザー情報を取得
    const updatedUser = await c.env.DB.prepare(
      'SELECT * FROM users WHERE firebase_uid = ?'
    )
      .bind(firebaseUid)
      .first();

    if (!updatedUser) {
      return serverError('ユーザー情報の更新に失敗しました');
    }

    return successResponse({
      id: updatedUser.id,
      firebase_uid: updatedUser.firebase_uid,
      email: updatedUser.email,
      display_name: updatedUser.display_name,
      plan: updatedUser.plan,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return serverError('ユーザー情報の更新中にエラーが発生しました', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default users;
