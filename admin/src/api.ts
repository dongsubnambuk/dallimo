// 관리 웹 API (결정 로그 85항). 달리모 계정으로 로그인하고, 관리자 계정(서버 ADMIN_EMAILS)만 /api/v1/admin을 부를 수 있다.
// 토큰은 sessionStorage에 둔다: 탭을 닫으면 로그아웃된다. Access Token이 만료되면 Refresh Token으로 한 번 다시 받는다.

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

type Envelope<T> = { success: boolean; data: T; error: { code: string; message: string; details: unknown } | null };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type Session = { accessToken: string; refreshToken: string; nickname: string };

const SESSION_KEY = 'dallimo.admin.session';
const DEVICE_KEY = 'dallimo.admin.deviceId';

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function writeSession(s: Session | null) {
  try {
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // 저장소를 못 쓰면 이 탭 메모리에만 둔다
  }
  session = s;
  listeners.forEach((l) => l());
}

// 브라우저마다 고정 기기 id. 같은 기기로 다시 로그인하면 서버가 이전 세션을 지운다
function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = `admin-web-${crypto.randomUUID()}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'admin-web';
  }
}

let session: Session | null = readSession();
const listeners = new Set<() => void>();

export function getSession() {
  return session;
}

export function subscribeSession(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

async function raw<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  const { token, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...rest,
      headers: {
        Accept: 'application/json',
        ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new ApiError(0, 'NETWORK', '서버에 연결하지 못했어요. 주소와 네트워크를 확인해 주세요.');
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !body?.success) {
    throw new ApiError(res.status, body?.error?.code ?? 'UNKNOWN', body?.error?.message ?? `요청을 처리하지 못했어요 (${res.status})`);
  }
  return body.data;
}

type AuthResponse = { accessToken: string; refreshToken: string; user: { nickname: string } };

let refreshing: Promise<boolean> | null = null;

async function refresh(): Promise<boolean> {
  const s = session;
  if (!s) return false;
  refreshing ??= raw<AuthResponse>('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: s.refreshToken, deviceId: deviceId() }),
  })
    .then((r) => {
      writeSession({ accessToken: r.accessToken, refreshToken: r.refreshToken, nickname: s.nickname });
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** 관리 API. 401이면 토큰을 한 번 갱신해 다시 부르고, 그래도 안 되면 로그아웃 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await raw<T>(path, { ...init, token: session?.accessToken });
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401) throw e;
    if (!(await refresh())) {
      writeSession(null);
      throw e;
    }
    return raw<T>(path, { ...init, token: session?.accessToken });
  }
}

export async function logIn(email: string, password: string) {
  const r = await raw<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, deviceId: deviceId() }),
  });
  // 관리자 계정인지 확인한 뒤에만 로그인 상태로 둔다
  try {
    await raw('/api/v1/admin/me', { token: r.accessToken });
  } catch (e) {
    await raw('/api/v1/auth/logout', { method: 'POST', token: r.accessToken }).catch(() => undefined);
    throw e instanceof ApiError && (e.status === 403 || e.status === 404) ? new ApiError(403, 'NOT_ADMIN', '관리자 계정이 아니에요.') : e;
  }
  writeSession({ accessToken: r.accessToken, refreshToken: r.refreshToken, nickname: r.user.nickname });
}

export async function logOut() {
  const token = session?.accessToken;
  writeSession(null);
  if (token) await raw('/api/v1/auth/logout', { method: 'POST', token }).catch(() => undefined);
}

export const apiBase = BASE || window.location.origin;
