import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import type { RunSummary } from '@/entities/run/history';
import { MODE_TITLE } from '@/features/run-ready/runPlanParams';
import { formatDistanceKm, formatDuration, formatPace } from '@/shared/format';

import { dayLabel, runTags, runTitle, startedAt, timeLabel, type RunTag } from '../labels';
import { RoutePreview } from './RoutePreview';

// 히스토리 한 줄 (MY-003). 경로 모양 → 이름 · 날짜 · 페이스 → 거리. 누르면 러닝 상세(SCR-M03).
// 코스 기록은 코스 기록 시간을, 코스를 끝내지 못했거나 자유 기록이면 달린 시간을 보여준다.
export function RunRow({ run: r, showDate = true }: { run: RunSummary; showDate?: boolean }) {
  const d = startedAt(r);
  const tags = runTags(r);
  const title = runTitle(r);
  const sub = [showDate ? dayLabel(d) : null, timeLabel(d), r.course ? MODE_TITLE[r.mode] : null].filter(Boolean).join(' · ');
  const time = r.course?.timeSec ?? r.activeSec;

  return (
    <AppPressable
      onPress={() => router.push({ pathname: '/my/runs/[id]', params: { id: r.id } })}
      accessibilityRole="button"
      accessibilityLabel={[title, sub, `${formatDistanceKm(r.distanceM)}킬로미터`, formatDuration(time), ...tags.map((t) => t.label)].join(', ')}
      style={styles.root}
    >
      <RoutePreview points={r.preview} course={r.course != null} />
      <View style={styles.body}>
        <AppText role="body" numberOfLines={1} style={styles.bold}>
          {title}
        </AppText>
        <AppText role="caption" tone="secondary" numberOfLines={1}>
          {sub}
        </AppText>
        <View style={styles.meta}>
          <AppText role="caption" tone="secondary" tabular>
            {formatDuration(time)} · {formatPace(r.avgPaceSec)}/km
          </AppText>
          {tags.map((t) => (
            <Tag key={t.key} tag={t} />
          ))}
        </View>
      </View>
      <AppText role="sectionTitle" tabular style={styles.bold}>
        {formatDistanceKm(r.distanceM)}
        <AppText role="caption" tone="secondary">
          {' '}
          km
        </AppText>
      </AppText>
    </AppPressable>
  );
}

// 색만으로 구분하지 않도록 아이콘과 글자를 함께 쓴다. PB는 민트 바탕 글자.
function Tag({ tag }: { tag: RunTag }) {
  const { colors } = useTheme();
  if (tag.tone === 'accent') {
    return (
      <View style={[styles.pb, { backgroundColor: colors.action.primary }]}>
        <AppText role="caption" style={[styles.bold, { color: colors.action.onPrimary }]}>
          {tag.label}
        </AppText>
      </View>
    );
  }
  const color = tag.tone === 'warning' ? colors.status.warning : tag.tone === 'danger' ? colors.status.danger : colors.text.secondary;
  return (
    <View style={styles.tag}>
      {tag.icon ? <AppIcon name={tag.icon} size={12} color={color} /> : null}
      <AppText role="caption" tone="secondary">
        {tag.label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: touchTarget.min + spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  body: {
    flex: 1,
    gap: 1,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: spacing.sm,
    rowGap: 2,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pb: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
});
