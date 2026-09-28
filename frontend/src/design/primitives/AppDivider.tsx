import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing, type SpacingToken } from '../tokens';
import { useTheme } from '../theme';

export type AppDividerProps = {
  // hairline: 같은 그룹 안의 항목 구분. section: 정보 그룹 사이를 두꺼운 띠로 구분 (국내 앱에서 흔한 방식).
  variant?: 'hairline' | 'section';
  // hairline의 좌우 여백
  inset?: SpacingToken;
  style?: StyleProp<ViewStyle>;
};

const SECTION_BAND = spacing.sm;

export function AppDivider({ variant = 'hairline', inset, style }: AppDividerProps) {
  const { colors } = useTheme();
  const section = variant === 'section';

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { alignSelf: 'stretch' },
        section
          ? { height: SECTION_BAND, backgroundColor: colors.bg.surface }
          : { height: StyleSheet.hairlineWidth, backgroundColor: colors.border.subtle },
        !section && inset && { marginHorizontal: spacing[inset] },
        style,
      ]}
    />
  );
}
