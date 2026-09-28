// 57장 Mobile DB. 29.2장 로컬 스키마를 기준으로 만든 SQLite migration.
// 버전은 PRAGMA user_version으로 관리한다. 이미 배포된 migration은 고치지 않고 새 버전을 뒤에 붙인다.
//
// 29.2장과 다른 점 (FOUNDATION-DECISION-LOG 27항)
// - course_id: 코스 id가 문자열이라 TEXT로 둔다.
// - local_run.plan: 앱을 다시 켜서 이어 달릴 때 화면에 보여줄 계획(모드 · 코스 이름 · 목표)을 JSON으로 둔다.
// - local_run_segment: 달린 구간(시작/재개 ~ 일시정지/종료). 복구할 때 일시정지 시간을 빼고
//   일시정지 동안 움직인 거리를 세지 않으려면 구간 경계가 필요하다 (51.2장 pause segment 제외).
export const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE IF NOT EXISTS local_run (
    client_run_uuid TEXT PRIMARY KEY,
    server_run_id INTEGER NULL,
    mode TEXT NOT NULL,
    course_id TEXT NULL,
    status TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER NULL,
    elapsed_ms INTEGER NOT NULL DEFAULT 0,
    last_seq INTEGER NOT NULL DEFAULT 0,
    sync_state TEXT NOT NULL,
    plan TEXT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_local_run_status ON local_run (status);

  CREATE TABLE IF NOT EXISTS local_run_point (
    client_run_uuid TEXT NOT NULL,
    seq INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    altitude REAL NULL,
    accuracy REAL NULL,
    speed REAL NULL,
    recorded_at INTEGER NOT NULL,
    quality_flag TEXT NOT NULL,
    sync_state TEXT NOT NULL,
    PRIMARY KEY (client_run_uuid, seq)
  );

  CREATE TABLE IF NOT EXISTS local_sync_batch (
    batch_uuid TEXT PRIMARY KEY,
    client_run_uuid TEXT NOT NULL,
    from_seq INTEGER NOT NULL,
    to_seq INTEGER NOT NULL,
    status TEXT NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at INTEGER NULL
  );

  CREATE TABLE IF NOT EXISTS local_run_segment (
    client_run_uuid TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER NULL,
    PRIMARY KEY (client_run_uuid, started_at)
  );
  `,
];

export type SqlValue = string | number | null;

// expo-sqlite SQLiteDatabase 중 쓰는 부분. 테스트에서 다른 SQLite 구현으로 바꿀 수 있게 이 모양만 의존한다.
export type SqlDb = {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: SqlValue[]): Promise<unknown>;
  getAllAsync<T>(source: string, ...params: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(source: string, ...params: SqlValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
};

export async function migrate(db: SqlDb): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const from = row?.user_version ?? 0;
  for (let v = from; v < MIGRATIONS.length; v++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[v]);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
