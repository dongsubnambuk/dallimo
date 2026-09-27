import { View, type ViewProps } from 'react-native';

import { elevation, radius as radiusTokens, type RadiusToken } from '../tokens';
import { useTheme } from '../theme';

export type SurfaceLevel = 'canvas' | 'surface' | 'elevated';

export type AppSurfaceProps = ViewProps & {
  level?: SurfaceLevel;
  radius?: RadiusToken;
};

// 88.2장: 카드 남발 금지. elevated는 bottom sheet와 map overlay 용도로만 그림자를 갖는다.
export function AppSurface({ level = 'surface', radius, style, ...props }: AppSurfaceProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        { backgroundColor: colors.bg[level] },
        radius && { borderRadius: radiusTokens[radius], borderCurve: 'continuous' },
        level === 'elevated' && { boxShadow: elevation.mapOverlay },
        style,
      ]}
      {...props}
    />
  );
}
