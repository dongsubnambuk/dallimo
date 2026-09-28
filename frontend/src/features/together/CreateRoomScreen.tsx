import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterChip } from '@/components/FilterChip';
import { PlayModeCard } from '@/components/PlayModeCard';
import { SecondaryButton } from '@/components/SecondaryButton';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { createMockCourseRepository } from '@/entities/course/api/mockCourseRepository';
import { createMockLiveRoomRepository } from '@/entities/live/api/mockLiveRoomRepository';
import type { LiveMode } from '@/entities/live/types';
import { formatDistanceKm } from '@/shared/format';
import { useNow } from '@/shared/useNow';

import { goalLabel, MODE_INFO, startLabel } from './labels';

const MODES: LiveMode[] = ['LIVE_RACE', 'TIME_ATTACK', 'TOGETHER'];
const DISTANCES = [3000, 5000, 10000];
const DURATIONS = [1200, 1800, 3600];
// 시작 시간: 모두 준비되면 / N분 뒤
const STARTS: { label: string; minutes: number | null }[] = [
  { label: '모두 준비되면', minutes: null },
  { label: '10분 뒤', minutes: 10 },
  { label: '30분 뒤', minutes: 30 },
  { label: '1시간 뒤', minutes: 60 },
];

// SCR-T02 방 생성 (TGT-001~002): 모드, 거리/시간, 시작 시간, 친구.
// 89장 "설정 화면 같은 radio list 금지" → 모드는 Play Mode와 같은 타일, 값은 칩 하나씩.
export function CreateRoomScreen({ courseId }: { courseId: string | null }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const repo = useMemo(() => createMockLiveRoomRepository('normal'), []);
  const courseRepo = useMemo(() => createMockCourseRepository('normal'), []);
  const course = useQuery({ queryKey: ['course', 'detail', courseId, 'normal'], queryFn: () => courseRepo.getDetail(courseId as string), enabled: courseId != null });
  const friends = useQuery({ queryKey: ['live', 'friends'], queryFn: () => repo.listFriends() });

  const [mode, setMode] = useState<LiveMode>('LIVE_RACE');
  const [distanceM, setDistanceM] = useState(5000);
  const [seconds, setSeconds] = useState(1800);
  const [startMin, setStartMin] = useState<number | null>(null);
  const [invitees, setInvitees] = useState<string[]>([]);

  // 코스로 만든 방은 코스 거리가 목표다. 시간 목표(타임 어택)는 코스와 맞지 않아 잠근다.
  const courseDistance = course.data?.distanceM ?? null;
  const timeGoal = mode === 'TIME_ATTACK';
  const goal = { mode, targetDistanceM: timeGoal ? null : (courseDistance ?? distanceM), targetSeconds: timeGoal ? seconds : null };
  const now = useNow(15_000);
  // 표시용 예상 시각. 실제 예약 시각은 만드는 순간 다시 계산한다.
  const scheduledAt = startMin == null ? null : now + startMin * 60_000;

  const create = useMutation({
    mutationFn: () => repo.create({ ...goal, courseId, scheduledAt: scheduleFromNow(startMin), inviteeIds: invitees }),
    onSuccess: (room) => router.replace({ pathname: '/together/[roomId]', params: { roomId: room.id } }),
  });

  const toggle = (id: string) => setInvitees((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  const back = () => (router.canGoBack() ? router.back() : router.replace('/together'));

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppPressable onPress={back} accessibilityLabel="뒤로" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </AppPressable>
        <AppText role="sectionTitle" accessibilityRole="header">
          방 만들기
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {courseId ? (
          <View style={[styles.courseLine, { backgroundColor: colors.bg.surface }]}>
            <AppIcon name="modeCourse" size={18} color={colors.text.primary} />
            <AppText role="label" style={styles.flex}>
              {course.data ? `${course.data.name} · ${formatDistanceKm(course.data.distanceM)}km` : '코스 불러오는 중'}
            </AppText>
          </View>
        ) : null}

        <Field title="어떻게 달릴까요">
          <View style={styles.modes} accessibilityRole="radiogroup">
            {MODES.map((m) => {
              const locked = m === 'TIME_ATTACK' && courseId != null;
              return (
                <PlayModeCard
                  key={m}
                  icon={MODE_INFO[m].icon}
                  title={MODE_INFO[m].title}
                  caption={MODE_INFO[m].caption}
                  state={locked ? 'locked' : mode === m ? 'selected' : 'default'}
                  lockedReason={locked ? '코스는 거리로만' : undefined}
                  onPress={() => setMode(m)}
                />
              );
            })}
          </View>
        </Field>

        <Field title={timeGoal ? '얼마나 달릴까요' : '몇 km 달릴까요'}>
          {courseDistance != null && !timeGoal ? (
            <AppText role="body" tone="secondary">
              코스 거리 {formatDistanceKm(courseDistance)}km
            </AppText>
          ) : (
            <View style={styles.chips}>
              {timeGoal
                ? DURATIONS.map((s) => <FilterChip key={s} label={`${s / 60}분`} selected={seconds === s} onPress={() => setSeconds(s)} />)
                : DISTANCES.map((d) => <FilterChip key={d} label={`${d / 1000}km`} selected={distanceM === d} onPress={() => setDistanceM(d)} />)}
            </View>
          )}
        </Field>

        <Field title="언제 시작할까요">
          <View style={styles.chips}>
            {STARTS.map((s) => (
              <FilterChip key={s.label} label={s.label} selected={startMin === s.minutes} onPress={() => setStartMin(s.minutes)} />
            ))}
          </View>
          <AppText role="caption" tone="secondary" tabular>
            {scheduledAt == null ? '참가한 사람이 모두 준비하면 5초 뒤 출발해요' : `${startLabel(scheduledAt, now)} 출발`}
          </AppText>
        </Field>

        <Field title="누구와 달릴까요">
          {friends.data?.map((f) => {
            const on = invitees.includes(f.userId);
            return (
              <AppPressable
                key={f.userId}
                onPress={() => toggle(f.userId)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={f.name}
                style={styles.friend}
              >
                <View style={[styles.avatar, { backgroundColor: colors.bg.surface }]}>
                  <AppText role="label" style={styles.bold}>
                    {f.name.slice(0, 1)}
                  </AppText>
                </View>
                <AppText role="body" style={styles.flex}>
                  {f.name}
                </AppText>
                <View style={[styles.check, on ? { backgroundColor: colors.action.secondary } : { borderColor: colors.border.strong, borderWidth: 1.5 }]}>
                  {on ? <AppIcon name="check" size={16} color={colors.action.onSecondary} /> : null}
                </View>
              </AppPressable>
            );
          })}
        </Field>

        <View style={[styles.note, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="lock" size={16} color={colors.text.secondary} />
          <AppText role="caption" tone="secondary" style={styles.flex}>
            서로의 위치는 공유되지 않아요. 달리는 동안 거리와 진행률만 보여요.
          </AppText>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md, borderTopColor: colors.border.subtle }]}>
        <SecondaryButton
          label={invitees.length ? `${goalLabel(goal)} · ${invitees.length}명 초대하기` : '함께 달릴 친구를 골라 주세요'}
          emphasized
          disabled={invitees.length === 0 || create.isPending || (courseId != null && !course.data)}
          onPress={() => create.mutate()}
        />
        {create.isError ? (
          <AppText role="caption" tone="warning" style={styles.center}>
            방을 만들지 못했어요. 다시 시도해 주세요.
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

// 예약 시각은 방을 만드는 순간을 기준으로 정한다
function scheduleFromNow(minutes: number | null) {
  return minutes == null ? null : Date.now() + minutes * 60_000;
}

function Field({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <AppText role="sectionTitle" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    minHeight: touchTarget.min + spacing.sm,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  round: {
    width: touchTarget.min - 4,
    height: touchTarget.min - 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: spacing.lg,
    gap: spacing.xxl,
  },
  courseLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.control,
    padding: spacing.md,
  },
  field: {
    gap: spacing.md,
  },
  modes: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  friend: {
    minHeight: touchTarget.min + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.control,
    padding: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  flex: {
    flex: 1,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
  center: {
    textAlign: 'center',
  },
});
