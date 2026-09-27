import { useState, type ReactNode } from 'react';
import { PixelRatio, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseCard } from '@/components/CourseCard';
import { FilterChip } from '@/components/FilterChip';
import { GapIndicator } from '@/components/GapIndicator';
import { GpsStatus, type GpsQuality } from '@/components/GpsStatus';
import { MetricBlock } from '@/components/MetricBlock';
import { ParticipantChip, type ParticipantStatus } from '@/components/ParticipantChip';
import { PrimaryRunButton } from '@/components/PrimaryRunButton';
import { RankingRow } from '@/components/RankingRow';
import { VerificationBadge, type VerificationStatus } from '@/components/VerificationBadge';
import { AppDivider, AppIcon, AppSurface, AppText } from '@/design/primitives';
import { ThemeProvider, useTheme } from '@/design/theme';
import { colorRoles, radius, spacing, stroke, type ColorRoles, type TextRole } from '@/design/tokens';
import { formatDistanceKm, formatDuration, formatPace } from '@/shared/format';

// DESIGN-SYSTEM-PLAYGROUND-SPEC.md 111장: 전시용 갤러리가 아니라 토큰·컴포넌트·상태를 검증하는 개발 도구다.
// 정상 상태보다 edge state를 더 많이 보여주고, 실제 한국어 문자열과 단위를 쓴다.

const LONG_COURSE = '수성못 둘레길 야간 5K 루프 (동쪽 데크길 경유, 초보 추천, 화장실 2곳)';
const LONG_NICK = '새벽다섯시에일어나는러너김민수입니다';
const GPS_STATES: GpsQuality[] = ['acquiring', 'good', 'fair', 'poor', 'unavailable'];
const VERIFICATION_STATES: VerificationStatus[] = ['pending', 'verified', 'unverified', 'rejected'];
const PARTICIPANT_STATES: { status: ParticipantStatus; progress?: number }[] = [
  { status: 'invited' },
  { status: 'ready' },
  { status: 'running', progress: 0.64 },
  { status: 'disconnected' },
  { status: 'finished', progress: 1 },
  { status: 'dnf' },
];
const TEXT_ROLES: TextRole[] = ['metricHero', 'metricLarge', 'screenTitle', 'sectionTitle', 'body', 'label', 'caption'];

