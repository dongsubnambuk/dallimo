import { openDatabaseAsync } from 'expo-sqlite';

import { migrate, type SqlDb } from './schema';

// 앱 로컬 DB 하나를 열어 migration까지 끝낸 뒤 돌려준다. 백그라운드 위치 task와 화면이 같은 연결을 쓴다.
const DB_NAME = 'dallimo.db';

let opening: Promise<SqlDb> | null = null;

export function getDatabase(): Promise<SqlDb> {
  opening ??= (async () => {
    const db = await openDatabaseAsync(DB_NAME);
    // 기록 중 쓰기와 화면 읽기가 서로 막지 않게 WAL을 쓴다
    await db.execAsync('PRAGMA journal_mode = WAL');
    await migrate(db);
    return db;
  })().catch((e) => {
    opening = null;
    throw e;
  });
  return opening;
}
