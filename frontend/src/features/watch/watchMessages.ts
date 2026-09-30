import { targetGapSec } from '@/entities/run/courseProgress';
import { getRunPolicySync } from '@/entities/run/policy';
import { flatStepTitle } from '@/entities/workout/labels';
import { intervalNow } from '@/entities/workout/tracker';
import type { FlatStep } from '@/entities/workout/types';
import { runNoticeOf } from '@/features/active-run/runNotice';
import { activeMs, type ActiveRunSnapshot } from '@/features/run/engine/runningEngine';
import { formatDistanceKm, formatDuration, formatPace } from '@/shared/format';
import type { HapticKind } from '@/shared/haptics';

// 휴대폰 → 워치 메시지 (targets/watch/PhoneLink.swift가 읽는다). 워치는 받은 문구를 그대로 보여 주고 시간만 스스로 센다.
// 값은 plist로 보내므로 숫자 · 문자열 · 불리언만 쓴다. v를 올리면 워치 앱도 함께 바꾼다.
export const WATCH_PROTOCOL = 1;

// 모드별 한 줄 (휴대폰 ModeStrip · IntervalPanel · 함께 달리기 순위와 같은 내용)
export type WatchStrip = { label: string; value: string; tone: 'accent' | 'warning' | 'neutral' };

export type WatchRunMessage = {
  t: 'run';
  v: number;
  status: ActiveRunSnapshot['status'];
  // 시간이 흐르고 있나 (워치가 activeMs + (지금 - sentAt)로 센다)
  running: boolean;
  title: string;
  distanceKm: string;
  activeMs: number;
  sentAt: number;
  pace: string;
  notice?: string;
  noticeTone?: 'warning' | 'neutral' | 'success';
  stripLabel?: string;
  stripValue?: string;
  stripTone?: WatchStrip['tone'];
  // 직접 넘기는 인터벌 구간이면 워치에 "다음 구간"
  manualStep: boolean;
  // 코스 완주 · 인터벌을 모두 마쳤으면 확인 없이 저장 (휴대폰과 같다)
  completed: boolean;
  saveLabel: string;
  // 일시정지 · 끝내기를 워치에서 할 수 있나
  canPause: boolean;
  canFinish: boolean;
  // 워치 끝내기 버튼 · 확인 문구 (함께 달리기는 "그만두기")
  finishLabel: string;
};

export type WatchRunContext = {
  title: string;
  strip: WatchStrip | null;
  manualStep?: boolean;
  completed?: boolean;
  saveLabel?: string;
  canPause?: boolean;
  canFinish?: boolean;
  finishLabel?: string;
};

export function runMessage(s: ActiveRunSnapshot, now: number, sentAt: number, ctx: WatchRunContext): WatchRunMessage {
  const notice = runNoticeOf({
    status: s.status,
    gps: s.gps,
    network: s.network,
    autoPaused: s.autoPaused,
    offRouteM: s.course?.offRouteM ?? null,
    completedMs: s.course?.completedActiveMs ?? null,
  });
  return {
    t: 'run',
    v: WATCH_PROTOCOL,
    status: s.status,
    running: s.runningSince != null,
    title: ctx.title,
    distanceKm: formatDistanceKm(s.distanceM),
    activeMs: Math.round(activeMs(s, now)),
    sentAt,
    pace: formatPace(s.avgPaceSec),
    ...(notice ? { notice: notice.short, noticeTone: notice.tone } : {}),
    ...(ctx.strip ? { stripLabel: ctx.strip.label, stripValue: ctx.strip.value, stripTone: ctx.strip.tone } : {}),
    manualStep: ctx.manualStep ?? false,
    completed: ctx.completed ?? false,
    saveLabel: ctx.saveLabel ?? '기록 저장',
    canPause: ctx.canPause ?? true,
    canFinish: ctx.canFinish ?? true,
    finishLabel: ctx.finishLabel ?? '끝내기',
  };
}

export type SoloStripContext = {
  target: { sec: number; label: string } | null;
  flat: FlatStep[] | null;
};

