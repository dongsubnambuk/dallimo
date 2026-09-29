import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { PlayModeCard } from '@/components/PlayModeCard';
import { PrimaryRunButton } from '@/components/PrimaryRunButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import type { CourseDetail } from '@/entities/course/types';
import type { PlayModeKey, RunPlan } from '@/entities/run/types';
import { AppIcon, AppPressable, AppText, type IconName } from '@/design/primitives';
import { ThemeProvider, useTheme } from '@/design/theme';
import { elevation, fontFamily, OBLIQUE_SKEW, radius, spacing } from '@/design/tokens';
import { formatDistanceKm, formatDuration, formatPace } from '@/shared/format';

import type { CourseScenario } from '../course/scenario';
import { useCourseDetail } from '../course/useCourseDetail';
import { getRecentPlayMode, setRecentPlayMode } from './recentPlayMode';

// 72장 4번 Play Mode Selector. 64장 PICK A PLAY MODE: 완주 / PB 어택 / 라이벌 / 함께.
// 89장: 하단 sheet. 같은 크기 카드 4개를 세로로 쌓지 않고, 가로 모드 타일 + 선택한 모드의 context-aware 목표 패널로 보여준다.
// 66장: 모드 3~5개, 설명 1줄, 최근 사용 강조, 행동은 하나(single primary action).

type ModeDef = { key: PlayModeKey; icon: IconName; title: string; caption: string };

const MODES: ModeDef[] = [
  { key: 'COURSE', icon: 'modeCourse', title: '완주', caption: '끝까지 달리기' },
  { key: 'PB', icon: 'modePB', title: 'PB 어택', caption: '내 기록 깨기' },
  { key: 'CHALLENGE', icon: 'modeRival', title: '라이벌', caption: '기록에 도전' },
  { key: 'TOGETHER', icon: 'modeTogether', title: '함께', caption: '친구와 동시에' },
];

// PB 어택 목표: PB 그대로 / 10초 / 30초 빠르게
const PB_OFFSETS = [0, 10, 30];

// recordId: 친구 공식 기록 (서버 도전을 만든다)
type RivalTarget = { id: string; icon: IconName; label: string; name: string; sec: number; recordId?: string };

export function PlayModeSheet({ id, scenario }: { id: string; scenario: CourseScenario }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const state = useCourseDetail(id, scenario);
  const close = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/course/[id]', params: { id } }));

  return (
    <View style={styles.root}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: SCRIM }]} onPress={close} accessibilityLabel="닫기" accessibilityRole="button" />
      <View style={[styles.sheet, { backgroundColor: colors.bg.elevated, paddingBottom: insets.bottom + spacing.lg, boxShadow: elevation.sheet }]}>
        <View style={[styles.handle, { backgroundColor: colors.border.strong }]} />
        {state.kind === 'ready' ? (
          <SheetBody course={state.course} onClose={close} />
        ) : state.kind === 'loading' ? (
          <View style={styles.loading}>
            <BrandLoader size={40} label="코스 정보 불러오는 중" />
          </View>
        ) : (
          <View style={styles.loading}>
            <AppText role="body" tone="secondary">
              코스 정보를 불러오지 못했어요.
            </AppText>
            <SecondaryButton label="닫기" size="sm" onPress={close} />
          </View>
        )}
      </View>
    </View>
  );
}

