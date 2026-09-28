import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// 69장 모션/햅틱 원칙. ACCESSIBILITY.md: 햅틱은 상태 변화의 보조 수단이며 끌 수 있어야 한다.
// 켜고 끄는 설정 화면은 72장 13번(Settings) 단계에서 붙인다. 그 전까지 앱을 켜 둔 동안만 기억한다.
let enabled = true;

export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

function run(fn: () => Promise<void>) {
  if (!enabled || Platform.OS === 'web') return;
  // 진동을 지원하지 않는 기기에서도 흐름은 계속된다
  fn().catch(() => undefined);
}

export const haptics = {
  // 카운트다운 각 숫자: 약한 햅틱
  countdownTick: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  // 출발: 강한 햅틱
  runStart: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
};
