import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing, type SpacingToken } from '../tokens';
import { useTheme } from '../theme';

export type AppDividerProps = {
  // 좌우 여백. 정보 그룹 구분용이며 장식용으로 쓰지 않는다.
  inset?: SpacingToken;
  style?: StyleProp<ViewStyle>;
};

export function AppDivider({ inset, style }: AppDividerProps) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.line,
        { backgroundColor: colors.border.subtle },
        inset && { marginHorizontal: spacing[inset] },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
});