function SheetBody({ course, onClose }: { course: CourseDetail; onClose: () => void }) {
  const me = course.myRecord;
  const comp = course.competition;
  const rivals = rivalTargets(course);
  const locked: Partial<Record<PlayModeKey, string>> = {
    ...(me ? {} : { PB: '완주하면 열려요' }),
    ...(rivals.length > 0 ? {} : { CHALLENGE: comp ? '인증 기록이 아직 없어요' : '랭킹을 불러오지 못했어요' }),
  };
  const recent = getRecentPlayMode();
  // context-aware 기본값: 최근 모드 → 기록이 있으면 PB 어택 → 완주
  const initial: PlayModeKey = recent && !locked[recent] ? recent : me ? 'PB' : 'COURSE';
  const [mode, setMode] = useState<PlayModeKey>(initial);
  const [pbOffset, setPbOffset] = useState(0);
  const [rivalId, setRivalId] = useState(rivals[0]?.id ?? null);
  const rival = rivals.find((r) => r.id === rivalId) ?? rivals[0] ?? null;

  const start = () => {
    setRecentPlayMode(mode);
    if (mode === 'TOGETHER') {
      // 코스로 함께 달릴 방을 만든다 (SCR-T02). 뒤로 가면 코스 상세로 돌아온다.
      router.replace({ pathname: '/together/new', params: { courseId: course.id } });
      return;
    }
    const plan: RunPlan =
      mode === 'PB' && me
        ? { mode: 'PB', courseId: course.id, targetSec: me.bestSec - pbOffset, targetLabel: pbOffset ? `내 PB −${pbOffset}초` : '내 PB' }
        : mode === 'CHALLENGE' && rival
          ? { mode: 'CHALLENGE', courseId: course.id, targetSec: rival.sec, targetLabel: rival.name, ...(rival.recordId ? { targetRecordId: rival.recordId } : {}) }
          : { mode: 'COURSE', courseId: course.id };
    // Run Ready는 72장 5번 단계. 선택 결과를 달리기 탭으로 넘긴다.
    router.dismissTo({
      pathname: '/run',
      params: {
        mode: plan.mode,
        courseId: plan.courseId,
        courseName: course.name,
        ...(plan.targetSec != null ? { targetSec: String(plan.targetSec), targetLabel: plan.targetLabel } : {}),
        ...(plan.targetRecordId ? { targetRecordId: plan.targetRecordId } : {}),
      },
    });
  };

  const cta =
    mode === 'COURSE'
      ? '완주 시작'
      : mode === 'PB'
        ? `${formatDuration((me?.bestSec ?? 0) - pbOffset)} 목표로 시작`
        : mode === 'CHALLENGE'
          ? `${rival?.name ?? '라이벌'} 기록에 도전`
          : '함께 달릴 방 만들기';

  return (
    <View style={styles.body}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <AppText role="label" tone="secondary" numberOfLines={1}>
            {course.name} · {formatDistanceKm(course.distanceM, 1)}km
          </AppText>
          <AppText role="screenTitle" accessibilityRole="header" style={styles.title}>
            어떻게 달릴까요?
          </AppText>
        </View>
        <AppPressable onPress={onClose} accessibilityLabel="닫기" style={styles.closeButton}>
          <AppIcon name="close" size={22} />
        </AppPressable>
      </View>

      <View style={styles.modes} accessibilityRole="radiogroup">
        {MODES.map((m) => (
          <PlayModeCard
            key={m.key}
            icon={m.icon}
            title={m.title}
            caption={m.caption}
            state={locked[m.key] ? 'locked' : mode === m.key ? 'selected' : 'default'}
            lockedReason={locked[m.key]}
            recent={recent === m.key}
            onPress={() => setMode(m.key)}
          />
        ))}
      </View>

      <ThemeProvider scheme="dark">
        <TargetPanel
          course={course}
          mode={mode}
          pbOffset={pbOffset}
          onPbOffset={setPbOffset}
          rivals={rivals}
          rivalId={rival?.id ?? null}
          onRival={setRivalId}
        />
      </ThemeProvider>

      <PrimaryRunButton label={cta} onPress={start} />
    </View>
  );
}

