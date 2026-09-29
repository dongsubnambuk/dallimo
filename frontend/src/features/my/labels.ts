import type { IconName } from '@/design/primitives';
import type { RunSummary } from '@/entities/run/history';
import type { RunResult } from '@/entities/run/result';
import { MODE_TITLE } from '@/features/run-ready/runPlanParams';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 기록 이름: 코스를 달렸으면 코스 이름, 인터벌이면 인터벌 이름, 아니면 모드 이름
export function runTitle(r: Pick<RunSummary, 'course' | 'mode'> & { workoutName?: string | null }): string {
  return r.course?.name ?? r.workoutName ?? MODE_TITLE[r.mode];
}

// 시작 시각 (run.started_at)
export function startedAt(r: Pick<RunSummary, 'startedAt'>): Date {
  return new Date(r.startedAt);
}

/** "오후 7:12" */
export function timeLabel(d: Date): string {
  const h = d.getHours();
  return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "9월 27일 (토)" */
export function dayLabel(d: Date): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]})`;
}

/** "2026년 9월 27일 (토) 오후 7:12" */
export function fullDateLabel(d: Date): string {
  return `${d.getFullYear()}년 ${dayLabel(d)} ${timeLabel(d)}`;
}

/** 히스토리 구역 제목. 올해면 "9월", 아니면 "2025년 12월" */
export function monthLabel(d: Date, now: Date): string {
  return d.getFullYear() === now.getFullYear() ? `${d.getMonth() + 1}월` : `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

// 목록에서 눈에 띄어야 하는 기록 상태만 표시한다. 인증된 보통 기록은 표시하지 않는다.
export type RunTag = { key: string; label: string; icon: IconName | null; tone: 'accent' | 'warning' | 'danger' | 'secondary' };

export function runTags(r: Pick<RunSummary, 'sync' | 'verification' | 'pb'> | Pick<RunResult, 'sync' | 'verification'>): RunTag[] {
  if (r.sync === 'localOnly') return [{ key: 'local', label: '휴대폰에만 저장', icon: 'offline', tone: 'secondary' }];
  if (r.sync === 'syncing') return [{ key: 'sync', label: '올리는 중', icon: 'pending', tone: 'secondary' }];
  const tags: RunTag[] = [];
  if ('pb' in r && r.pb === true) tags.push({ key: 'pb', label: 'PB', icon: null, tone: 'accent' });
  if (r.verification === 'pending') tags.push({ key: 'pending', label: '검증 중', icon: 'pending', tone: 'secondary' });
  if (r.verification === 'unverified') tags.push({ key: 'unverified', label: '미인증', icon: 'unverified', tone: 'warning' });
  if (r.verification === 'rejected') tags.push({ key: 'rejected', label: '인증 거부', icon: 'rejected', tone: 'danger' });
  return tags;
}

/** 누적 시간. 3725 → "1시간 2분", 1500 → "25분" */
export function hoursLabel(sec: number): string {
  const total = Math.round(sec / 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}분`;
  return m === 0 ? `${h.toLocaleString('ko-KR')}시간` : `${h.toLocaleString('ko-KR')}시간 ${m}분`;
}
