import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/Brand';
import { CourseMapPreview } from '@/components/CourseMapPreview';
import { GapIndicator } from '@/components/GapIndicator';
import { ParticipantChip } from '@/components/ParticipantChip';
import { RankingRow } from '@/components/RankingRow';
import { VerificationBadge } from '@/components/VerificationBadge';
import { SecondaryButton } from '@/components/SecondaryButton';
import { MOCK_COURSE_ROUTES } from '@/entities/course/api/mockCourseRoutes';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { ThemeProvider, useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';

import { markIntroSeen, useOnboarding } from './onboardingState';

// 첫 실행 소개 (결정 로그 64 · 84항). 로그인 전에 한 번만, 3장으로 짧게.
// 첫 장에서 어떤 앱인지 말하고, 다음 두 장에 주요 기능을 실제 화면에 쓰는 컴포넌트로 보여 준다
// (① 코스를 달리고 인증 · ② 코스 랭킹과 지난 나와 경쟁 · ③ 함께 달리기와 워치 · 잠금 화면, 1.2장 COURSE · COMPETE · TOGETHER).
// 끝나면 가입, 이미 계정이 있으면 로그인. 가입 뒤에는 러너 정보 · 권한 두 화면만 거쳐 바로 탐색으로 간다.
// 로그인 화면과 같은 dark 바탕. 건너뛰거나 끝까지 보면 다시 보이지 않는다.

const ROUTE = MOCK_COURSE_ROUTES['c-suseongmot'].route.map(([latitude, longitude]) => ({ latitude, longitude }));

type Page = { title: string; body: string; visual: ReactNode; label: string };

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

  // 그림 칸 높이: 작은 화면에서도 제목 · 버튼이 한 화면에 들어오게
  const visualHeight = Math.max(170, Math.min(320, height * 0.36));

  const pages: Page[] = [
    {
      title: '달리모는 코스를 달리고\n겨루는 러닝 앱이에요',
      body: '내 주변 코스를 골라 끝까지 달리면 기록이 인증되고, 같은 코스 러너들과 순위로 겨뤄요.',
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
      title: '순위를 올리고\n지난 나를 이겨요',
      body: '코스마다 랭킹과 크라운이 있어요. 달리는 동안 내 최고 기록보다 몇 초 앞서는지 알려 줘요.',
      label: '수성못 둘레길 랭킹: 1위 지수 코스 크라운, 18위 나 개인 최고 기록. 내 최고 기록보다 12초 앞섬',
      visual: (
        <View style={[styles.panel, styles.people, { height: visualHeight }]}>
          <RankingRow rank={1} name="지수" timeSec={468} titles={['crown']} />
          <RankingRow rank={18} name="나" timeSec={612} relation="self" isPB rankChange={3} />
          <View style={styles.center}>
            <GapIndicator direction="ahead" delta={12} label="내 최고 기록" />
          </View>
        </View>
      ),
    },
    {
      title: '친구와 함께 달리고\n손목과 잠금 화면에서 봐요',
      body: '떨어져 있어도 같은 시간에 출발해 서로 얼마나 앞서는지 실시간으로 봐요.',
      label: '함께 달리기 진행 상황: 나 62%, 지수 70%. Apple Watch와 잠금 화면에서도 보여요',
      visual: (
        <View style={[styles.panel, styles.people, { height: visualHeight }]}>
          <ParticipantChip name="나" status="running" progress={0.62} trailing="3.1km" />
          <ParticipantChip name="지수" status="running" progress={0.7} trailing="+72m" />
          <View style={[styles.device, { backgroundColor: colors.bg.elevated }]}>
            <AppIcon name="watch" size={14} color={colors.text.accent} />
            <AppIcon name="lock" size={14} color={colors.text.accent} />
            <AppText role="caption">워치 · 잠금 화면에서도</AppText>
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
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
      <StatusBar style="light" />
      <View style={styles.top}>
        <Wordmark height={20} />
        {last ? null : (
          <AppPressable onPress={() => leave('/login')} accessibilityRole="button" accessibilityLabel="소개 건너뛰기" style={styles.skip}>
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
          <View key={p.title} style={[styles.page, { width }]} accessibilityElementsHidden={i !== index} importantForAccessibility={i === index ? 'auto' : 'no-hide-descendants'}>
            <View accessible accessibilityLabel={p.label} style={[styles.visual, { backgroundColor: colors.bg.surface }]}>
              {p.visual}
            </View>
            <View style={styles.copy}>
              <AppText role="screenTitle" accessibilityRole="header">
                {p.title}
              </AppText>
              <AppText role="body" tone="secondary">
                {p.body}
              </AppText>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottom}>
        {/* 지금 장: 긴 막대, 나머지: 점 (색만으로 구분하지 않는다) */}
        <View style={styles.dots} accessible accessibilityLabel={`${pages.length}장 중 ${index + 1}장`}>
          {pages.map((p, i) => (
            <View key={p.title} style={[styles.dot, i === index && styles.dotActive, { backgroundColor: i === index ? colors.text.primary : colors.border.strong }]} />
          ))}
        </View>
        {last ? (
          <>
            <SecondaryButton label="가입하고 시작하기" emphasized onPress={() => leave('/signup')} style={styles.cta} />
            <AppText role="body" tone="secondary" style={styles.center}>
              이미 계정이 있어요{' '}
              <AppText role="body" style={styles.link} accessibilityRole="link" onPress={() => leave('/login')}>
                로그인
              </AppText>
            </AppText>
          </>
        ) : (
          <SecondaryButton label="다음" emphasized onPress={() => goTo(index + 1)} style={styles.cta} />
        )}
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
    paddingTop: spacing.lg,
    gap: spacing.xxl,
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
  people: {
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
  device: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  copy: {
    gap: spacing.sm,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
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
    alignItems: 'center',
  },
  link: {
    fontFamily: fontFamily.bold,
    textDecorationLine: 'underline',
  },
});
