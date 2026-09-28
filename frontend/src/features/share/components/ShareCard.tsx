import { forwardRef, type ReactNode } from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';

import { Wordmark } from '@/components/Brand';
import { MapBaseLayer } from '@/components/MapBaseLayer';
import { darkTheme, ThemeProvider } from '@/design/theme';
import { fontFamily, OBLIQUE_SKEW } from '@/design/tokens';
import { makeProjection, type GeoPoint } from '@/shared/geo';
import { MOCK_MAP_BASE } from '@/shared/map/mockMapBase';

import type { ShareCardData, TemplateKey } from '../cardModel';

// SCR-R05 공유 카드 (ShareTemplateCard: map, record, ranking, battle).
// 앱 화면 캡처가 아니라 공유 전용 asset이다 (66장 Share Composer). 9:16 세로 카드 한 장을 그리고 그대로 이미지로 만든다.
// 어느 기기에서 만들어도 같은 이미지가 나오도록 글자 크기 설정을 따르지 않고, 기준 폭 360에 비례해 그린다.
export const CARD_BASE_W = 360;
export const CARD_BASE_H = 640;

const c = darkTheme.colors;

export const ShareCard = forwardRef<View, { data: ShareCardData; template: TemplateKey; width: number }>(function ShareCard({ data, template, width }, ref) {
  const u = width / CARD_BASE_W;
  return (
    <ThemeProvider scheme="dark">
      <View ref={ref} collapsable={false} style={{ width, height: CARD_BASE_H * u, backgroundColor: c.bg.canvas, padding: 28 * u, borderRadius: 0 }}>
        <View style={styles.header}>
          <Wordmark height={20 * u} />
          <T u={u} size={12} color={c.text.secondary}>
            {data.date}
          </T>
        </View>
        <View style={[styles.body, { marginVertical: 20 * u }]}>
          {template === 'map' ? <MapBody d={data} u={u} /> : template === 'record' ? <RecordBody d={data} u={u} /> : template === 'ranking' ? <RankingBody d={data} u={u} /> : <BattleBody d={data} u={u} />}
        </View>
        <View style={[styles.footer, { borderTopColor: c.border.subtle, paddingTop: 14 * u }]}>
          <T u={u} size={13} weight="bold" numberOfLines={1} style={styles.flexShrink}>
            {data.nickname}
          </T>
          <T u={u} size={12} color={c.text.secondary}>
            코스를 찾고, 같이 달리고, 기록을 깨다
          </T>
        </View>
      </View>
    </ThemeProvider>
  );
});

