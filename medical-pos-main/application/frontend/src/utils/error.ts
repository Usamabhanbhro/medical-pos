import type { ApiError } from '../types/api';

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  const apiError = error as ApiError;
  const detail = apiError.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]) return detail[0].msg ?? detail[0].message ?? fallback;
  if (typeof apiError.message === 'string') return apiError.message;
  return fallback;
}

export function getErrorStatus(error: unknown): number | undefined {
  const apiError = error as ApiError;
  return typeof apiError.status === 'number' ? apiError.status : undefined;
}
