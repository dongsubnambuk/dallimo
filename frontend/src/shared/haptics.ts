import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// 69장 모션/햅틱 원칙. ACCESSIBILITY.md: 햅틱은 상태 변화의 보조 수단이며 끌 수 있어야 한다.
// 켜고 끄기는 설정 화면(SCR-M07)에서 하고 shared/preferences가 기기에 저장한다.
let enabled = true;

export type HapticKind = 'countdownTick' | 'runStart' | 'runControl' | 'warning' | 'intervalStep' | 'complete';

// WATCH-004: 달리는 동안 같은 햅틱을 Apple Watch에서도 울린다 (features/watch가 연결 중에만 둔다)
let mirror: ((kind: HapticKind) => void) | null = null;

export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

export function setHapticsMirror(fn: ((kind: HapticKind) => void) | null) {
  mirror = fn;
}

function run(kind: HapticKind, fn: () => Promise<void>) {
  if (!enabled) return;
  mirror?.(kind);
  if (Platform.OS === 'web') return;
  // 진동을 지원하지 않는 기기에서도 흐름은 계속된다
  fn().catch(() => undefined);
}

export const haptics = {
  // 카운트다운 각 숫자: 약한 햅틱
  countdownTick: () => run('countdownTick', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  // 출발: 강한 햅틱
  runStart: () => run('runStart', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  // 일시정지·재개: 누른 것이 반영됐다는 확인 (화면을 보지 않아도)
  runControl: () => run('runControl', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  // GPS 약함처럼 기록에 영향을 주는 상태 변화 경고
  warning: () => run('warning', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  // 인터벌 구간이 바뀔 때: 강한 햅틱 (화면을 보지 않아도 알게, 123.2장)
  intervalStep: () => run('intervalStep', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  // 69장 Finish: 완주 햅틱
  complete: () => run('complete', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
