import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';
import { getShareRepository } from '@/entities/share/api';
import type { ShareTarget } from '@/entities/share/types';
import { formatDistanceKm, formatDuration, formatPace } from '@/shared/format';

// SHR-004 공유 링크 열기: 공유 페이지(/s/{code}) → dallimo://share/{code} → GET /shares/{code}로 대상을 알아내 알맞은 화면으로 바꾼다.
// 함께 달리기 초대는 그 방 대기실(초대 코드 포함), 코스 · 코스 기록은 코스 상세(받은 사람도 같은 코스를 달리게).
// 코스 없는 기록은 공유한 사람의 숫자만 보여준다 (경로는 보내지 않는다).
export function ShareLinkScreen({ code }: { code: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const repo = useMemo(() => getShareRepository(), []);
  const target = useQuery({ queryKey: ['share', code], queryFn: () => repo.resolve(code), retry: false });
  const t = target.data;
  const freeRun = t != null && t.type === 'RUN' && t.courseId == null && t.preview != null;

  useEffect(() => {
    if (!t || freeRun) return;
    if (t.type === 'LIVE_ROOM') router.replace({ pathname: '/together/[roomId]', params: { roomId: t.referenceId, invite: code } });
    else if (t.courseId) router.replace({ pathname: '/course/[id]', params: { id: t.courseId } });
    else router.replace({ pathname: '/my/runs/[id]', params: { id: t.referenceId } });
  }, [t, freeRun, code]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top + spacing.xl }]}>
      {target.isError ? (
        <StateNotice
          icon="warning"
          title="공유 링크를 열 수 없어요"
          body="링크가 만료됐거나 잘못된 주소예요."
          actions={<SecondaryButton label="탐색으로" size="sm" onPress={() => router.replace('/')} />}
        />
      ) : freeRun && t ? (
        <SharedRun target={t} />
      ) : (
        <View style={styles.center}>
          <BrandLoader size={48} label="공유 링크 여는 중" />
        </View>
      )}
    </View>
  );
}

function SharedRun({ target }: { target: ShareTarget }) {
  const p = target.preview!;
  const time = p.recordSec ?? p.elapsedSec;
  return (
    <StateNotice
      icon="share"
      title={`${p.sharerName}님의 달리기 기록`}
      body={`${formatDistanceKm(p.distanceM ?? 0)}km · ${formatDuration(time)} · ${formatPace(p.avgPaceSec)}/km`}
      actions={
        <View style={styles.actions}>
          <SecondaryButton label="나도 달리기" size="sm" emphasized onPress={() => router.replace('/run')} />
          <SecondaryButton label="탐색으로" size="sm" onPress={() => router.replace('/')} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
