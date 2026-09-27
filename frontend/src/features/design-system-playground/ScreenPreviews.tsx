import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { CourseCard } from '@/components/CourseCard';
import { FilterChip } from '@/components/FilterChip';
import { GapIndicator } from '@/components/GapIndicator';
import { GpsStatus } from '@/components/GpsStatus';
import { MetricBlock } from '@/components/MetricBlock';
import { ParticipantChip } from '@/components/ParticipantChip';
import { PrimaryRunButton } from '@/components/PrimaryRunButton';
import { RankingRow } from '@/components/RankingRow';
import { SignalRail } from '@/components/SignalRail';
import { VerificationBadge } from '@/components/VerificationBadge';
import { AppDivider, AppIcon, AppPressable, AppSurface, AppText } from '@/design/primitives';
import { ThemeProvider, useTheme } from '@/design/theme';
import { radius, spacing, touchTarget } from '@/design/tokens';
import { formatDistanceKm, formatDuration, formatPace } from '@/shared/format';

// 98장 Distinctiveness: 핵심 화면을 나란히 놓았을 때 하나의 서비스로 보이는지 확인하는 조합 미리보기.
// 실제 화면 구현이 아니라 컴포넌트 조합 검증용이다. 배치는 90~94장, 데이터는 예시 값이다.

export function ScreenPreviews() {
  return (
    <View style={styles.previews}>
      <Frame title="탐색" scheme="light">
        <ExplorePreview />
      </Frame>
      <Frame title="코스 상세" scheme="light">
        <CourseDetailPreview />
      </Frame>
      <Frame title="러닝 중" scheme="dark">
        <ActiveRunPreview />
      </Frame>
      <Frame title="결과" scheme="light">
        <ResultPreview />
      </Frame>
      <Frame title="함께 달리기" scheme="dark">
        <TogetherLivePreview />
      </Frame>
    </View>
  );
}

function ExplorePreview() {
  const [selected, setSelected] = useState('han');
  const [filters, setFilters] = useState<Record<string, boolean>>({ '3~5km': true });

  return (
    <View>
      <MapPlaceholder height={180}>
        <View style={styles.mapTop}>
          <AppSurface level="elevated" radius="pill" style={styles.search}>
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
      </MapPlaceholder>
      <AppSurface level="surface" style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <AppText role="sectionTitle">이 지역 추천 코스</AppText>
          <AppText role="label" tone="secondary" tabular>
            12
          </AppText>
        </View>
        <CourseCard
          title="한강 야간 5K"
          distanceM={5200}
          tags={['평지', '신호 적음']}
          proximityM={1300}
          recordContext="내 PB 25:42"
          selected={selected === 'han'}
          onPress={() => setSelected('han')}
        />
        <CourseCard
          title="대구스타디움 루프"
          distanceM={4800}
          tags={['초보 추천']}
          proximityM={3400}
          selected={selected === 'stadium'}
          onPress={() => setSelected('stadium')}
        />
      </AppSurface>
    </View>
  );
}

function CourseDetailPreview() {
  return (
    <AppSurface level="surface">
      <MapPlaceholder height={140} />
      <View style={styles.pad}>
        <AppText role="screenTitle">수성못 5K Loop</AppText>
        <SummaryRow
          items={[
            { label: '거리', value: formatDistanceKm(5100, 1), unit: 'km' },
            { label: '예상 시간', value: '31', unit: '분' },
            { label: '난이도', value: '쉬움' },
          ]}
        />
        <View style={styles.recordStrip}>
          <AppText role="label" tone="secondary">
            내 PB{' '}
            <AppText role="label" tabular>
              25:42
            </AppText>
          </AppText>
          <AppText role="label" tone="secondary">
            주간{' '}
            <AppText role="label" tone="accent" tabular>
              18위
            </AppText>
          </AppText>
          <AppText role="label" tone="secondary">
            친구 최고{' '}
            <AppText role="label" tabular>
              24:51
            </AppText>
          </AppText>
        </View>
        <PrimaryRunButton label="이 코스 달리기" />
      </View>
      <AppDivider variant="section" />
      <View style={styles.pad}>
        <AppText role="sectionTitle">코스 환경</AppText>
        <InfoRow k="신호" v="신호등 적음" />
        <InfoRow k="야간" v="가로등 밝음" />
        <InfoRow k="노면" v="아스팔트" />
        <InfoRow k="편의시설" v="화장실 2곳 · 급수대 1곳" />
      </View>
      <AppDivider variant="section" />
      <View style={styles.pad}>
        <View>
          <AppText role="sectionTitle">이 코스 기록 랭킹</AppText>
          <AppText role="caption" tone="secondary" tabular>
            완주자 1,284명 · 인증된 기록만 반영
          </AppText>
        </View>
        <View>
          <RankingRow rank={1} name="지수" timeSec={1398} paceSecPerKm={274} />
          <RankingRow rank={2} name="민수" timeSec={1402} paceSecPerKm={275} relation="friend" />
          <RankingRow rank={3} name="러너 박" timeSec={1411} paceSecPerKm={277} />
          <RankingRow rank={18} name="나" timeSec={1542} paceSecPerKm={302} relation="self" isPB />
        </View>
      </View>
    </AppSurface>
  );
}

