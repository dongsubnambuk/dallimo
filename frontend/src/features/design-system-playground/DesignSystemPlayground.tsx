import { useState, type ReactNode } from 'react';
import { PixelRatio, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader, BrandSymbol, Wordmark } from '@/components/Brand';
import { CourseCard } from '@/components/CourseCard';
import { FilterChip } from '@/components/FilterChip';
import { GapIndicator } from '@/components/GapIndicator';
import { GpsStatus, type GpsQuality } from '@/components/GpsStatus';
import { MetricBlock } from '@/components/MetricBlock';
import { ParticipantChip, type ParticipantStatus } from '@/components/ParticipantChip';
import { PrimaryRunButton } from '@/components/PrimaryRunButton';
import { RankingRow } from '@/components/RankingRow';
import { SignalRail } from '@/components/SignalRail';
import { VerificationBadge, type VerificationStatus } from '@/components/VerificationBadge';
import { AppDivider, AppIcon, AppPressable, AppSurface, AppText } from '@/design/primitives';
import { ThemeProvider, useTheme } from '@/design/theme';
import { radius, spacing, stroke, type ColorRoles, type TextRole } from '@/design/tokens';
import { formatDistanceKm, formatDuration, formatPace } from '@/shared/format';

import { ScreenPreviews } from './ScreenPreviews';

// DESIGN-SYSTEM-PLAYGROUND-SPEC.md 111장: 전시용 갤러리가 아니라 토큰·컴포넌트·상태를 검증하는 개발 도구다.
// 위에는 98장 화면 조합 미리보기, 아래에는 컴포넌트별 상태 검증을 둔다. 상태 검증은 그룹별로 접는다.

type ContextMode = 'light' | 'dark' | 'both';

const LONG_COURSE = '수성못 둘레길 야간 5K 루프 (동쪽 데크길 경유, 초보 추천, 화장실 2곳)';
const LONG_NICK = '새벽다섯시에일어나는러너김민수입니다';
const GPS_STATES: GpsQuality[] = ['acquiring', 'good', 'fair', 'poor', 'unavailable'];
const VERIFICATION_STATES: VerificationStatus[] = ['pending', 'verified', 'unverified', 'rejected'];
const PARTICIPANT_STATES: { status: ParticipantStatus; progress?: number }[] = [
  { status: 'invited' },
  { status: 'ready' },
  { status: 'running', progress: 0.64 },
  { status: 'disconnected', progress: 0.41 },
  { status: 'finished', progress: 1 },
  { status: 'dnf' },
];
const TEXT_ROLES: TextRole[] = ['metricHero', 'metricLarge', 'screenTitle', 'sectionTitle', 'body', 'label', 'caption'];

