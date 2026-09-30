import type { RunVerification } from '@/entities/run/result';

// 외부 러닝 기록 가져오기 (명세 122장). 1.5차는 Apple 건강 · Health Connect
export type ImportSource = 'APPLE_HEALTH' | 'HEALTH_CONNECT';

// 건강 앱에 저장된 달리기 하나 (가져오기 후보)
export type HealthRun = {
  // 원본 id (HealthKit 운동 UUID)
  id: string;
  source: ImportSource;
  startedAt: number;
  endedAt: number;
  // 일시정지를 뺀 운동 시간(초)
  activeSec: number;
  distanceM: number | null;
  // 기록한 앱 · 기기 (예: "운동" · "Apple Watch")
  sourceName: string;
  deviceName: string | null;
  indoor: boolean;
};

export type HealthPoint = {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  speed?: number;
  recordedAt: number;
};

// 서버가 이미 처리한 원본 기록 (POST /imported-activities/check)
export type ImportStatus = 'IMPORTED' | 'MERGE_CANDIDATE' | 'FAILED';
export type ImportCheck = { externalId: string; status: ImportStatus; runId: string | null; mergedRunId: string | null; failureReason: string | null };

// 122.3장 Import 결과: 매칭 코스 · 검증 상태
export type ImportResult = ImportCheck & {
  course: { id: string; name: string; matchRate: number | null } | null;
  verification: RunVerification | null;
};

// 122.3장 연동 설정: 가져온 수 · 마지막으로 가져온 때 (권한 · 연결은 기기가 안다)
export type Integration = { source: ImportSource; importedCount: number; lastImportedAt: number | null };

export const SOURCE_LABEL: Record<ImportSource, string> = {
  APPLE_HEALTH: 'Apple 건강',
  HEALTH_CONNECT: 'Health Connect',
};
