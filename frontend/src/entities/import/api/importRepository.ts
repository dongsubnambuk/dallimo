import type { HealthPoint, HealthRun, ImportCheck, ImportResult, ImportSource, Integration } from '../types';

// 126장 Integration · Import API 경계
export interface ImportRepository {
  // 이미 처리한 원본 기록 (처음 보는 것은 없다)
  check(source: ImportSource, externalIds: string[]): Promise<ImportCheck[]>;
  // 가져오기 (같은 기록은 같은 결과)
  importRun(run: HealthRun, points: HealthPoint[]): Promise<ImportResult>;
  integrations(): Promise<Integration[]>;
}