// 카드 전용 글자. 크기는 기준 폭에 비례하고 기기 글자 크기 설정을 따르지 않는다(이미지이므로).
function T({
  u,
  size,
  weight = 'regular',
  color = c.text.primary,
  oblique = false,
  numberOfLines,
  style,
  children,
}: {
  u: number;
  size: number;
  weight?: keyof typeof fontFamily;
  color?: string;
  oblique?: boolean;
  numberOfLines?: number;
  style?: TextStyle;
  children: ReactNode;
}) {
  return (
    <Text
      allowFontScaling={false}
      numberOfLines={numberOfLines}
      style={[
        { fontFamily: fontFamily[weight], fontSize: size * u, lineHeight: size * u * (size >= 40 ? 1.05 : 1.35), color, includeFontPadding: false },
        oblique && { transform: [{ skewX: OBLIQUE_SKEW }], letterSpacing: -size * u * 0.035 },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// 기록 값이 길어도(1:02:03) 폭 안에 들어오게 글자 크기를 줄인다
function fitSize(value: string, max: number, widthBase: number) {
  return Math.min(max, widthBase / Math.max(1, value.length * 0.6));
}

function Headline({ d, u }: { d: ShareCardData; u: number }) {
  return d.highlight ? (
    <View style={[styles.pill, { backgroundColor: c.action.primary, paddingHorizontal: 10 * u, paddingVertical: 3 * u, borderRadius: 999 }]}>
      <T u={u} size={14} weight="extrabold" color={c.action.onPrimary}>
        {d.headline}
      </T>
    </View>
  ) : (
    <T u={u} size={14} weight="bold" color={c.text.secondary}>
      {d.headline}
    </T>
  );
}

function Verified({ d, u }: { d: ShareCardData; u: number }) {
  if (!d.verified) return null;
  return (
    <View style={[styles.row, { gap: 4 * u }]}>
      <Svg width={12 * u} height={12 * u} viewBox="0 0 12 12">
        <Path d="M2.5 6.2 5 8.6 9.6 3.6" stroke={c.status.success} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <T u={u} size={11} color={c.text.secondary}>
        공식 기록
      </T>
    </View>
  );
}

function StatsRow({ d, u }: { d: ShareCardData; u: number }) {
  return (
    <View style={[styles.row, { gap: 22 * u }]}>
      {d.stats.map((s) => (
        <View key={s.label}>
          <T u={u} size={11} color={c.text.secondary}>
            {s.label}
          </T>
          <T u={u} size={20} weight="black" oblique>
            {s.value}
            {s.unit ? (
              <T u={u} size={12} weight="bold" color={c.text.secondary}>
                {' '}
                {s.unit}
              </T>
            ) : null}
          </T>
        </View>
      ))}
    </View>
  );
}

function Primary({ d, u, max = 44 }: { d: ShareCardData; u: number; max?: number }) {
  const size = fitSize(d.primary.value, max, 200);
  return (
    <View>
      <T u={u} size={11} color={c.text.secondary}>
        {d.primary.label}
      </T>
      <T u={u} size={size} weight="black" oblique>
        {d.primary.value}
        {d.primary.unit ? (
          <T u={u} size={16} weight="bold" color={c.text.secondary}>
            {' '}
            {d.primary.unit}
          </T>
        ) : null}
      </T>
    </View>
  );
}

// 지도: 어두운 지도 위에 코스(짙은 민트 테두리 + 형광 민트)와 달린 길(흰 선). 결과 지도와 같은 선 구분.
function MapBody({ d, u }: { d: ShareCardData; u: number }) {
  const w = (CARD_BASE_W - 56) * u;
  const h = 300 * u;
  const sets = [...(d.course && d.course.length > 1 ? [d.course] : []), ...(d.path.length > 1 ? [d.path] : [])];
  const project = sets.length ? makeProjection(sets, w, h, 32 * u) : null;
  const pts = (p: GeoPoint[]) => (project ? p.map(project).map((x) => x.join(',')).join(' ') : '');
  const start = project && d.path[0] ? project(d.path[0]) : null;
  const end = project && d.path.length > 1 ? project(d.path[d.path.length - 1]) : null;
  return (
    <View style={{ gap: 16 * u }}>
      <View style={{ width: w, height: h, borderRadius: 18 * u, overflow: 'hidden', backgroundColor: c.mapBase.land }}>
        {project ? (
          <Svg width={w} height={h}>
            <MapBaseLayer base={MOCK_MAP_BASE} project={project} />
            {d.course && d.course.length > 1 ? (
              <>
                <Polyline points={pts(d.course)} fill="none" stroke={c.route.casing} strokeWidth={11 * u} strokeLinecap="round" strokeLinejoin="round" />
                <Polyline points={pts(d.course)} fill="none" stroke={c.route.course} strokeWidth={6 * u} strokeLinecap="round" strokeLinejoin="round" />
              </>
            ) : null}
            <Polyline
              points={pts(d.path)}
              fill="none"
              stroke={d.course ? c.route.actual : c.route.course}
              strokeWidth={(d.course ? 2.5 : 5) * u}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {end ? <Circle cx={end[0]} cy={end[1]} r={5 * u} fill={c.route.actual} /> : null}
            {start ? <Circle cx={start[0]} cy={start[1]} r={6 * u} fill={c.bg.canvas} stroke={c.route.course} strokeWidth={3 * u} /> : null}
          </Svg>
        ) : null}
      </View>
      <View style={{ gap: 6 * u }}>
        <T u={u} size={22} weight="extrabold" numberOfLines={1}>
          {d.title}
        </T>
        <View style={[styles.row, { gap: 10 * u }]}>
          <Headline d={d} u={u} />
          <Verified d={d} u={u} />
        </View>
      </View>
      <View style={[styles.row, styles.between, { alignItems: 'flex-end' }]}>
        <Primary d={d} u={u} max={40} />
        <StatsRow d={{ ...d, stats: d.stats.slice(0, 1) }} u={u} />
      </View>
    </View>
  );
}

// 기록: 영수증처럼 큰 기록 한 줄과 항목 목록 (63장 workout receipt)
function RecordBody({ d, u }: { d: ShareCardData; u: number }) {
  const size = fitSize(d.primary.value, 104, 300);
  const rows = [...d.stats.map((s) => ({ label: s.label, value: `${s.value}${s.unit ? ` ${s.unit}` : ''}` })), { label: '방식', value: d.context }];
  return (
    <View style={{ gap: 18 * u }}>
      <View style={{ gap: 6 * u }}>
        <T u={u} size={13} color={c.text.secondary} numberOfLines={1}>
          {d.title}
        </T>
        <T u={u} size={28} weight="extrabold" color={d.highlight ? c.action.primary : c.text.primary}>
          {d.headline}
        </T>
      </View>
      <View>
        <T u={u} size={size} weight="black" oblique>
          {d.primary.value}
        </T>
        <View style={[styles.row, { gap: 10 * u, marginTop: 4 * u }]}>
          <T u={u} size={13} color={c.text.secondary}>
            {d.primary.label}
            {d.primary.unit ? ` (${d.primary.unit})` : ''}
          </T>
          <Verified d={d} u={u} />
        </View>
      </View>
      <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: c.border.strong }}>
        {rows.map((r) => (
          <View key={r.label} style={[styles.row, styles.between, { paddingVertical: 11 * u, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: c.border.subtle }]}>
            <T u={u} size={13} color={c.text.secondary}>
              {r.label}
            </T>
            <T u={u} size={15} weight="bold">
              {r.value}
            </T>
          </View>
        ))}
      </View>
      {d.path.length > 1 ? <RouteGlyph points={d.course ?? d.path} u={u} /> : null}
    </View>
  );
}

function RouteGlyph({ points, u }: { points: GeoPoint[]; u: number }) {
  const s = 64 * u;
  const project = makeProjection([points], s, s, 6 * u);
  return (
    <View style={styles.selfEnd}>
      <Svg width={s} height={s}>
        <Polyline points={points.map(project).map((x) => x.join(',')).join(' ')} fill="none" stroke={c.action.primary} strokeWidth={3 * u} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

// 순위: 이번 주 코스 순위를 가장 크게, 변화는 방향 기호와 문구로 (색만으로 구분하지 않음)
function RankingBody({ d, u }: { d: ShareCardData; u: number }) {
  const r = d.ranking!;
  const up = r.before != null ? r.before - r.after : null;
  return (
    <View style={{ gap: 18 * u }}>
      <View style={{ gap: 6 * u }}>
        <T u={u} size={13} color={c.text.secondary} numberOfLines={1}>
          {d.title} · {r.label}
        </T>
        <View style={[styles.row, { alignItems: 'flex-end', gap: 6 * u }]}>
          <T u={u} size={fitSize(String(r.after), 150, 250)} weight="black" oblique color={c.action.primary}>
            {r.after}
          </T>
          <T u={u} size={40} weight="extrabold" style={{ marginBottom: 14 * u }}>
            위
          </T>
        </View>
        <View style={[styles.row, { gap: 6 * u }]}>
          {up != null && up > 0 ? (
            <Svg width={12 * u} height={12 * u} viewBox="0 0 12 12">
              <Path d="M6 2 11 10H1Z" fill={c.action.primary} />
            </Svg>
          ) : null}
          <T u={u} size={16} weight="bold">
            {r.before != null ? `${r.before}위 → ${r.after}위${up != null && up > 0 ? ` · ${up}계단 올랐어요` : ''}` : '이번 주 첫 순위'}
          </T>
        </View>
      </View>
      <View style={[styles.row, { gap: 10 * u }]}>
        <Headline d={d} u={u} />
        <Verified d={d} u={u} />
      </View>
      <View style={[styles.row, { gap: 22 * u, alignItems: 'flex-end' }]}>
        <Primary d={d} u={u} max={36} />
        <StatsRow d={{ ...d, stats: d.stats.slice(0, 1) }} u={u} />
      </View>
    </View>
  );
}

// 대결: 나와 상대(또는 Live 참가자)를 한 줄씩. 내 줄은 민트로 표시하고 "나"를 붙인다.
function BattleBody({ d, u }: { d: ShareCardData; u: number }) {
  const b = d.battle!;
  const vs = b.rows.length === 2 && b.rows.every((x) => x.rank == null);
  return (
    <View style={{ gap: 16 * u }}>
      <View style={{ gap: 6 * u }}>
        <T u={u} size={13} color={c.text.secondary} numberOfLines={1}>
          {d.title} · {d.context}
        </T>
        <T u={u} size={30} weight="extrabold" color={d.highlight ? c.action.primary : c.text.primary}>
          {d.headline}
        </T>
      </View>
      <View style={{ gap: 8 * u }}>
        {b.rows.map((row, i) => (
          <View key={`${row.name}-${i}`}>
            {vs && i === 1 ? (
              <T u={u} size={13} weight="black" oblique color={c.text.secondary} style={{ textAlign: 'center', marginBottom: 8 * u }}>
                VS
              </T>
            ) : null}
            <View
              style={[
                styles.row,
                {
                  gap: 12 * u,
                  paddingHorizontal: 14 * u,
                  paddingVertical: 12 * u,
                  borderRadius: 14 * u,
                  backgroundColor: row.me ? c.action.tint : c.bg.surface,
                  borderWidth: row.me ? 1.5 * u : 0,
                  borderColor: c.action.primary,
                },
              ]}
            >
              {row.rank != null ? (
                <T u={u} size={18} weight="black" oblique color={row.me ? c.action.primary : c.text.secondary} style={{ width: 22 * u }}>
                  {row.rank}
                </T>
              ) : null}
              <T u={u} size={16} weight="bold" numberOfLines={1} style={styles.flex}>
                {row.name}
                {row.me ? ' (나)' : ''}
              </T>
              <T u={u} size={20} weight="black" oblique color={row.me ? c.action.primary : c.text.primary}>
                {row.value}
              </T>
            </View>
          </View>
        ))}
      </View>
      {b.caption ? (
        <T u={u} size={14} weight="bold" color={c.text.secondary}>
          {b.caption}
        </T>
      ) : null}
      <StatsRow d={d} u={u} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  between: {
    justifyContent: 'space-between',
  },
  pill: {
    alignSelf: 'flex-start',
  },
  selfEnd: {
    alignSelf: 'flex-end',
  },
  flex: {
    flex: 1,
  },
  flexShrink: {
    flexShrink: 1,
  },
});
