import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { CourseCard } from '@/components/CourseCard';
import { CourseMapPreview } from '@/components/CourseMapPreview';
import { FilterChip } from '@/components/FilterChip';
import { GapIndicator } from '@/components/GapIndicator';
import { GpsStatus } from '@/components/GpsStatus';
import { MetricBlock } from '@/components/MetricBlock';
import { ParticipantChip } from '@/components/ParticipantChip';
import { PrimaryRunButton } from '@/components/PrimaryRunButton';
import { RankingRow } from '@/components/RankingRow';
import { VerificationBadge } from '@/components/VerificationBadge';
import { AppDivider, AppIcon, AppPressable, AppSurface, AppText } from '@/design/primitives';
import { ThemeProvider, useTheme } from '@/design/theme';
import { elevation, fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { formatDistanceKm, formatDuration, formatPace } from '@/shared/format';

import { nearbyOthers, stadiumLoop, suseongmotActual, suseongmotLoop } from './sampleRoutes';

// 98장 Distinctiveness: 핵심 화면을 나란히 놓았을 때 하나의 서비스로 보이는지 확인하는 조합 미리보기.
// 실제 화면 구현이 아니라 컴포넌트 조합 검증용이다. 배치는 90~94장, 패턴 근거는 REFERENCE-RESEARCH-2026-09.md.

export function ScreenPreviews() {
  return (
    <View style={styles.previews}>
      <Frame title="탐색 (90장)" scheme="light">
        <ExplorePreview />
      </Frame>
      <Frame title="코스 상세 (91장)" scheme="light">
        <CourseDetailPreview />
      </Frame>
      <Frame title="러닝 중 · PB 도전 (92장)" scheme="dark">
        <ActiveRunPreview />
      </Frame>
      <Frame title="결과 (93장)" scheme="light">
        <ResultPreview />
      </Frame>
      <Frame title="함께 달리기 (94장)" scheme="dark">
        <TogetherLivePreview />
      </Frame>
    </View>
  );
}

function ExplorePreview() {
  const [selected, setSelected] = useState('suseong');
  const [filters, setFilters] = useState<Record<string, boolean>>({ '3~5km': true });
  const selectedRoute = selected === 'suseong' ? suseongmotLoop : stadiumLoop;
  const otherRoutes = selected === 'suseong' ? nearbyOthers : [suseongmotLoop];

  return (
    <View>
      {/* P1: 지도가 작업 공간, 선택한 코스가 가장 굵은 signal 선 (90장) */}
      <CourseMapPreview route={selectedRoute} others={otherRoutes} height={300} accessibilityLabel="주변 코스 지도" />
      <View style={styles.mapTop} pointerEvents="box-none">
        <AppSurface level="elevated" radius="control" style={styles.search}>
          <AppText role="body" tone="secondary">
            지역, 장소 검색
          </AppText>
        </AppSurface>
        <View style={styles.chips}>
          {['3~5km', '평지', '야간'].map((k) => (
            <FilterChip key={k} label={k} selected={!!filters[k]} onPress={() => setFilters((f) => ({ ...f, [k]: !f[k] }))} />
          ))}
        </View>
      </View>
      <Sheet>
        <View style={styles.sheetHeader}>
          <AppText role="sectionTitle">수성구 근처 코스</AppText>
          <AppText role="label" tone="secondary" tabular>
            12개
          </AppText>
        </View>
        <CourseCard
          title="수성못 둘레길"
          distanceM={2300}
          tags={['평지', '야간 밝음']}
          proximityM={600}
          recordContext="내 PB 11:42"
          selected={selected === 'suseong'}
          onPress={() => setSelected('suseong')}
        />
        <AppDivider inset="lg" />
        <CourseCard
          title="대구스타디움 루프"
          distanceM={4800}
          tags={['초보 추천']}
          proximityM={3400}
          selected={selected === 'stadium'}
          onPress={() => setSelected('stadium')}
        />
      </Sheet>
    </View>
  );
}

function CourseDetailPreview() {
  return (
    <AppSurface level="surface">
      <CourseMapPreview route={suseongmotLoop} height={220} badge="2.3 km" accessibilityLabel="수성못 둘레길 경로" />
      <View style={styles.pad}>
        <View style={styles.titleBlock}>
          <AppText role="screenTitle">수성못 둘레길</AppText>
          <AppText role="label" tone="secondary" tabular>
            대구 수성구 · 완주 1,284명
          </AppText>
        </View>
        <SummaryRow
          items={[
            { label: '거리', value: formatDistanceKm(2300, 1), unit: 'km' },
            { label: '예상 시간', value: '14', unit: '분' },
            { label: '고도 상승', value: '8', unit: 'm' },
          ]}
        />
        <View style={styles.recordStrip}>
          <Inline k="내 PB" v="11:42" />
          <Inline k="주간" v="18위" accent />
          <Inline k="친구 최고" v="10:51" />
        </View>
        <ElevationProfile />
      </View>
      <AppDivider variant="section" />
      <View style={styles.pad}>
        <AppText role="sectionTitle">코스 환경</AppText>
        <View style={styles.infoList}>
          <InfoRow k="신호등" v="없음" />
          <InfoRow k="야간 조명" v="밝음" />
          <InfoRow k="노면" v="우레탄 산책로" />
          <InfoRow k="편의시설" v="화장실 2곳 · 급수대 1곳" />
        </View>
      </View>
      <AppDivider variant="section" />
      <View style={styles.pad}>
        <View>
          <AppText role="sectionTitle">이 코스 기록 랭킹</AppText>
          <AppText role="caption" tone="secondary">
            인증된 기록만 반영돼요
          </AppText>
        </View>
        <View>
          <RankingRow rank={1} name="지수" timeSec={581} paceSecPerKm={253} />
          <RankingRow rank={2} name="민수" timeSec={598} paceSecPerKm={260} relation="friend" />
          <RankingRow rank={3} name="러너 박" timeSec={611} paceSecPerKm={266} />
          <RankingRow rank={18} name="나" timeSec={702} paceSecPerKm={305} relation="self" isPB />
        </View>
      </View>
      {/* 91장: RUN CTA는 하단 고정 */}
      <StickyBar>
        <PrimaryRunButton label="이 코스 달리기" />
      </StickyBar>
    </AppSurface>
  );
}

function ActiveRunPreview() {
  return (
    <AppSurface level="canvas" style={[styles.pad, styles.run]}>
      <View style={styles.runTop}>
        <GpsStatus quality="good" />
        <AppText role="label" tone="accent">
          PB 도전
        </AppText>
      </View>
      <MetricBlock label="거리" value={formatDistanceKm(1440)} unit="km" size="hero" align="center" />
      <View style={styles.twoCol}>
        <MetricBlock label="시간" value={formatDuration(412)} align="center" style={styles.flex} />
        <MetricBlock label="평균 페이스" value={formatPace(286)} align="center" style={styles.flex} />
      </View>
      {/* P3: 경로 위에 오늘의 나와 PB 위치를 라벨로 (고스트러너 패턴). 92장: 지도는 경로 확인용으로 단순하게 */}
      <View style={styles.runMap}>
        <CourseMapPreview
          route={suseongmotLoop}
          height={140}
          startLabel="출발"
          annotations={[
            { at: 0.66, label: '오늘의 나', tone: 'course' },
            { at: 0.44, label: 'PB 기록', tone: 'target' },
          ]}
          accessibilityLabel="코스 진행 위치: 오늘의 나가 PB보다 앞서 있음"
        />
      </View>
      <GapIndicator direction="ahead" delta={8} label="PB" />
      <SecondaryButton label="일시정지" />
    </AppSurface>
  );
}

function ResultPreview() {
  const { colors } = useTheme();
  return (
    <AppSurface level="surface">
      <View style={styles.pad}>
        <View style={styles.titleBlock}>
          <AppText role="label" tone="accent">
            PB 갱신
          </AppText>
          <AppText role="screenTitle">이전 기록보다 21초 빨랐어요</AppText>
        </View>
        <SummaryRow
          items={[
            { label: '시간', value: formatDuration(681) },
            { label: '거리', value: formatDistanceKm(2310), unit: 'km' },
            { label: '평균 페이스', value: formatPace(295) },
          ]}
        />
      </View>
      {/* 67.1장 actual + deviation: 코스 위에 실제 달린 선, 이탈 구간은 점선 */}
      <CourseMapPreview
        route={suseongmotLoop}
        actual={suseongmotActual}
        deviation={{ from: 0.38, to: 0.52 }}
        height={200}
        accessibilityLabel="달린 경로. 일부 구간 코스 이탈"
      />
      <View style={styles.pad}>
        <View style={styles.resultMeta}>
          <VerificationBadge status="verified" />
          <View style={styles.rankDelta}>
            <AppText role="label" tone="secondary">
              주간 순위
            </AppText>
            <AppText role="sectionTitle" tabular>
              23위 → 14위
            </AppText>
            <AppIcon name="rankUp" size={18} color={colors.ranking.up} />
          </View>
        </View>
        <View style={styles.twoCol}>
          <SecondaryButton label="공유하기" style={styles.flex} />
          <SecondaryButton label="다시 도전하기" style={styles.flex} emphasized />
        </View>
      </View>
    </AppSurface>
  );
}

function TogetherLivePreview() {
  return (
    <AppSurface level="canvas" style={[styles.pad, styles.run]}>
      <View style={styles.runTop}>
        <View style={styles.bib}>
          <AppText role="caption" tone="secondary" tabular>
            BIB 0418
          </AppText>
          <AppText role="label">5K 레이스</AppText>
        </View>
        <AppText role="label" tone="secondary" tabular>
          3/4명 달리는 중
        </AppText>
      </View>
      <View style={styles.raceHead}>
        <AppText role="metricLarge" tone="accent">
          2위
        </AppText>
        <AppText role="sectionTitle" tabular>
          3.84 / 5.00 km
        </AppText>
      </View>
      <View>
        <ParticipantChip name="나" status="running" progress={0.768} trailing="2위" />
        <ParticipantChip name="민수" status="running" progress={0.83} trailing="+72m" />
        <ParticipantChip name="지수" status="running" progress={0.746} trailing="−110m" />
        <ParticipantChip name="도윤" status="disconnected" progress={0.51} trailing="연결 끊김" />
      </View>
      <GapIndicator direction="behind" delta={18} label="선두" size="compact" />
      <SecondaryButton label="일시정지" />
    </AppSurface>
  );
}

// ---- 미리보기 전용 도우미 (재사용 컴포넌트로 승격하지 않는다) ----

function Frame({ title, scheme, children }: { title: string; scheme: 'light' | 'dark'; children: ReactNode }) {
  return (
    <View style={styles.frameWrap}>
      <AppText role="label" tone="secondary">
        {title}
      </AppText>
      <ThemeProvider scheme={scheme}>
        <FrameBody>{children}</FrameBody>
      </ThemeProvider>
    </View>
  );
}

function FrameBody({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.frame, { backgroundColor: colors.bg.canvas, borderColor: colors.border.subtle }]}>{children}</View>;
}

