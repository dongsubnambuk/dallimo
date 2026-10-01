import type { HeartRateSample } from './engine/localRunStore';
import { runningRunUuid } from './engine/recorder';
import { getRunStore } from './engine/runStore';
import { getPreferences } from '@/shared/preferences';

// 워치 심박을 러닝 기록에 남긴다 (사용자 결정, 결정 로그 65항).
// 심박은 건강정보라 설정에서 "심박 저장"에 동의한 사람만 기기에 남기고, 러닝을 끝낼 때 서버에 보낸다.
// 워치는 5초마다 보낸다. 달리는 중(RUNNING)일 때만 남긴다 (일시정지 · 준비 중은 빼기).

// 서버 검증 범위와 같다 (FinishRunRequest.heartRate: 30~250bpm, 최대 3600개). 벗어나면 서버가 finish를 400으로 막는다
export const HEART_MIN_BPM = 30;
export const HEART_MAX_BPM = 250;
export const HEART_MAX_SAMPLES = 3600;

export function recordHeartRate(bpm: number, at: number) {
  if (!getPreferences().heartRateSave) return;
  if (bpm < HEART_MIN_BPM || bpm > HEART_MAX_BPM) return;
  // 기기로 기록 중인 러닝만 (개발용 가짜 러닝 · 일시정지 중은 없음)
  const runUuid = runningRunUuid();
  if (!runUuid) return;
  void getRunStore()
    .then((store) => store.appendHeartRate(runUuid, at, bpm))
    .catch((e) => console.warn('[heart] save', e));
}

/** 서버에 보낼 심박. 범위 밖은 빼고, 너무 많으면 고르게 줄인다 */
export function heartRatePayload(samples: HeartRateSample[]): { recordedAt: string; bpm: number }[] | undefined {
  const ok = samples.filter((h) => h.bpm >= HEART_MIN_BPM && h.bpm <= HEART_MAX_BPM);
  if (!ok.length) return undefined;
  const step = Math.ceil(ok.length / HEART_MAX_SAMPLES);
  return ok.filter((_, i) => i % step === 0).map((h) => ({ recordedAt: new Date(h.recordedAt).toISOString(), bpm: h.bpm }));
}
