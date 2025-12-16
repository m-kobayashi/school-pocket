/**
 * API レスポンスヘルパー関数
 */

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}

/**
 * 成功レスポンスを返す
 */
export function successResponse<T>(data: T, status: number = 200): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
    } as SuccessResponse<T>),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * エラーレスポンスを返す
 */
export function errorResponse(
  message: string,
  status: number = 500,
  code?: string,
  details?: any
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        message,
        code,
        details,
      },
    } as ErrorResponse),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * バリデーションエラーレスポンスを返す
 */
export function validationError(message: string, details?: any): Response {
  return errorResponse(message, 400, 'VALIDATION_ERROR', details);
}

/**
 * 認証エラーレスポンスを返す
 */
export function unauthorizedError(message: string = '認証が必要です'): Response {
  return errorResponse(message, 401, 'UNAUTHORIZED');
}

/**
 * 権限エラーレスポンスを返す
 */
export function forbiddenError(message: string = 'アクセス権限がありません'): Response {
  return errorResponse(message, 403, 'FORBIDDEN');
}

/**
 * 404エラーレスポンスを返す
 */
export function notFoundError(message: string = 'リソースが見つかりません'): Response {
  return errorResponse(message, 404, 'NOT_FOUND');
}

/**
 * サーバーエラーレスポンスを返す
 */
export function serverError(message: string = 'サーバーエラーが発生しました', details?: any): Response {
  return errorResponse(message, 500, 'SERVER_ERROR', details);
}
