import { createUuid } from '@/shared/uuid';

import { API_BASE_URL } from './config';
import type { ApiErrorCode, ApiResponse } from './contract';

// 서버 요청 공통 처리 (7.1장 응답 모양, 27.1장 오류).
// 로그인이 필요한 요청은 Access Token을 붙이고, 만료(TOKEN_EXPIRED)면 한 번 새로 받아 다시 보낸다.
// 다시 로그인해야 하면(AUTH_REQUIRED) 세션에 알린다. 토큰 보관은 features/auth/session이 한다.

const TIMEOUT_MS = 15_000;

export class ApiRequestError extends Error {
  readonly status: number;
  // 서버 오류 코드. 서버에 닿지 못했으면 NETWORK
  readonly code: ApiErrorCode | 'NETWORK' | string;
  readonly details: unknown;

  constructor(status: number, code: ApiErrorCode | 'NETWORK' | string, message: string, details: unknown = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type AuthHooks = {
  // 지금 쓸 수 있는 Access Token (곧 만료되면 먼저 새로 받는다). 로그인 전이면 null
  getAccessToken(): Promise<string | null>;
  // 만료됐다는 응답을 받았을 때 새로 받는다
  refreshAccessToken(): Promise<string | null>;
  // 다시 로그인해야 한다
  onUnauthorized(): void;
};

let hooks: AuthHooks | null = null;

export function registerAuthHooks(h: AuthHooks) {
  hooks = h;
}

// fetch 밖(WebSocket CONNECT 헤더)에서 쓸 Access Token
export async function currentAccessToken(): Promise<string | null> {
  return (await hooks?.getAccessToken()) ?? null;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  // JSON으로 보낸다. FormData면 multipart 그대로 (프로필 사진)
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string>;
  // 요청별 헤더 (예: 7.3장 Idempotency-Key)
  headers?: Record<string, string>;
};

export async function apiRequest<T>(path: string, { method = 'GET', body, auth = true, query, headers }: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) throw new ApiRequestError(0, 'NETWORK', '서버 주소가 설정되지 않았어요');
  const url = `${API_BASE_URL}${path}${query ? `?${new URLSearchParams(query).toString()}` : ''}`;
  // 21.1장 관측성: 요청 id. 서버 로그 줄마다 찍히고 응답 헤더로 돌아온다. 토큰을 새로 받아 다시 보내도 같은 요청이다
  const requestId = createUuid();

  const send = async (token: string | null) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          'X-Request-Id': requestId,
          ...(body !== undefined && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch {
      throw new ApiRequestError(0, 'NETWORK', '서버에 연결하지 못했어요');
    } finally {
      clearTimeout(timer);
    }
  };

  let res = await send(auth ? await hooks?.getAccessToken() ?? null : null);
  if (auth && res.status === 401 && (await errorCode(res.clone())) === 'TOKEN_EXPIRED' && hooks) {
    const fresh = await hooks.refreshAccessToken();
    if (fresh) res = await send(fresh);
  }
  if (res.status === 204) return undefined as T;

  const envelope = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (res.ok && envelope?.success) return envelope.data as T;

  const code = envelope?.error?.code ?? (res.status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR');
  if (auth && res.status === 401) hooks?.onUnauthorized();
  throw new ApiRequestError(res.status, code, envelope?.error?.message ?? '요청을 처리하지 못했어요', envelope?.error?.details ?? null);
}

async function errorCode(res: Response): Promise<string | null> {
  const body = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
  return body?.error?.code ?? null;
}