function Sheet({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <AppSurface level="surface" style={[styles.sheet, { boxShadow: elevation.sheet }]}>
      <View style={[styles.handle, { backgroundColor: colors.border.strong }]} />
      {children}
    </AppSurface>
  );
}

function StickyBar({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.sticky, { borderTopColor: colors.border.subtle, backgroundColor: colors.bg.surface }]}>{children}</View>;
}

// 라벨 위 · 값 아래, 세로 구분선으로 나눈 요약 행 (레퍼런스 P5)
function SummaryRow({ items, large }: { items: { label: string; value: string; unit?: string }[]; large?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.summary}>
      {items.map((it, i) => (
        <View
          key={it.label}
          style={[
            styles.summaryItem,
            i > 0 && { borderLeftColor: colors.border.subtle, borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: spacing.md },
          ]}
        >
          <MetricBlock label={it.label} value={it.value} unit={it.unit} size={large ? 'large' : 'medium'} labelPosition="top" />
        </View>
      ))}
    </View>
  );
}

function Inline({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <View style={styles.inline}>
      <AppText role="label" tone="secondary">
        {k}
      </AppText>
      <AppText role="label" tone={accent ? 'accent' : 'primary'} tabular style={styles.inlineValue}>
        {v}
      </AppText>
    </View>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.info}>
      <AppText role="label" tone="secondary" style={styles.infoKey}>
        {k}
      </AppText>
      <AppText role="body" style={styles.flex}>
        {v}
      </AppText>
    </View>
  );
}

