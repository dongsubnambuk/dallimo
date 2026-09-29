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
  // 도전은 판정 카드를 먼저 보여주고, 코스로 가는 것은 받은 사람이 고른다
  const challenge = t != null && t.type === 'CHALLENGE' && t.preview?.challenge != null;

  useEffect(() => {
    if (!t || freeRun || challenge) return;
    if (t.type === 'LIVE_ROOM') router.replace({ pathname: '/together/[roomId]', params: { roomId: t.referenceId, invite: code } });
    else if (t.courseId) router.replace({ pathname: '/course/[id]', params: { id: t.courseId } });
    else router.replace({ pathname: '/my/runs/[id]', params: { id: t.referenceId } });
  }, [t, freeRun, challenge, code]);

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
      ) : challenge && t ? (
        <SharedChallenge target={t} />
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

// SHR-003 도전 공유: 누가 누구 기록에 도전했고 어떻게 끝났는지
function SharedChallenge({ target }: { target: ShareTarget }) {
  const p = target.preview!;
  const c = p.challenge!;
  const course = p.courseName ?? '코스';
  const title =
    c.status === 'SUCCESS'
      ? `${c.challengerName}님이 ${c.challengedName}님의 기록을 넘었어요`
      : c.status === 'FAILED'
        ? `${c.challengedName}님이 도전을 막아냈어요`
        : `${c.challengerName}님이 ${c.challengedName}님의 기록에 도전해요`;
  const body = [course, `목표 ${formatDuration(c.targetSec)}`, p.recordSec != null ? `도전 기록 ${formatDuration(p.recordSec)}` : null].filter(Boolean).join(' · ');
  const courseId = target.courseId;
  return (
    <StateNotice
      icon="modeRival"
      title={title}
      body={body}
      actions={
        <View style={styles.actions}>
          {courseId ? (
            <SecondaryButton label="이 코스 보기" size="sm" emphasized onPress={() => router.replace({ pathname: '/course/[id]', params: { id: courseId } })} />
          ) : null}
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
