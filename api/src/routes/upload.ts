import { Hono } from 'hono';
import type { Context } from 'hono';

type Bindings = {
  DB: D1Database;
  IMAGES: R2Bucket;
  FIREBASE_PROJECT_ID: string;
};

type Variables = {
  userId: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// 画像アップロード
app.post('/image', async (c: Context) => {
  const userId = c.get('userId');

  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return c.json({
        success: false,
        error: { message: 'ファイルが指定されていません' },
      }, 400);
    }

    // ファイルサイズチェック（1MB以下）
    const maxSize = 1 * 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      return c.json({
        success: false,
        error: { message: 'ファイルサイズは1MB以下にしてください' },
      }, 400);
    }

    // ファイル拡張子チェック
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({
        success: false,
        error: { message: '画像ファイル（JPEG、PNG、WebP）のみアップロード可能です' },
      }, 400);
    }

    // ファイル名生成（ユーザーID/タイムスタンプ_ランダム文字列.拡張子）
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${userId}/${timestamp}_${randomStr}.${ext}`;

    // R2にアップロード
    await c.env.IMAGES.put(filename, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Workers経由でアクセスできるURL
    const baseUrl = new URL(c.req.url).origin;
    const url = `${baseUrl}/api/upload/images/${filename}`;

    return c.json({
      success: true,
      data: { url },
    });
  } catch (error: any) {
    console.error('Image upload error:', error);
    return c.json({
      success: false,
      error: { message: error.message || '画像アップロードに失敗しました' },
    }, 500);
  }
});

// 画像取得（認証不要で公開）
app.get('/images/*', async (c: Context) => {
  try {
    const path = c.req.path.replace('/api/upload/images/', '');
    const object = await c.env.IMAGES.get(path);

    if (!object) {
      return c.json({
        success: false,
        error: { message: '画像が見つかりません' },
      }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000'); // 1年間キャッシュ

    return new Response(object.body, { headers });
  } catch (error: any) {
    console.error('Image fetch error:', error);
    return c.json({
      success: false,
      error: { message: '画像の取得に失敗しました' },
    }, 500);
  }
});

export default app;