export function DesignSystemPlayground() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg.canvas }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.huge }]}
    >
      <AppText role="caption" tone="secondary">
        개발 전용 QA 화면. 현재 시스템 글자 크기 배율 {PixelRatio.getFontScale().toFixed(2)}. 글자 크기 테스트는 기기
        설정에서 바꾼 뒤 이 화면을 다시 확인한다.
      </AppText>

      <Section title="Foundations · Color roles">
        <ContextPair>{() => <ColorRoleList />}</ContextPair>
      </Section>

      <Section title="Foundations · Spacing / Radius / Stroke">
        <SpacingScale />
        <RadiusScale />
      </Section>

      <Section title="Typography">
        <ContextPair>{() => <TypographyList />}</ContextPair>
        <Case label="tabular vs 기본 숫자 폭">
          <View style={styles.row}>
            <View>
              <AppText role="metricLarge" tabular>
                1:11:11
              </AppText>
              <AppText role="metricLarge" tabular>
                8:88:88
              </AppText>
              <AppText role="caption" tone="secondary">
                tabular
              </AppText>
            </View>
            <View>
              <AppText role="metricLarge">1:11:11</AppText>
              <AppText role="metricLarge">8:88:88</AppText>
              <AppText role="caption" tone="secondary">
                기본
              </AppText>
            </View>
          </View>
        </Case>
      </Section>

      <Section title="Actions">
        <ActionCases />
      </Section>

      <Section title="Metrics">
        <Case label="light · default / emphasized / warning / unavailable">
          <View style={styles.grid}>
            <MetricBlock label="거리" value={formatDistanceKm(5020)} unit="km" />
            <MetricBlock label="평균 페이스" value={formatPace(303)} status="emphasized" />
            <MetricBlock label="현재 페이스" value={formatPace(412)} status="warning" />
            <MetricBlock label="고도 상승" value="" unit="m" status="unavailable" />
          </View>
        </Case>
        <DarkBlock label="dark · Active Run metric 위계 (92장 배치 기준)">
          <DarkRunMetrics />
        </DarkBlock>
      </Section>

      <Section title="Course">
        <CourseCases />
      </Section>

      <Section title="GPS">
        <ContextPair>
          {() => (
            <View style={styles.stack}>
              {GPS_STATES.map((q) => (
                <Case key={q} label={q}>
                  <GpsStatus quality={q} />
                </Case>
              ))}
            </View>
          )}
        </ContextPair>
      </Section>

      <Section title="Competition · GapIndicator">
        <ContextPair>
          {() => (
            <View style={styles.stack}>
              <Case label="ahead · sec">
                <GapIndicator direction="ahead" delta={8} label="목표" />
              </Case>
              <Case label="behind · sec">
                <GapIndicator direction="behind" delta={72} label="PB" />
              </Case>
              <Case label="tied · 받침 없음 / 있음">
                <GapIndicator direction="tied" label="민수" />
                <GapIndicator direction="tied" label="지훈" />
              </Case>
              <Case label="noData">
                <GapIndicator direction="noData" label="PB" />
              </Case>
              <Case label="ahead · m (Together)">
                <GapIndicator direction="ahead" delta={72} unit="m" label="민수" size="compact" />
              </Case>
              <Case label="behind · m (Together)">
                <GapIndicator direction="behind" delta={110} unit="m" label="선두" size="compact" />
              </Case>
            </View>
          )}
        </ContextPair>
      </Section>

      <Section title="Ranking">
        <RankingCases />
      </Section>

      <Section title="Verification">
        <ContextPair>
          {() => (
            <View style={styles.stack}>
              {VERIFICATION_STATES.map((s) => (
                <Case key={s} label={s}>
                  <VerificationBadge status={s} />
                </Case>
              ))}
            </View>
          )}
        </ContextPair>
      </Section>

      <Section title="Together · ParticipantChip">
        <ContextPair>
          {() => (
            <View style={styles.stack}>
              {PARTICIPANT_STATES.map(({ status, progress }) => (
                <Case key={status} label={status}>
                  <ParticipantChip name="민수" status={status} progress={progress} />
                </Case>
              ))}
              <Case label="긴 닉네임 · running">
                <ParticipantChip name={LONG_NICK} status="running" progress={0.07} />
              </Case>
            </View>
          )}
        </ContextPair>
      </Section>

      <Section title="Stress">
        <StressCases />
      </Section>
    </ScrollView>
  );
}

function ActionCases() {
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({ '3~5km': true });
  const toggle = (k: string) => setSelected((s) => ({ ...s, [k]: !s[k] }));

  return (
    <View style={styles.stack}>
      <Case label="PrimaryRunButton · ready (누르면 loading 전환)">
        <PrimaryRunButton label="이 코스 달리기" loading={loading} onPress={() => setLoading((v) => !v)} />
      </Case>
      <Case label="disabledGPS">
        <PrimaryRunButton label="이 코스 달리기" availability="disabledGPS" />
      </Case>
      <Case label="disabledPermission">
        <PrimaryRunButton label="이 코스 달리기" availability="disabledPermission" />
      </Case>
      <Case label="loading">
        <PrimaryRunButton label="이 코스 달리기" loading />
      </Case>
      <Case label="긴 라벨">
        <PrimaryRunButton label="수성못 둘레길 야간 코스 달리기 시작하기" />
      </Case>
      <DarkBlock label="dark · Run Ready 컨텍스트">
        <PrimaryRunButton label="시작" />
        <PrimaryRunButton label="시작" availability="disabledGPS" />
      </DarkBlock>
      <Case label="FilterChip · default / selected / disabled (누르면 토글)">
        <View style={styles.wrap}>
          {['3~5km', '평지', '야간'].map((k) => (
            <FilterChip key={k} label={k} selected={!!selected[k]} onPress={() => toggle(k)} />
          ))}
          <FilterChip label="화장실 있음" disabled />
          <FilterChip label="신호등 적은 코스만 보기" />
        </View>
      </Case>
    </View>
  );
}

