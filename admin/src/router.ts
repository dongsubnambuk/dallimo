import { useSyncExternalStore } from 'react';

// 해시 주소 (#/monitoring, #/users?q=…, #/users/12, #/reports, #/reports/34, #/notices). 정적 호스팅에서 새로 고침해도 그대로 열린다

export type Route =
  | { name: 'monitoring' }
  | { name: 'notices' }
  | { name: 'users'; params: URLSearchParams }
  | { name: 'user'; id: number }
  | { name: 'reports'; params: URLSearchParams }
  | { name: 'report'; id: number };

function parse(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const params = new URLSearchParams(query);
  const parts = path.split('/').filter(Boolean);
  const id = Number(parts[1]);
  if (parts[0] === 'users' && parts[1] && Number.isInteger(id)) return { name: 'user', id };
  if (parts[0] === 'reports' && parts[1] && Number.isInteger(id)) return { name: 'report', id };
  if (parts[0] === 'reports') return { name: 'reports', params };
  if (parts[0] === 'users') return { name: 'users', params };
  if (parts[0] === 'notices') return { name: 'notices' };
  return { name: 'monitoring' };
}

const subscribe = (l: () => void) => {
  window.addEventListener('hashchange', l);
  return () => window.removeEventListener('hashchange', l);
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parse(hash);
}

export function href(path: string, params?: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v) q.set(k, v);
  });
  const s = q.toString();
  return `#${path}${s ? `?${s}` : ''}`;
}

export function go(path: string, params?: Record<string, string | undefined>) {
  window.location.hash = href(path, params);
}
