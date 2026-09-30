import { useSyncExternalStore } from 'react';

import { getJson, removeItem, setJson } from './storage/keyValueStore';

// SCR-E02 지역 검색의 "최근 검색" (결정 로그 54항). 기기에만 남기고 서버에 보내지 않는다.
// 로그아웃 · 탈퇴하면 지운다 (같은 기기를 다른 사람이 쓸 수 있다).
export const RECENT_SEARCH_MAX = 10;
const KEY = 'dallimo.recentSearches';

/** 맨 앞에 넣는다. 같은 검색어(대소문자 · 앞뒤 공백 무시)는 하나만 남기고 최대 개수를 넘으면 오래된 것을 뺀다 */
export function pushRecent(list: string[], query: string, max = RECENT_SEARCH_MAX): string[] {
  const q = query.trim().replace(/\s+/g, ' ');
  if (!q) return list;
  const key = q.toLocaleLowerCase();
  return [q, ...list.filter((x) => x.toLocaleLowerCase() !== key)].slice(0, max);
}

let current: string[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit(next: string[]) {
  current = next;
  listeners.forEach((l) => l());
}

async function load() {
  if (loaded) return;
  loaded = true;
  const saved = await getJson<string[]>(KEY);
  if (Array.isArray(saved)) emit(saved.filter((x) => typeof x === 'string').slice(0, RECENT_SEARCH_MAX));
}

export function addRecentSearch(query: string) {
  const next = pushRecent(current, query);
  if (next === current) return;
  emit(next);
  void setJson(KEY, next);
}

export function removeRecentSearch(query: string) {
  emit(current.filter((x) => x !== query));
  void setJson(KEY, current);
}

export async function clearRecentSearches() {
  emit([]);
  await removeItem(KEY);
}

export function useRecentSearches(): string[] {
  void load();
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => current,
  );
}