function DarkRunMetrics() {
  return (
    <View style={styles.stackLg}>
      <GpsStatus quality="good" />
      <MetricBlock label="거리" value={formatDistanceKm(3720)} unit="km" size="hero" align="center" />
      <View style={styles.row}>
        <MetricBlock label="시간" value={formatDuration(1122)} style={styles.flex} />
        <MetricBlock label="평균 페이스" value={formatPace(301)} style={styles.flex} />
      </View>
      <GapIndicator direction="ahead" delta={8} label="목표" />
      <View style={styles.row}>
        <MetricBlock label="현재 페이스" value={formatPace(null)} status="unavailable" style={styles.flex} />
        <MetricBlock label="남은 거리" value={formatDistanceKm(1300)} unit="km" status="emphasized" style={styles.flex} />
      </View>
    </View>
  );
}

function CourseCases() {
  const [selectedId, setSelectedId] = useState('a');

  return (
    <View>
      <Case label="default · selected (누르면 선택 이동)" flush>
        <CourseCard
          title="한강 야간 5K"
          distanceM={5200}
          tags={['평지', '신호 적음']}
          proximityM={1300}
          recordContext="내 PB 25:42 · 주간 18위"
          selected={selectedId === 'a'}
          onPress={() => setSelectedId('a')}
        />
        <AppDivider inset="lg" />
        <CourseCard
          title="대구스타디움 루프"
          distanceM={4800}
          tags={['초보 추천']}
          proximityM={3400}
          selected={selectedId === 'b'}
          onPress={() => setSelectedId('b')}
        />
        <AppDivider inset="lg" />
        <CourseCard title={LONG_COURSE} distanceM={5100} tags={['야간 밝음', '아스팔트', '화장실 2곳']} proximityM={250} />
      </Case>
      <Case label="no metadata" flush>
        <CourseCard title="이름만 있는 코스" distanceM={3000} />
      </Case>
      <Case label="compact · 긴 제목" flush>
        <CourseCard variant="compact" title={LONG_COURSE} distanceM={5100} tags={['평지']} />
      </Case>
      <Case label="loading · default / compact" flush>
        <CourseCard loading title="" distanceM={0} />
        <CourseCard loading variant="compact" title="" distanceM={0} />
      </Case>
    </View>
  );
}

function RankingCases() {
  return (
    <ContextPair>
      {() => (
        <View>
          <Case label="podium 1~3" flush>
            <RankingRow rank={1} name="지수" timeSec={1398} />
            <RankingRow rank={2} name="민수" timeSec={1402} relation="friend" />
            <RankingRow rank={3} name="러너 박" timeSec={1411} />
          </Case>
          <Case label="nearby · self 전후 · rankChange" flush>
            <RankingRow rank={17} name="하늘" timeSec={1531} />
            <RankingRow rank={18} name="나" timeSec={1542} relation="self" rankChange={9} />
            <RankingRow rank={19} name="도윤" timeSec={1549} relation="friend" rankChange={-2} />
          </Case>
          <Case label="4~5자리 순위 · 긴 닉네임 · unranked" flush>
            <RankingRow rank={1234} name={LONG_NICK} timeSec={2621} relation="self" />
            <RankingRow rank={12345} name="서울숲러닝크루_주말장거리" timeSec={3599} />
            <RankingRow rank={null} name="나" timeSec={2710} relation="self" />
          </Case>
        </View>
      )}
    </ContextPair>
  );
}

