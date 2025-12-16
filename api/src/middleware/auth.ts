/**
 * Firebase Authentication ミドルウェア
 *
 * Firebase ID Tokenを検証し、リクエストコンテキストにユーザー情報を追加します
 */

import { Context, Next } from 'hono';
import { unauthorizedError, serverError } from '../utils/response';

export interface DecodedToken {
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

/**
 * Firebase ID Tokenのペイロードをデコード（簡易版）
 *
 * 注意: 本番環境では、Firebase Admin SDKまたはJWKSを使用した
 * 適切な署名検証を実装する必要があります。
 *
 * この実装は、開発・MVP段階での簡易実装です。
 */
function decodeToken(token: string): DecodedToken | null {
  try {
    // JWT形式: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Base64URLデコード
    const payload = parts[1];
    const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(decodedPayload);

    // 基本的な検証
    if (!claims.uid && !claims.user_id && !claims.sub) {
      return null;
    }

    // トークンの有効期限チェック
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp && claims.exp < now) {
      return null;
    }

    return {
      uid: claims.uid || claims.user_id || claims.sub,
      email: claims.email,
      email_verified: claims.email_verified,
      name: claims.name,
      picture: claims.picture,
    };
  } catch (error) {
    console.error('Token decode error:', error);
    return null;
  }
}

/**
 * Firebase ID Tokenを検証するミドルウェア
 *
 * 使用方法:
 * ```
 * app.use('/api/*', authMiddleware);
 * ```
 */
export async function authMiddleware(c: Context, next: Next) {
  // Authorizationヘッダーを取得
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return unauthorizedError('Authorizationヘッダーが必要です');
  }

  // "Bearer <token>" 形式をチェック
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return unauthorizedError('無効なAuthorizationヘッダー形式です');
  }

  const token = parts[1];

  try {
    // トークンをデコード
    const decoded = decodeToken(token);

    if (!decoded) {
      return unauthorizedError('無効なトークンです');
    }

    // デコードされたトークン情報をコンテキストに保存
    c.set('user', decoded);
    c.set('firebaseUid', decoded.uid);

    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return serverError('認証処理中にエラーが発生しました');
  }
}

/**
 * オプショナル認証ミドルウェア
 *
 * トークンがあれば検証するが、なくてもエラーにしない
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      const decoded = decodeToken(token);

      if (decoded) {
        c.set('user', decoded);
        c.set('firebaseUid', decoded.uid);
      }
    }
  }

  await next();
}

/**
 * コンテキストから認証済みユーザー情報を取得
 */
export function getAuthUser(c: Context): DecodedToken {
  const user = c.get('user');
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}

/**
 * コンテキストからFirebase UIDを取得
 */
export function getFirebaseUid(c: Context): string {
  const uid = c.get('firebaseUid');
  if (!uid) {
    throw new Error('Firebase UID not found');
  }
  return uid;
}
