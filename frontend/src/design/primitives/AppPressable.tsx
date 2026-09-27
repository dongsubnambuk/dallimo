import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { disabledOpacity, pressedOpacity, touchTarget } from '../tokens';

export type AppPressableProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  // 시각 스타일은 호출하는 컴포넌트가 정한다. 여기서는 pressed/disabled 피드백과 최소 터치 영역만 보장한다.
  // 'none'이면 pressed/disabled 표현을 호출하는 컴포넌트가 직접 그린다.
  feedback?: 'opacity' | 'none';
};

export function AppPressable({
  style,
  disabled,
  feedback = 'opacity',
  accessibilityRole = 'button',
  accessibilityState,
  ...props
}: AppPressableProps) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        { minHeight: touchTarget.min, justifyContent: 'center' },
        typeof style === 'function' ? style({ pressed }) : style,
        feedback === 'none'
          ? null
          : disabled
            ? { opacity: disabledOpacity }
            : pressed
              ? { opacity: pressedOpacity }
              : null,
      ]}
      {...props}
    />
  );
}