function StressCases() {
  const { colors } = useTheme();

  return (
    <View style={styles.stack}>
      <Case label="extreme values · light">
        <View style={styles.grid}>
          <MetricBlock label="거리" value={formatDistanceKm(100000)} unit="km" />
          <MetricBlock label="시간" value={formatDuration(35999)} />
          <MetricBlock label="평균 페이스" value={formatPace(3599)} />
          <MetricBlock label="마라톤" value={formatDistanceKm(42195)} unit="km" />
        </View>
      </Case>
      <DarkBlock label="extreme values · dark hero">
        <MetricBlock label="거리" value={formatDistanceKm(100000)} unit="km" size="hero" align="center" />
        <MetricBlock label="시간" value={formatDuration(35999)} size="hero" align="center" />
      </DarkBlock>
      <Case label="offline · 기록 보존 안내 (73장: 네트워크 문제와 기록 유실을 혼동시키지 않음)">
        <AppSurface level="surface" radius="card" style={[styles.notice, { borderColor: colors.border.subtle }]}>
          <AppIcon name="disconnected" size={18} color={colors.status.warning} />
          <AppText role="body" style={styles.flex}>
            오프라인 상태예요. 기록은 이 기기에 계속 저장되고, 연결되면 자동으로 올라가요.
          </AppText>
        </AppSurface>
      </Case>
      <DarkBlock label="offline · dark">
        <OfflineNoticeDark />
      </DarkBlock>
    </View>
  );
}

function OfflineNoticeDark() {
  const { colors } = useTheme();
  return (
    <AppSurface level="surface" radius="card" style={[styles.notice, { borderColor: colors.border.subtle }]}>
      <AppIcon name="disconnected" size={18} color={colors.status.warning} />
      <AppText role="body" style={styles.flex}>
        연결이 끊겼어요. 러닝은 계속 기록되고 있어요.
      </AppText>
    </AppSurface>
  );
}

// ---- 레이아웃 도우미 ----

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText role="screenTitle" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function Case({ label, children, flush }: { label: string; children: ReactNode; flush?: boolean }) {
  return (
    <View style={styles.case}>
      <AppText role="caption" tone="secondary" style={flush && styles.flushLabel}>
        {label}
      </AppText>
      {children}
    </View>
  );
}

// light와 dark 컨텍스트를 같은 화면에서 비교한다 (111.1장).
function ContextPair({ children }: { children: () => ReactNode }) {
  return (
    <View style={styles.stack}>
      <AppSurface level="canvas" radius="card" style={[styles.contextBox, styles.lightBox]}>
        <AppText role="label" tone="secondary">
          light
        </AppText>
        {children()}
      </AppSurface>
      <ThemeProvider scheme="dark">
        <AppSurface level="canvas" radius="card" style={styles.contextBox}>
          <AppText role="label" tone="secondary">
            dark
          </AppText>
          {children()}
        </AppSurface>
      </ThemeProvider>
    </View>
  );
}

function DarkBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ThemeProvider scheme="dark">
      <AppSurface level="canvas" radius="card" style={[styles.contextBox, styles.stackLg]}>
        <AppText role="caption" tone="secondary">
          {label}
        </AppText>
        {children}
      </AppSurface>
    </ThemeProvider>
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
            {r.startsWith('metric') ? '3.72' : '오늘 달릴 코스를 찾고 같이 달려요 5.2 km'}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function SpacingScale() {
  const { colors } = useTheme();
  return (
    <Case label="spacing">
      {Object.entries(spacing).map(([k, v]) => (
        <View key={k} style={styles.swatchRow}>
          <AppText role="caption" tone="secondary" style={styles.scaleLabel}>
            {k} {v}
          </AppText>
          <View style={{ width: v, height: spacing.sm, backgroundColor: colors.action.primary }} />
        </View>
      ))}
    </Case>
  );
}

function RadiusScale() {
  const { colors } = useTheme();
  return (
    <Case label="radius · stroke">
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
              {k}
            </AppText>
          </View>
        ))}
        <View style={styles.radiusItem}>
          <View style={{ width: spacing.huge, height: stroke.signal, backgroundColor: colors.action.primary }} />
          <AppText role="caption" tone="secondary">
            signal line
          </AppText>
        </View>
      </View>
    </Case>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.huge,
  },
  section: {
    gap: spacing.lg,
  },
  case: {
    gap: spacing.sm,
  },
  flushLabel: {
    paddingHorizontal: spacing.lg,
  },
  stack: {
    gap: spacing.md,
  },
  stackLg: {
    gap: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
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
  },
  lightBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colorRoles.light.border.subtle,
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
