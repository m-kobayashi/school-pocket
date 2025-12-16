/**
 * 認証関連のAPIルート
 */

import { Hono } from 'hono';
import { getFirebaseUid, getAuthUser } from '../middleware/auth';
import { successResponse, validationError, serverError } from '../utils/response';

type Bindings = {
  DB: D1Database;
  FIREBASE_PROJECT_ID: string;
};

const auth = new Hono<{ Bindings: Bindings }>();

/**
 * ユーザー登録エンドポイント
 *
 * POST /api/auth/register
 *
 * リクエストボディ:
 * {
 *   "display_name": "山田太郎" (optional)
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
 *     "display_name": "山田太郎",
 *     "plan": "free",
 *     "created_at": "2024-01-01T00:00:00.000Z"
 *   }
 * }
 */
auth.post('/register', async (c) => {
  try {
    // 認証済みユーザー情報を取得
    const firebaseUid = getFirebaseUid(c);
    const authUser = getAuthUser(c);

    // リクエストボディを取得
    const body = await c.req.json();
    const displayName = body.display_name || authUser.name || null;

    // メールアドレスの検証
    if (!authUser.email) {
      return validationError('メールアドレスが必要です');
    }

    // 既存ユーザーのチェック
    const existingUser = await c.env.DB.prepare(
      'SELECT * FROM users WHERE firebase_uid = ?'
    )
      .bind(firebaseUid)
      .first();

    if (existingUser) {
      // 既に登録済みの場合は既存ユーザー情報を返す
      return successResponse({
        id: existingUser.id,
        firebase_uid: existingUser.firebase_uid,
        email: existingUser.email,
        display_name: existingUser.display_name,
        plan: existingUser.plan,
        created_at: existingUser.created_at,
        updated_at: existingUser.updated_at,
      });
    }

    // ユーザーIDを生成（UUIDv4風）
    const userId = `user_${crypto.randomUUID()}`;

    // ユーザーを作成
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO users (id, firebase_uid, email, display_name, plan, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'free', ?, ?)`
    )
      .bind(userId, firebaseUid, authUser.email, displayName, now, now)
      .run();

    // 作成されたユーザー情報を取得
    const newUser = await c.env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    )
      .bind(userId)
      .first();

    if (!newUser) {
      return serverError('ユーザーの作成に失敗しました');
    }

    return successResponse(
      {
        id: newUser.id,
        firebase_uid: newUser.firebase_uid,
        email: newUser.email,
        display_name: newUser.display_name,
        plan: newUser.plan,
        created_at: newUser.created_at,
        updated_at: newUser.updated_at,
      },
      201
    );
  } catch (error) {
    console.error('Register error:', error);
    return serverError('ユーザー登録中にエラーが発生しました', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default auth;
