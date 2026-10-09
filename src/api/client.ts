import type { ApiResponse } from './types';

export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://plogrid.p-e.kr/api/v1';
export const DASHBOARD_URL = `${BASE_URL}/dashboards`;

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, code: string | undefined, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type QueryParams = Record<string, string | number | undefined>;

export function buildUrl(path: string, params: QueryParams = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return `${DASHBOARD_URL}${path}${s ? `?${s}` : ''}`;
}

/** GET 후 래퍼를 벗겨 result만 돌려준다. 2xx가 아니거나 isSuccess=false면 ApiError. */
export async function apiGet<T>(path: string, params?: QueryParams, signal?: AbortSignal): Promise<T> {
  const res = await fetch(buildUrl(path, params), { signal, credentials: 'omit' });
  let body: Partial<ApiResponse<T>> | undefined;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }
  if (!res.ok) {
    throw new ApiError(res.status, body?.code, body?.message ?? `HTTP ${res.status}`);
  }
  if (!body || body.isSuccess === false || body.result === undefined) {
    throw new ApiError(res.status, body?.code, body?.message ?? '응답 형식 오류');
  }
  return body.result as T;
}
