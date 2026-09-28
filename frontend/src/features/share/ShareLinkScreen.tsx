import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';
import { shareRepository } from '@/entities/share/api/mockShareRepository';

// SHR-004 공유 링크 열기: dallimo://share/{code} → GET /shares/{code}로 대상을 알아내 알맞은 화면으로 바꾼다.
// 코스가 있으면 코스 상세(받은 사람도 같은 코스를 달리게), 없으면 기록 상세.
export function ShareLinkScreen({ code }: { code: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const target = useQuery({ queryKey: ['share', code], queryFn: () => shareRepository.resolve(code), retry: false });

  useEffect(() => {
    const t = target.data;
    if (!t) return;
    if (t.courseId) router.replace({ pathname: '/course/[id]', params: { id: t.courseId } });
    else router.replace({ pathname: '/my/runs/[id]', params: { id: t.referenceId } });
  }, [target.data]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top + spacing.xl }]}>
      {target.isError ? (
        <StateNotice
          icon="warning"
          title="공유 링크를 열 수 없어요"
          body="링크가 만료됐거나 잘못된 주소예요."
          actions={<SecondaryButton label="탐색으로" size="sm" onPress={() => router.replace('/')} />}
        />
      ) : (
        <View style={styles.center}>
          <BrandLoader size={48} label="공유 링크 여는 중" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