export function DesignSystemPlayground() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [mode, setMode] = useState<ContextMode>('both');

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg.canvas }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.huge }]}
    >
      <View style={styles.section}>
        <AppText role="screenTitle" accessibilityRole="header">
          화면 조합 미리보기
        </AppText>
        <AppText role="body" tone="secondary">
          핵심 화면 다섯 개를 같은 토큰과 컴포넌트로 조합했다. 하나의 서비스로 보이는지 확인한다.
        </AppText>
        <ScreenPreviews />
      </View>

      <View style={styles.section}>
        <AppText role="screenTitle" accessibilityRole="header">
          상태 검증
        </AppText>
        <AppText role="caption" tone="secondary">
          시스템 글자 크기 배율 {PixelRatio.getFontScale().toFixed(2)}. 글자 크기 테스트는 기기 설정에서 바꾼 뒤 다시
          확인한다.
        </AppText>
        <View style={styles.wrap}>
          {(
            [
              ['light', '라이트'],
              ['dark', '다크'],
              ['both', '비교'],
            ] as const
          ).map(([m, label]) => (
            <FilterChip key={m} label={label} selected={mode === m} onPress={() => setMode(m)} />
          ))}
        </View>

        <Group title="브랜드" count={4}>
          <Contexted mode={mode}>{() => <BrandCases />}</Contexted>
        </Group>
        <Group title="색 역할" count={Object.values(colors).reduce((n, g) => n + Object.keys(g).length, 0)}>
          <Contexted mode={mode}>{() => <ColorRoleList />}</Contexted>
        </Group>
        <Group title="글자" count={TEXT_ROLES.length}>
          <Contexted mode={mode}>{() => <TypographyList />}</Contexted>
        </Group>
        <Group title="간격 · 모서리 · 선" count={3}>
          <Contexted mode={mode}>{() => <ScaleList />}</Contexted>
        </Group>
        <Group title="버튼 · 필터" count={8}>
          <Contexted mode={mode}>{() => <ActionCases />}</Contexted>
        </Group>
        <Group title="기록 수치" count={6}>
          <Contexted mode={mode}>{() => <MetricCases />}</Contexted>
        </Group>
        <Group title="코스" count={6}>
          <Contexted mode={mode}>{() => <CourseCases />}</Contexted>
        </Group>
        <Group title="GPS" count={GPS_STATES.length}>
          <Contexted mode={mode}>
            {() => (
              <View style={styles.stack}>
                {GPS_STATES.map((q) => (
                  <Case key={q} label={q}>
                    <View style={styles.row}>
                      <GpsStatus quality={q} />
                      <GpsStatus quality={q} variant="pill" />
                    </View>
                  </Case>
                ))}
              </View>
            )}
          </Contexted>
        </Group>
        <Group title="경쟁 차이" count={7}>
          <Contexted mode={mode}>{() => <GapCases />}</Contexted>
        </Group>
        <Group title="랭킹" count={9}>
          <Contexted mode={mode}>{() => <RankingCases />}</Contexted>
        </Group>
        <Group title="기록 인증" count={VERIFICATION_STATES.length}>
          <Contexted mode={mode}>
            {() => (
              <View style={styles.stack}>
                {VERIFICATION_STATES.map((s) => (
                  <Case key={s} label={s}>
                    <VerificationBadge status={s} />
                  </Case>
                ))}
              </View>
            )}
          </Contexted>
        </Group>
        <Group title="함께 달리기 참가자" count={PARTICIPANT_STATES.length + 1}>
          <Contexted mode={mode}>
            {() => (
              <View>
                {PARTICIPANT_STATES.map(({ status, progress }) => (
                  <ParticipantChip key={status} name="민수" status={status} progress={progress} />
                ))}
                <ParticipantChip name={LONG_NICK} status="running" progress={0.07} />
              </View>
            )}
          </Contexted>
        </Group>
        <Group title="극단값 · 오프라인" count={4}>
          <Contexted mode={mode}>{() => <StressCases />}</Contexted>
        </Group>
      </View>
    </ScrollView>
  );
}

// 달리모 아이덴티티: 워드마크, 심볼("모" = 코스 루프 + 출발점), 로딩 (FOUNDATION-DECISION-LOG 11항)
function BrandCases() {
  return (
    <View style={styles.stack}>
      <Case label="워드마크 · 32 / 20">
        <View style={styles.row}>
          <Wordmark height={32} />
          <Wordmark height={20} />
        </View>
      </Case>
      <Case label="심볼 signal · ink · 64 / 32 / 20">
        <View style={styles.row}>
          <BrandSymbol size={64} />
          <BrandSymbol size={32} />
          <BrandSymbol size={20} />
          <BrandSymbol size={64} tone="ink" />
          <BrandSymbol size={32} tone="ink" />
        </View>
      </Case>
      <Case label="로딩 (동작 줄이기면 정지)">
        <View style={styles.row}>
          <BrandLoader size={48} />
          <BrandLoader size={28} />
        </View>
      </Case>
    </View>
  );
}

function ActionCases() {
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({ '3~5km': true });

  return (
    <View style={styles.stack}>
      <Case label="ready · 누르면 loading 전환">
        <PrimaryRunButton label="이 코스 달리기" loading={loading} onPress={() => setLoading((v) => !v)} />
      </Case>
      <Case label="disabledGPS">
        <PrimaryRunButton label="이 코스 달리기" availability="disabledGPS" />
      </Case>
      <Case label="disabledPermission">
        <PrimaryRunButton label="이 코스 달리기" availability="disabledPermission" />
      </Case>
      <Case label="긴 라벨">
        <PrimaryRunButton label="수성못 둘레길 야간 코스 달리기 시작하기" />
      </Case>
      <Case label="필터 · 누르면 토글 · disabled · 긴 라벨">
        <View style={styles.wrap}>
          {['3~5km', '평지', '야간'].map((k) => (
            <FilterChip
              key={k}
              label={k}
              selected={!!selected[k]}
              onPress={() => setSelected((s) => ({ ...s, [k]: !s[k] }))}
            />
          ))}
          <FilterChip label="화장실 있음" disabled />
          <FilterChip label="신호등 적은 코스만 보기" />
        </View>
      </Case>
    </View>
  );
}

