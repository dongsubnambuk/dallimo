import type { LocalRunStore } from './localRunStore';
import { createMemoryLocalRunStore } from './memoryLocalRunStore';

// 웹(개발 확인용)은 SQLite 대신 메모리에 둔다. 새로고침하면 사라진다.
const store = createMemoryLocalRunStore();

export function getRunStore(): Promise<LocalRunStore> {
  return Promise.resolve(store);
}
