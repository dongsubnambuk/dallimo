import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/Brand';
import { CourseCard } from '@/components/CourseCard';
import { CourseMapPreview } from '@/components/CourseMapPreview';
import { GapIndicator } from '@/components/GapIndicator';
import { ParticipantChip } from '@/components/ParticipantChip';
import { PlayModeCard } from '@/components/PlayModeCard';
import { RankingRow } from '@/components/RankingRow';
import { SecondaryButton } from '@/components/SecondaryButton';
import { VerificationBadge } from '@/components/VerificationBadge';
import { MOCK_COURSE_ROUTES } from '@/entities/course/api/mockCourseRoutes';
import { AppIcon, AppPressable, AppText, type IconName } from '@/design/primitives';
import { ThemeProvider, useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';

import { markIntroSeen, useOnboarding } from './onboardingState';

// 첫 실행 소개 (결정 로그 64 · 84항). 로그인 전에 한 번만.
// 서비스 전체를 6장으로 보여 준다. 첫 장은 한 장만 봐도 어떤 앱인지 알 수 있게 핵심 흐름(코스 → 달리기 → 인증 → 랭킹)을,
// 다음 장들은 그 흐름의 각 단계와 함께 달리기 · 기기 연동을 실제 화면 컴포넌트와 기능 세 줄로 보여 준다 (CLAUDE.md 2항 central loop).
// 길게 느껴지면 어느 장에서든 건너뛰기 · 로그인. 끝나면 가입 → 러너 정보 → 권한 → 탐색.
// 로그인 화면과 같은 dark 바탕. 건너뛰거나 끝까지 보면 다시 보이지 않는다.

const route = (id: keyof typeof MOCK_COURSE_ROUTES) => MOCK_COURSE_ROUTES[id].route.map(([latitude, longitude]) => ({ latitude, longitude }));
const ROUTE = route('c-suseongmot');

type Point = { icon: IconName; text: string };
type Page = { title: string; points: Point[]; visual: ReactNode; label: string };

export function IntroScreen() {
  const { introSeen } = useOnboarding();
  // 이미 봤으면 바로 로그인 (로그아웃한 뒤 · 다시 켰을 때)
  if (introSeen) return <Redirect href="/login" />;
  return (
    <ThemeProvider scheme="dark">
      <Intro />
    </ThemeProvider>
  );
}

function Intro() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const pager = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  // 그림 칸 높이: 작은 화면에서도 제목 · 기능 세 줄 · 버튼이 한 화면에 들어오게. 큰 화면은 그림을 키워 빈 곳을 줄인다
  const visualHeight = Math.max(150, Math.min(340, height * (height < 700 ? 0.3 : 0.4)));
  const tile = { backgroundColor: colors.bg.elevated };

  const pages: Page[] = [
    {
      title: '코스를 달리고\n기록으로 겨루는 러닝 앱',
      points: [
        { icon: 'modeCourse', text: '내 주변 코스를 골라 달리고' },
        { icon: 'verified', text: '끝까지 달린 기록은 공식 기록으로 인증돼요' },
        { icon: 'trophy', text: '같은 코스 러너들과 순위로 겨뤄요' },
      ],
      label: '수성못 둘레길 코스 지도 1.9km, 공식 기록 인증됨',
      visual: (
        <View style={{ height: visualHeight }}>
          <CourseMapPreview route={ROUTE} badge="1.9 km" startLabel="출발" height={visualHeight} />
          <View style={[styles.overlay, { backgroundColor: colors.bg.canvas }]}>
            <VerificationBadge status="verified" />
          </View>
        </View>
      ),
    },
    {
      title: '달릴 코스가\n이미 동네에 있어요',
      points: [
        { icon: 'map', text: '내 주변 · 나에게 맞는 추천 코스' },
        { icon: 'star', text: '평점 · 야간 조명 · 화장실까지 미리 확인' },
        { icon: 'add', text: '내가 달린 길을 코스로 올려 공유' },
      ],
      label: '주변 코스 목록: 수성못 둘레길 1.9km, 신천 강변 왕복 4.7km',
      visual: (
        <View style={[styles.panel, styles.stack, { height: visualHeight }]}>
          <CourseCard title="수성못 둘레길" distanceM={1900} tags={['평지', '야간 밝음']} route={ROUTE} socialContext="★ 4.3 · 이번 주 128명" variant="compact" />
          <CourseCard title="신천 강변 왕복" distanceM={4700} tags={['강변']} route={route('c-sincheon')} socialContext="★ 5.0 · 이번 주 215명" variant="compact" />
        </View>
      ),
    },
    {
      title: '목표를 고르고\n달리는 동안 겨뤄요',
      points: [
        { icon: 'modePB', text: '내 PB · 친구 기록을 고스트로 띄워 비교' },
        { icon: 'notification', text: '앞섬 · 뒤처짐 · 구간 기록을 소리로 안내' },
        { icon: 'modeInterval', text: '인터벌 훈련도 구간마다 소리 · 진동으로' },
      ],
      label: '플레이 방식: 완주, PB 어택, 라이벌, 함께. 내 최고 기록보다 12초 빠름',
      visual: (
        <View style={[styles.panel, { height: visualHeight }]}>
          <View style={styles.modes}>
            <PlayModeCard icon="modeCourse" title="완주" caption="끝까지" style={styles.mode} />
            <PlayModeCard icon="modePB" title="PB 어택" caption="내 기록 깨기" state="selected" style={styles.mode} />
            <PlayModeCard icon="modeRival" title="라이벌" caption="친구 기록" style={styles.mode} />
          </View>
          <GapIndicator direction="ahead" delta={12} label="내 최고 기록" />
        </View>
      ),
    },
    {
      title: '인증된 기록만\n랭킹에 올라가요',
      points: [
        { icon: 'verified', text: '코스를 벗어나거나 끊긴 기록은 걸러내요' },
        { icon: 'metrics', text: '코스 · 주간 · 친구 랭킹과 구간 기록' },
        { icon: 'crown', text: '가장 빠르면 크라운, 가장 자주면 로컬 레전드' },
      ],
      label: '수성못 둘레길 랭킹: 1위 지수 코스 크라운, 2위 러너 박 로컬 레전드, 18위 나 개인 최고 기록',
      visual: (
        <View style={[styles.panel, styles.stack, { height: visualHeight }]}>
          <RankingRow rank={1} name="지수" timeSec={468} titles={['crown']} />
          <RankingRow rank={2} name="러너 박" timeSec={489} titles={['legend']} relation="friend" />
          <RankingRow rank={18} name="나" timeSec={612} relation="self" isPB rankChange={3} />
        </View>
      ),
    },
    {
      title: '떨어져 있어도\n친구와 같이 달려요',
      points: [
        { icon: 'modeTogether', text: '같은 시간에 출발해 레이스 · 타임 어택' },
        { icon: 'modeRival', text: '친구 기록에 도전하고 결과를 알려 줘요' },
        { icon: 'gpsUnavailable', text: '위치는 숨기고 거리 · 순위만 보여요' },
      ],
      label: '함께 달리기 진행 상황: 나 62%, 지수 70%, 민수 완주',
      visual: (
        <View style={[styles.panel, styles.stack, { height: visualHeight }]}>
          <ParticipantChip name="나" status="running" progress={0.62} trailing="3.1km" />
          <ParticipantChip name="지수" status="running" progress={0.7} trailing="+72m" />
          <ParticipantChip name="민수" status="finished" progress={1} />
        </View>
      ),
    },
    {
      title: '손목과 잠금 화면에서\n바로 봐요',
      points: [
        { icon: 'watch', text: 'Apple Watch로 조작 · 휴대폰 없이 기록' },
        { icon: 'lock', text: '잠금 화면 · 다이내믹 아일랜드에 실시간 기록' },
        { icon: 'health', text: '심박 센서 연결 · Apple 건강 기록 가져오기' },
      ],
      label: 'Apple Watch, 잠금 화면, 다이내믹 아일랜드, 심박 센서, Apple 건강',
      visual: (
        <View style={[styles.panel, { height: visualHeight }]}>
          <View style={styles.devices}>
            {(
              [
                ['watch', 'Apple Watch'],
                ['lock', '잠금 화면'],
                ['notification', '다이내믹 아일랜드'],
                ['health', '심박 · 건강'],
              ] as const
            ).map(([icon, text]) => (
              <View key={text} style={[styles.device, tile]}>
                <AppIcon name={icon} size={22} color={colors.text.accent} />
                <AppText role="caption" numberOfLines={1}>
                  {text}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      ),
    },
  ];
  const last = index === pages.length - 1;

  const goTo = (i: number) => {
    pager.current?.scrollTo({ x: i * width, animated: !reduced });
    setIndex(i);
  };
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  const leave = (to: '/signup' | '/login') => {
    markIntroSeen();
    router.replace(to);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top, paddingBottom: insets.bottom + spacing.md }]}>
      <StatusBar style="light" />
      <View style={styles.top}>
        <Wordmark height={20} />
        {last ? null : (
          <AppPressable onPress={() => goTo(pages.length - 1)} accessibilityRole="button" accessibilityLabel="소개 건너뛰기" style={styles.skip}>
            <AppText role="label" tone="secondary">
              건너뛰기
            </AppText>
          </AppPressable>
        )}
      </View>

      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}
      >
        {pages.map((p, i) => (
          // 글자를 크게 키워 넘치면 장 안에서 위아래로 밀어 본다 (점 · 버튼과 겹치지 않게)
          <ScrollView
            key={p.title}
            style={{ width }}
            contentContainerStyle={styles.page}
            showsVerticalScrollIndicator={false}
            accessibilityElementsHidden={i !== index}
            importantForAccessibility={i === index ? 'auto' : 'no-hide-descendants'}
          >
            <View accessible accessibilityLabel={p.label} style={[styles.visual, { backgroundColor: colors.bg.surface }]}>
              {p.visual}
            </View>
            <View style={styles.copy}>
              <AppText role="screenTitle" accessibilityRole="header">
                {p.title}
              </AppText>
              <View style={styles.points}>
                {p.points.map((pt) => (
                  <View key={pt.text} style={styles.point}>
                    <AppIcon name={pt.icon} size={18} color={colors.text.accent} />
                    <AppText role="body" tone="secondary" style={styles.flex}>
                      {pt.text}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        ))}
      </ScrollView>

      <View style={styles.bottom}>
        {/* 지금 장: 긴 막대, 나머지: 점 (색만으로 구분하지 않는다) */}
        <View style={styles.dots} accessible accessibilityLabel={`${pages.length}장 중 ${index + 1}장`}>
          {pages.map((p, i) => (
            <View key={p.title} style={[styles.dot, i === index && styles.dotActive, { backgroundColor: i === index ? colors.text.primary : colors.border.strong }]} />
          ))}
        </View>
        <SecondaryButton label={last ? '가입하고 시작하기' : '다음'} emphasized onPress={() => (last ? leave('/signup') : goTo(index + 1))} style={styles.cta} />
        {/* 이미 계정이 있으면 어느 장에서든 바로 로그인 */}
        <AppText role="body" tone="secondary" style={styles.center}>
          이미 계정이 있어요{' '}
          <AppText role="body" style={styles.link} accessibilityRole="link" onPress={() => leave('/login')}>
            로그인
          </AppText>
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  top: {
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skip: {
    minHeight: touchTarget.min,
    justifyContent: 'center',
    paddingLeft: spacing.lg,
  },
  pager: {
    flex: 1,
  },
  page: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.xl,
  },
  visual: {
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  panel: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
  },
  stack: {
    alignItems: 'stretch',
    gap: spacing.md,
  },
  overlay: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  modes: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mode: {
    flex: 1,
  },
  devices: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  device: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.control,
  },
  copy: {
    gap: spacing.md,
  },
  points: {
    gap: spacing.sm,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  dotActive: {
    width: 24,
  },
  cta: {
    alignSelf: 'stretch',
    minHeight: touchTarget.primary,
  },
  center: {
    textAlign: 'center',
  },
  link: {
    fontFamily: fontFamily.bold,
    textDecorationLine: 'underline',
  },
});
