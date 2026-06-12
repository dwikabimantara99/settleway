import { ApiResult } from '../db/types';

export function createErrorResponse(code: string, message: string, recoverable = true): ApiResult<never> {
  return {
    ok: false,
    error: { code, message, recoverable }
  };
}

export function createSuccessResponse<T>(data: T, meta?: Record<string, unknown>): ApiResult<T> {
  return {
    ok: true,
    data,
    meta
  };
}
