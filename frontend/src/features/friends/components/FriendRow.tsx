import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { AppPressable, AppText } from '@/design/primitives';
import { fontFamily, spacing, touchTarget } from '@/design/tokens';

type Props = {
  nickname: string;
  imageUrl: string | null;
  caption?: string;
  // 누르면 프로필 (없으면 누를 수 없다)
  onPress?: () => void;
  // 오른쪽 버튼들 (요청 · 수락 · 취소)
  trailing?: ReactNode;
};

// 친구 · 요청 · 검색 결과 한 줄. 이름 쪽을 누르면 프로필, 오른쪽은 관계 버튼
export function FriendRow({ nickname, imageUrl, caption, onPress, trailing }: Props) {
  const body = (
    <>
      <Avatar nickname={nickname} imageUrl={imageUrl} size={44} />
      <View style={styles.text}>
        <AppText role="body" numberOfLines={1} style={styles.name}>
          {nickname}
        </AppText>
        {caption ? (
          <AppText role="caption" tone="secondary" numberOfLines={1}>
            {caption}
          </AppText>
        ) : null}
      </View>
    </>
  );
  return (
    <View style={styles.row}>
      {onPress ? (
        <AppPressable onPress={onPress} accessibilityRole="button" accessibilityLabel={[nickname, caption].filter(Boolean).join(', ')} accessibilityHint="프로필을 열어요" style={styles.main}>
          {body}
        </AppPressable>
      ) : (
        <View style={styles.main} accessible accessibilityLabel={[nickname, caption].filter(Boolean).join(', ')}>
          {body}
        </View>
      )}
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touchTarget.min + spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  main: {
    flex: 1,
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: fontFamily.bold,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
