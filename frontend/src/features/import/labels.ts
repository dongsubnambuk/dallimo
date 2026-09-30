import { SOURCE_LABEL } from '@/entities/import/types';
import type { RunSourceInfo } from '@/entities/run/result';

const KIND_LABEL: Record<RunSourceInfo['kind'], string> = {
  ...SOURCE_LABEL,
  GARMIN: 'Garmin',
  COROS: 'COROS',
  GPX_IMPORT: 'GPX 파일',
};

/** 122.3장 Source Badge: "Apple Watch에서 가져옴", 기기를 모르면 "Apple 건강에서 가져옴" */
export function sourceBadgeText(s: RunSourceInfo): string {
  return `${s.device ?? KIND_LABEL[s.kind]}에서 가져옴`;
}