// 코스 고도 프로필 (91장 ELEVATION, 레퍼런스 P6). 예시 고도값.
const ELEVATION = [31, 32, 32, 34, 36, 37, 36, 35, 33, 32, 33, 35, 38, 39, 37, 34, 32, 31, 31, 32, 31];

function ElevationProfile() {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const h = 56;
  const min = Math.min(...ELEVATION) - 2;
  const max = Math.max(...ELEVATION) + 2;
  const pts = ELEVATION.map((v, i) => [(i / (ELEVATION.length - 1)) * w, h - ((v - min) / (max - min)) * h]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  return (
    <View style={styles.elevation} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <View style={styles.elevationHead}>
        <AppText role="label" tone="secondary">
          고도
        </AppText>
        <AppText role="caption" tone="secondary" tabular>
          최저 31m · 최고 39m
        </AppText>
      </View>
      {w > 0 ? (
        <Svg width={w} height={h}>
          <Path d={`${line} L${w},${h} L0,${h} Z`} fill={colors.action.tint} />
          <Path d={line} fill="none" stroke={colors.action.primary} strokeWidth={2} />
        </Svg>
      ) : null}
    </View>
  );
}

function SecondaryButton({ label, emphasized, style }: { label: string; emphasized?: boolean; style?: object }) {
  const { colors } = useTheme();
  return (
    <AppPressable
      accessibilityLabel={label}
      style={[
        styles.secondary,
        { backgroundColor: emphasized ? colors.action.tint : colors.bg.surface, borderColor: colors.border.subtle },
        style,
      ]}
    >
      <AppText role="sectionTitle" tone={emphasized ? 'accent' : 'primary'} style={styles.center}>
        {label}
      </AppText>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  previews: {
    gap: spacing.xxxl,
  },
  frameWrap: {
    gap: spacing.sm,
  },
  frame: {
    borderRadius: radius.sheet,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  mapTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    gap: spacing.sm,
  },
  search: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    boxShadow: elevation.mapOverlay,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    marginTop: -spacing.xxl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: spacing.huge,
    height: spacing.xs,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  pad: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  titleBlock: {
    gap: spacing.xs,
  },
  summary: {
    flexDirection: 'row',
  },
  summaryItem: {
    flex: 1,
  },
  recordStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.xl,
    rowGap: spacing.xs,
  },
  inline: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  inlineValue: {
    fontFamily: fontFamily.extrabold,
  },
  infoList: {
    gap: spacing.md,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.md,
  },
  infoKey: {
    width: spacing.huge * 2,
  },
  elevation: {
    gap: spacing.sm,
  },
  elevationHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sticky: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  run: {
    gap: spacing.xxl,
  },
  runTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  runMap: {
    marginHorizontal: -spacing.lg,
  },
  raceHead: {
    gap: spacing.xs,
  },
  bib: {
    gap: spacing.xs / 2,
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  resultMeta: {
    gap: spacing.md,
  },
  rankDelta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  secondary: {
    borderRadius: radius.control,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.lg,
  },
  center: {
    textAlign: 'center',
  },
});