function MetricCases() {
  return (
    <View style={styles.stack}>
      <Case label="default · emphasized · warning · unavailable">
        <View style={styles.grid}>
          <MetricBlock label="거리" value={formatDistanceKm(5020)} unit="km" />
          <MetricBlock label="평균 페이스" value={formatPace(303)} status="emphasized" />
          <MetricBlock label="현재 페이스" value={formatPace(412)} status="warning" />
          <MetricBlock label="고도 상승" value="" unit="m" status="unavailable" />
        </View>
      </Case>
      <Case label="hero">
        <MetricBlock label="거리" value={formatDistanceKm(3720)} unit="km" size="hero" align="center" />
      </Case>
      <Case label="labelPosition top · medium">
        <View style={styles.grid}>
          <MetricBlock label="시간" value={formatDuration(1521)} size="medium" labelPosition="top" />
          <MetricBlock label="거리" value={formatDistanceKm(5020)} unit="km" size="medium" labelPosition="top" />
        </View>
      </Case>
    </View>
  );
}

function CourseCases() {
  const [selectedId, setSelectedId] = useState('a');

  return (
    <View>
      <CourseCard
        title="한강 야간 5K"
        distanceM={5200}
        tags={['평지', '신호 적음']}
        proximityM={1300}
        recordContext="내 PB 25:42 · 주간 18위"
        selected={selectedId === 'a'}
        onPress={() => setSelectedId('a')}
      />
      <CourseCard
        title="대구스타디움 루프"
        distanceM={4800}
        tags={['초보 추천']}
        proximityM={3400}
        selected={selectedId === 'b'}
        onPress={() => setSelectedId('b')}
      />
      <CourseCard title={LONG_COURSE} distanceM={5100} tags={['야간 밝음', '아스팔트', '화장실 2곳']} proximityM={250} />
      <CourseCard title="이름만 있는 코스" distanceM={3000} />
      <CourseCard variant="compact" title={LONG_COURSE} distanceM={42195} tags={['평지']} />
      <CourseCard loading title="" distanceM={0} />
    </View>
  );
}

function GapCases() {
  return (
    <View style={styles.stack}>
      <GapIndicator direction="ahead" delta={8} label="목표" />
      <GapIndicator direction="behind" delta={72} label="PB" />
      <GapIndicator direction="tied" label="민수" />
      <GapIndicator direction="tied" label="지훈" />
      <GapIndicator direction="noData" label="PB" />
      <GapIndicator direction="ahead" delta={72} unit="m" label="민수" size="compact" />
      <GapIndicator direction="behind" delta={110} unit="m" label="선두" size="compact" />
    </View>
  );
}

function RankingCases() {
  return (
    <View>
      <RankingRow rank={1} name="지수" timeSec={1398} paceSecPerKm={274} />
      <RankingRow rank={2} name="민수" timeSec={1402} paceSecPerKm={275} relation="friend" />
      <RankingRow rank={3} name="러너 박" timeSec={1411} paceSecPerKm={277} />
      <AppDivider inset="md" />
      <RankingRow rank={17} name="하늘" timeSec={1531} paceSecPerKm={300} />
      <RankingRow rank={18} name="나" timeSec={1542} paceSecPerKm={302} relation="self" isPB rankChange={9} />
      <RankingRow rank={19} name="도윤" timeSec={1549} paceSecPerKm={304} relation="friend" rankChange={-2} />
      <AppDivider inset="md" />
      <RankingRow rank={1234} name={LONG_NICK} timeSec={2621} relation="self" />
      <RankingRow rank={12345} name="서울숲러닝크루_주말장거리" timeSec={3599} />
      <RankingRow rank={null} name="나" timeSec={2710} relation="self" />
    </View>
  );
}

function StressCases() {
  const { colors } = useTheme();

  return (
    <View style={styles.stack}>
      <View style={styles.grid}>
        <MetricBlock label="거리" value={formatDistanceKm(100000)} unit="km" />
        <MetricBlock label="시간" value={formatDuration(35999)} />
        <MetricBlock label="평균 페이스" value={formatPace(3599)} />
      </View>
      <MetricBlock label="거리" value={formatDistanceKm(100000)} unit="km" size="hero" align="center" />
      <AppSurface level="surface" radius="card" style={[styles.notice, { borderColor: colors.border.subtle }]}>
        <AppIcon name="disconnected" size={18} color={colors.status.warning} />
        <AppText role="body" style={styles.flex}>
          오프라인 상태예요. 기록은 이 기기에 계속 저장되고, 연결되면 자동으로 올라가요.
        </AppText>
      </AppSurface>
    </View>
  );
}

// ---- 레이아웃 도우미 ----