function ActiveRunPreview() {
  return (
    <AppSurface level="canvas" style={[styles.pad, styles.run]}>
      <View style={styles.runTop}>
        <GpsStatus quality="good" />
        <AppText role="label" tone="accent">
          코스 러닝
        </AppText>
      </View>
      <MetricBlock label="거리" value={formatDistanceKm(3720)} unit="km" size="hero" align="center" />
      <View style={styles.twoCol}>
        <MetricBlock label="시간" value={formatDuration(1122)} align="center" style={styles.flex} />
        <MetricBlock label="평균 페이스" value={formatPace(301)} align="center" style={styles.flex} />
      </View>
      <View style={styles.progress}>
        <View style={styles.progressLabel}>
          <AppText role="label" tone="secondary">
            코스 진행률
          </AppText>
          <AppText role="label" tabular>
            74%
          </AppText>
        </View>
        <SignalRail progress={0.74} showHead />
        <GapIndicator direction="ahead" delta={8} label="목표" />
      </View>
      <SecondaryButton label="일시정지" />
    </AppSurface>
  );
}

function ResultPreview() {
  const { colors } = useTheme();
  return (
    <AppSurface level="surface">
      <View style={styles.pad}>
        <View>
          <AppText role="label" tone="accent">
            PB 갱신
          </AppText>
          <AppText role="screenTitle">이전 기록보다 21초 빨랐어요</AppText>
        </View>
        <SummaryRow
          items={[
            { label: '시간', value: formatDuration(1521) },
            { label: '거리', value: formatDistanceKm(5020), unit: 'km' },
            { label: '평균 페이스', value: formatPace(303) },
          ]}
        />
      </View>
      <MapPlaceholder height={120} />
      <View style={styles.pad}>
        <VerificationBadge status="verified" />
        <View style={styles.rankDelta}>
          <AppText role="body" tone="secondary">
            주간 순위
          </AppText>
          <AppText role="sectionTitle" tabular>
            23위 → 14위
          </AppText>
          <AppIcon name="rankUp" size={18} color={colors.ranking.up} />
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
        <AppText role="label">5K 레이스</AppText>
        <AppText role="label" tone="secondary" tabular>
          3/4명 달리는 중
        </AppText>
      </View>
      <View>
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

function MapPlaceholder({ height, children }: { height: number; children?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel="지도 영역"
      style={[styles.map, { height, backgroundColor: colors.border.subtle }]}
    >
      {children ?? (
        <AppText role="caption" tone="secondary">
          지도 영역 · 지도 SDK 결정 전
        </AppText>
      )}
    </View>
  );
}

// Runnect 결과 화면 패턴: 라벨 위 · 값 아래, 세로 구분선으로 나눈 요약 행
function SummaryRow({ items }: { items: { label: string; value: string; unit?: string }[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.summary}>
      {items.map((it, i) => (
        <View key={it.label} style={[styles.summaryItem, i > 0 && { borderLeftColor: colors.border.subtle, borderLeftWidth: StyleSheet.hairlineWidth }]}>
          <MetricBlock label={it.label} value={it.value} unit={it.unit} size="medium" labelPosition="top" />
        </View>
      ))}
    </View>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.info}>
      <AppText role="label" style={styles.infoKey}>
        {k}
      </AppText>
      <AppText role="body" tone="secondary" style={styles.flex}>
        {v}
      </AppText>
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
    gap: spacing.xxl,
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
  map: {
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    marginTop: -spacing.lg,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  pad: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  summary: {
    flexDirection: 'row',
  },
  summaryItem: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  recordStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.lg,
    rowGap: spacing.xs,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoKey: {
    width: spacing.huge * 2,
  },
  run: {
    gap: spacing.xxl,
  },
  runTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  progress: {
    gap: spacing.sm,
  },
  progressLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
