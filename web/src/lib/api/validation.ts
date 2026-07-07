import { ApiResult } from '../db/types';

export function createErrorResponse(code: string, message: string, recoverable = true, diagnostic?: Record<string, unknown>): ApiResult<never> {
  return {
    ok: false,
    error: { code, message, recoverable, ...(diagnostic ? { diagnostic } : {}) }
  };
}

export function createSuccessResponse<T>(data: T, meta?: Record<string, unknown>): ApiResult<T> {
  return {
    ok: true,
    data,
    meta
  };
}