function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();

  return (
    <View style={[styles.group, { borderColor: colors.border.subtle }]}>
      <AppPressable
        onPress={() => setOpen((v) => !v)}
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}, ${count}개 상태`}
        style={styles.groupHeader}
      >
        <View style={styles.groupHeaderRow}>
          <AppText role="sectionTitle" style={styles.flex}>
            {title}
          </AppText>
          <AppText role="label" tone="secondary" tabular>
            {count}
          </AppText>
          <AppIcon name={open ? 'expand' : 'collapse'} size={18} color={colors.text.secondary} />
        </View>
      </AppPressable>
      {open ? <View style={styles.groupBody}>{children}</View> : null}
    </View>
  );
}

function Case({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.case}>
      <AppText role="caption" tone="secondary">
        {label}
      </AppText>
      {children}
    </View>
  );
}

// 111.1장: light와 dark 컨텍스트를 같은 화면에서 비교한다.
function Contexted({ mode, children }: { mode: ContextMode; children: () => ReactNode }) {
  const schemes = mode === 'both' ? (['light', 'dark'] as const) : ([mode] as const);
  return (
    <View style={styles.stack}>
      {schemes.map((s) => (
        <ThemeProvider key={s} scheme={s}>
          <ContextBox>{children()}</ContextBox>
        </ThemeProvider>
      ))}
    </View>
  );
}

function ContextBox({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <AppSurface level="canvas" radius="card" style={[styles.contextBox, { borderColor: colors.border.subtle }]}>
      {children}
    </AppSurface>
  );
}

function ColorRoleList() {
  const { colors } = useTheme();
  const groups = Object.entries(colors) as [keyof ColorRoles, Record<string, string>][];

  return (
    <View style={styles.stack}>
      {groups.map(([group, roles]) =>
        Object.entries(roles).map(([name, value]) => (
          <View key={`${group}.${name}`} style={styles.swatchRow}>
            <View style={[styles.swatch, { backgroundColor: value, borderColor: colors.border.subtle }]} />
            <AppText role="label" style={styles.flex}>
              {group}.{name}
            </AppText>
            <AppText role="caption" tone="secondary" tabular>
              {value}
            </AppText>
          </View>
        )),
      )}
    </View>
  );
}

function TypographyList() {
  return (
    <View style={styles.stack}>
      {TEXT_ROLES.map((r) => (
        <View key={r}>
          <AppText role="caption" tone="secondary">
            {r}
          </AppText>
          <AppText role={r} tabular={r.startsWith('metric')} numberOfLines={2}>
            {r.startsWith('metric') ? '3.72 18:42' : '오늘 달릴 코스를 찾고 같이 달려요 5.2 km'}
          </AppText>
        </View>
      ))}
      <View style={styles.row}>
        <View>
          <AppText role="metricLarge" tabular>
            1:11:11
          </AppText>
          <AppText role="metricLarge" tabular>
            8:48:08
          </AppText>
          <AppText role="caption" tone="secondary">
            tabular
          </AppText>
        </View>
        <View>
          <AppText role="metricLarge">1:11:11</AppText>
          <AppText role="metricLarge">8:48:08</AppText>
          <AppText role="caption" tone="secondary">
            기본
          </AppText>
        </View>
      </View>
    </View>
  );
}

function ScaleList() {
  const { colors } = useTheme();
  return (
    <View style={styles.stack}>
      {Object.entries(spacing).map(([k, v]) => (
        <View key={k} style={styles.swatchRow}>
          <AppText role="caption" tone="secondary" style={styles.scaleLabel}>
            {k} {v}
          </AppText>
          <View style={{ width: v, height: spacing.sm, backgroundColor: colors.action.primary }} />
        </View>
      ))}
      <View style={styles.wrap}>
        {Object.entries(radius).map(([k, v]) => (
          <View key={k} style={styles.radiusItem}>
            <View
              style={{
                width: spacing.huge,
                height: spacing.huge,
                borderRadius: v,
                borderCurve: 'continuous',
                borderWidth: stroke.control,
                borderColor: colors.text.secondary,
              }}
            />
            <AppText role="caption" tone="secondary">
              {k} {v}
            </AppText>
          </View>
        ))}
      </View>
      <SignalRail progress={0.6} showHead />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.huge,
  },
  section: {
    gap: spacing.md,
  },
  group: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  groupHeader: {
    paddingVertical: spacing.sm,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  groupBody: {
    paddingBottom: spacing.lg,
  },
  case: {
    gap: spacing.sm,
  },
  stack: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxl,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  contextBox: {
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  swatch: {
    width: spacing.xxl,
    height: spacing.xxl,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
  },
  scaleLabel: {
    width: spacing.huge * 2,
  },
  radiusItem: {
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.md,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
