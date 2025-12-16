/**
 * 画像アップロードAPI
 *
 * 注意: R2バケットの設定が必要です
 */

import { Hono } from 'hono';
import { getFirebaseUid } from '../middleware/auth';
import { successResponse, validationError, serverError } from '../utils/response';

type Bindings = {
  DB: D1Database;
  FIREBASE_PROJECT_ID: string;
  // IMAGES?: R2Bucket;
};

const upload = new Hono<{ Bindings: Bindings }>();

/**
 * 画像アップロード
 * POST /api/upload/image
 *
 * Content-Type: multipart/form-data
 * Body: FormData with 'image' field
 *
 * 注意: 現在R2バケットが設定されていないため、ダミーのURLを返します
 * 実際の運用ではR2バケットを設定し、画像をアップロードする必要があります
 */
upload.post('/image', async (c) => {
  try {
    const firebaseUid = getFirebaseUid(c);

    if (!firebaseUid) {
      return validationError('認証が必要です');
    }

    // FormDataから画像を取得
    const formData = await c.req.formData();
    const image = formData.get('image');

    if (!image || !(image instanceof File)) {
      return validationError('画像ファイルが必要です');
    }

    // ファイルサイズチェック（最大10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (image.size > maxSize) {
      return validationError('画像サイズは10MB以下にしてください');
    }

    // ファイルタイプチェック
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(image.type)) {
      return validationError('画像形式はJPEG、PNG、WebPのみ対応しています');
    }

    // R2バケットが設定されている場合のアップロード処理
    // if (c.env.IMAGES) {
    //   const imageBuffer = await image.arrayBuffer();
    //   const imageId = `${firebaseUid}/${Date.now()}_${crypto.randomUUID()}`;
    //   const extension = image.type.split('/')[1];
    //   const key = `prints/${imageId}.${extension}`;
    //
    //   await c.env.IMAGES.put(key, imageBuffer, {
    //     httpMetadata: {
    //       contentType: image.type,
    //     },
    //   });
    //
    //   // R2のPublic URLを生成（実際の設定に応じて変更）
    //   const imageUrl = `https://your-r2-bucket.com/${key}`;
    //   const thumbnailUrl = imageUrl; // サムネイルは別途生成が必要
    //
    //   return successResponse({
    //     image_url: imageUrl,
    //     thumbnail_url: thumbnailUrl,
    //   }, 201);
    // }

    // R2が設定されていない場合はダミーURLを返す
    // 実際の運用では上記のR2アップロード処理を有効化してください
    const dummyImageId = `${firebaseUid}/${Date.now()}_${crypto.randomUUID()}`;
    const extension = image.type.split('/')[1];

    return successResponse({
      message: 'R2バケットが設定されていないため、ダミーURLを返しています',
      image_url: `https://placeholder.com/prints/${dummyImageId}.${extension}`,
      thumbnail_url: `https://placeholder.com/prints/thumb_${dummyImageId}.${extension}`,
      note: 'wrangler.tomlでR2バケットを設定し、このコードのコメントを解除してください'
    }, 201);

  } catch (error) {
    console.error('Upload image error:', error);
    return serverError('画像のアップロードに失敗しました');
  }
});

export default upload;