/** 혼자 달리기(자유 · 코스 · PB · 도전 · 인터벌)의 워치 한 줄 */
export function soloStrip(s: ActiveRunSnapshot, now: number, ctx: SoloStripContext): WatchStrip | null {
  const ms = activeMs(s, now);
  if (ctx.flat) {
    const n = intervalNow(ctx.flat, s.interval?.boundaries ?? [], { activeMs: ms, distanceM: s.distanceM });
    if (!n.step) return { label: '인터벌', value: '모두 마쳤어요', tone: 'accent' };
    const r = n.remaining;
    const value = r.kind === 'distance' ? `${Math.ceil(r.m)}m 남음` : r.kind === 'time' ? `${formatDuration(Math.ceil(r.sec))} 남음` : `${formatDuration(n.elapsedSec)} 지남`;
    return { label: `${flatStepTitle(n.step)} · ${n.index + 1}/${ctx.flat.length}`, value, tone: n.step.stepType === 'WORK' ? 'accent' : 'neutral' };
  }
  const c = s.course;
  if (!c) return { label: '현재 페이스', value: formatPace(s.currentPaceSec), tone: 'neutral' };
  const done = c.completedActiveMs != null;
  if ((s.mode === 'PB' || s.mode === 'CHALLENGE') && ctx.target) {
    const label = s.mode === 'CHALLENGE' ? `${ctx.target.label}님 기록` : '목표';
    if (c.progressM < getRunPolicySync().minPaceSampleM) return { label, value: '--', tone: 'neutral' };
    const sec = Math.round(done ? c.completedActiveMs! / 1000 : ms / 1000);
    const gap = Math.round(targetGapSec(done ? c.lengthM : c.progressM, c.lengthM, sec, ctx.target.sec));
    if (gap === 0) return { label, value: '같아요', tone: 'neutral' };
    return gap < 0 ? { label, value: `${formatDuration(-gap)} 빨라요`, tone: 'accent' } : { label, value: `${formatDuration(gap)} 느려요`, tone: 'warning' };
  }
  if (done) return { label: '코스 완주', value: formatDuration(Math.round(c.completedActiveMs! / 1000)), tone: 'accent' };
  const ratio = Math.min(1, c.progressM / c.lengthM);
  return { label: '코스 진행', value: `${Math.floor(ratio * 100)}% · ${formatDistanceKm(Math.max(0, c.lengthM - c.progressM))}km 남음`, tone: 'neutral' };
}

/** 직접 넘기는 인터벌 구간인가 */
export function isManualStep(s: ActiveRunSnapshot, flat: FlatStep[] | null): boolean {
  if (!flat) return false;
  const step = flat[Math.min(s.interval?.boundaries.length ?? 0, flat.length)];
  return step?.endConditionType === 'MANUAL';
}

// WATCH-004 햅틱: 휴대폰 햅틱과 같은 때, 1km마다 한 번 더 (워치는 손목이라 음성 대신)
export type WatchCue = HapticKind | 'split';

export const cueMessage = (kind: WatchCue) => ({ t: 'cue', kind });

// 카운트다운: 휴대폰과 같은 숫자를 워치에도 (0이면 "출발")
export const countdownMessage = (title: string, count: number) => ({ t: 'countdown', v: WATCH_PROTOCOL, title, count });

// 저장한 뒤 워치 요약. runUuid는 워치가 건강 앱에 남기는 운동 메타데이터(DallimoClientRunUuid)로 쓴다 (가져오기 후보에서 빠진다)
export function endMessage(r: { clientRunUuid: string; distanceM: number; activeSec: number; avgPaceSec: number | null }, title: string) {
  return { t: 'end', v: WATCH_PROTOCOL, title, runUuid: r.clientRunUuid, distanceKm: formatDistanceKm(r.distanceM), time: formatDuration(r.activeSec), pace: formatPace(r.avgPaceSec) };
}

// 러닝이 없다 (취소 · 다른 화면). 워치는 운동을 저장하지 않고 끝낸다
export const idleMessage = () => ({ t: 'idle', v: WATCH_PROTOCOL });
