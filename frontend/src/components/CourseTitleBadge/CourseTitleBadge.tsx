import { View } from 'react-native';

import { AppIcon, type IconName } from '@/design/primitives';
import { useTheme } from '@/design/theme';

// 124장 코스 타이틀 표시 (127장 CourseCrownBadge · LocalLegendRow의 줄 안 표시).
// 크라운은 최근 최고 기록, 로컬 레전드는 최근 최다 완주. 색이 아니라 모양(왕관 · 불꽃)과 읽는 이름으로 구분한다.
export type CourseTitleKind = 'crown' | 'legend';

export const COURSE_TITLE_LABEL: Record<CourseTitleKind, string> = {
  crown: '코스 크라운',
  legend: '로컬 레전드',
};

const ICON: Record<CourseTitleKind, IconName> = { crown: 'crown', legend: 'legend' };

export function CourseTitleBadge({ kind, size = 14 }: { kind: CourseTitleKind; size?: number }) {
  const { colors } = useTheme();
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={COURSE_TITLE_LABEL[kind]}>
      <AppIcon name={ICON[kind]} size={size} color={kind === 'crown' ? colors.text.accent : colors.status.warning} />
    </View>
  );
}
