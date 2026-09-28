import { getDatabase } from '@/shared/db/database';

import type { LocalRunStore } from './localRunStore';
import { createSqliteRunStore } from './sqliteRunStore';

// iOS · Android: SQLite 저장소 (웹은 runStore.web.ts)
let store: Promise<LocalRunStore> | null = null;

export function getRunStore(): Promise<LocalRunStore> {
  store ??= getDatabase()
    .then(createSqliteRunStore)
    .catch((e) => {
      store = null;
      throw e;
    });
  return store;
}