// 선택한 모드의 목표 (context-aware target, 89장)
function TargetPanel({
  course,
  mode,
  pbOffset,
  onPbOffset,
  rivals,
  rivalId,
  onRival,
}: {
  course: CourseDetail;
  mode: PlayModeKey;
  pbOffset: number;
  onPbOffset: (s: number) => void;
  rivals: RivalTarget[];
  rivalId: string | null;
  onRival: (id: string) => void;
}) {
  const { colors } = useTheme();
  const me = course.myRecord;

  let content;
  if (mode === 'COURSE') {
    content = (
      <>
        <Big value={formatDistanceKm(course.distanceM, 1)} unit="km" sub={`예상 ${Math.round(course.estimatedSec / 60)}분`} />
        <AppText role="label" tone="secondary">
          끝까지 완주하면 인증 기록이 남고 이번 주 랭킹에 올라가요.
        </AppText>
      </>
    );
  } else if (mode === 'PB' && me) {
    const target = me.bestSec - pbOffset;
    content = (
      <>
        <Big value={formatDuration(target)} accent sub={`km당 ${formatPace(Math.round(target / (course.distanceM / 1000)))}`} />
        <AppText role="label" tone="secondary">
          이 기록으로 달리는 과거의 나와 실시간으로 몇 초 차이인지 알려줘요.
        </AppText>
        <View style={styles.options} accessibilityRole="radiogroup">
          {PB_OFFSETS.map((o) => (
            <OptionChip key={o} label={o === 0 ? 'PB 그대로' : `${o}초 빠르게`} selected={pbOffset === o} onPress={() => onPbOffset(o)} />
          ))}
        </View>
      </>
    );
  } else if (mode === 'CHALLENGE') {
    content = (
      <>
        <AppText role="label" tone="secondary">
          인증된 기록만 목표로 삼을 수 있어요. 달리는 동안 상대 기록과 차이를 보여줘요.
        </AppText>
        <View accessibilityRole="radiogroup" style={styles.rivals}>
          {rivals.map((r) => {
            const on = r.id === rivalId;
            const gap = me ? me.bestSec - r.sec : null;
            return (
              <AppPressable
                key={r.id}
                onPress={() => onRival(r.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${r.label} ${r.name} ${formatDuration(r.sec)}`}
                style={[styles.rival, { borderColor: on ? colors.action.primary : colors.border.subtle, backgroundColor: on ? colors.action.tint : 'transparent' }]}
              >
                <AppIcon name={r.icon} size={16} color={on ? colors.action.primary : colors.text.secondary} />
                <View style={styles.flex}>
                  <AppText role="caption" tone="secondary">
                    {r.label}
                  </AppText>
                  <AppText role="label" style={styles.rivalName} numberOfLines={1}>
                    {r.name}
                  </AppText>
                </View>
                <View style={styles.rivalRight}>
                  <AppText role="sectionTitle" tabular style={styles.rivalTime}>
                    {formatDuration(r.sec)}
                  </AppText>
                  {gap != null && gap > 0 ? (
                    <AppText role="caption" tone="secondary" tabular>
                      내 PB보다 {formatDuration(gap)} 빠름
                    </AppText>
                  ) : null}
                </View>
              </AppPressable>
            );
          })}
        </View>
      </>
    );
  } else {
    content = (
      <>
        <View style={styles.togetherRow}>
          <AppIcon name="modeTogether" size={28} color={colors.action.primary} />
          <AppText role="sectionTitle" style={styles.togetherTitle}>
            같은 시간에 출발해요
          </AppText>
        </View>
        <AppText role="label" tone="secondary">
          친구를 초대해 이 코스를 같이 달려요. 떨어져 있어도 서로 위치 대신 진행률만 보여요.
        </AppText>
      </>
    );
  }

  return <View style={[styles.panel, { backgroundColor: colors.bg.canvas }]}>{content}</View>;
}

function Big({ value, unit, sub, accent }: { value: string; unit?: string; sub?: string; accent?: boolean }) {
  return (
    <View style={styles.big}>
      <AppText role="metricLarge" tone={accent ? 'accent' : 'primary'} tabular style={styles.bigValue}>
        {value}
      </AppText>
      {unit ? (
        <AppText role="label" tone="secondary">
          {unit}
        </AppText>
      ) : null}
      {sub ? (
        <AppText role="label" tone="secondary" tabular style={styles.bigSub}>
          {sub}
        </AppText>
      ) : null}
    </View>
  );
}

function OptionChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <AppPressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      hitSlop={6}
      style={[styles.option, { backgroundColor: selected ? colors.action.primary : colors.bg.elevated }]}
    >
      <AppText role="label" style={[styles.optionText, { color: selected ? colors.action.onPrimary : colors.text.primary }]}>
        {label}
      </AppText>
    </AppPressable>
  );
}

// 라이벌 후보: 코스 1위, 친구 최고, 이번 주 상위 기록 (중복 이름 제외). 검증된 기록만 (980행: 검증된 기록만 목표로 사용).
function rivalTargets(course: CourseDetail): RivalTarget[] {
  const comp = course.competition;
  if (!comp) return [];
  const out: RivalTarget[] = [];
  const leader = comp.weeklyTop[0];
  if (comp.leaderSec != null) out.push({ id: 'leader', icon: 'trophy', label: '코스 1위', name: leader?.name ?? '1위', sec: comp.leaderSec });
  // 친구 기록은 서버 도전으로 달린다 (CHL-001, 결과가 친구에게도 보인다). 나머지는 목표로만
  if (comp.friendBest) out.push({ id: 'friend', icon: 'tabTogether', label: '친구 최고 · 도전', name: comp.friendBest.name, sec: comp.friendBest.timeSec, recordId: comp.friendBest.recordId });
  for (const e of comp.weeklyTop.slice(1)) {
    if (out.length >= 3) break;
    if (!out.some((o) => o.name === e.name)) out.push({ id: `w${e.rank}`, icon: 'rankUp', label: `이번 주 ${e.rank}위`, name: e.name, sec: e.timeSec });
  }
  return out;
}

const SCRIM = 'rgba(0, 0, 0, 0.45)';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: spacing.huge - spacing.xs,
    height: spacing.xs + 1,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
  },
  loading: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.huge,
  },
  body: {
    gap: spacing.lg,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
  },
  closeButton: {
    width: 44,
    alignItems: 'center',
  },
  modes: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  panel: {
    borderRadius: radius.sheet,
    borderCurve: 'continuous',
    padding: spacing.lg + spacing.xs,
    gap: spacing.md,
    minHeight: 150,
  },
  big: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  bigValue: {
    fontSize: 40,
    lineHeight: 46,
    transform: [{ skewX: OBLIQUE_SKEW }],
  },
  bigSub: {
    marginLeft: spacing.sm,
  },
  options: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  option: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  optionText: {
    fontFamily: fontFamily.bold,
  },
  rivals: {
    gap: spacing.sm,
  },
  rival: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.card,
    borderWidth: 1.5,
  },
  rivalName: {
    fontFamily: fontFamily.bold,
  },
  rivalRight: {
    alignItems: 'flex-end',
  },
  rivalTime: {
    fontFamily: fontFamily.black,
    transform: [{ skewX: OBLIQUE_SKEW }],
  },
  togetherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  togetherTitle: {
    fontFamily: fontFamily.extrabold,
  },
  flex: {
    flex: 1,
  },
});
