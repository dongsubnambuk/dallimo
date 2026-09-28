import { Image } from 'expo-image';
import { View } from 'react-native';

import { AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius } from '@/design/tokens';

export type AvatarProps = {
  nickname: string;
  imageUrl: string | null;
  size?: number;
};

// 프로필 사진. 사진이 없으면 검정 원에 닉네임 첫 글자. 마이 · 설정이 함께 쓴다.
// 옆에 닉네임이 늘 같이 보이므로 스크린 리더에서는 숨긴다.
export function Avatar({ nickname, imageUrl, size = 52 }: AvatarProps) {
  const { colors } = useTheme();
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width: size, height: size, borderRadius: radius.pill, backgroundColor: colors.action.secondary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        <AppText role={size >= 72 ? 'screenTitle' : 'sectionTitle'} style={{ fontFamily: fontFamily.bold, color: colors.action.onSecondary }}>
          {nickname.slice(0, 1) || ' '}
        </AppText>
      )}
    </View>
  );
}
