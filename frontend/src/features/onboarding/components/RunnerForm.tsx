import { StyleSheet, View } from 'react-native';

import { FilterChip } from '@/components/FilterChip';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import type { RunnerProfile } from '@/entities/user/types';

import { DISTANCE_OPTIONS, EXPERIENCE_OPTIONS, TIME_OPTIONS } from '../runnerOptions';

// 러너 정보 세 가지 (결정 로그 64항). 온보딩(dark)과 설정 > 러너 정보(light)가 같이 쓴다.
// 모두 고르지 않아도 된다. 고른 것을 다시 누르면 선택이 풀린다.
// 짧은 값(거리 · 시간)은 칩, 설명이 필요한 경험은 한 줄씩. 선택은 채움 + 체크 아이콘 (색만으로 구분하지 않는다)
export function RunnerForm({ value, onChange }: { value: RunnerProfile; onChange: (next: RunnerProfile) => void }) {
  const toggle = <K extends keyof RunnerProfile>(key: K, v: NonNullable<RunnerProfile[K]>) =>
    onChange({ ...value, [key]: value[key] === v ? null : v });

  return (
    <View style={styles.root}>
      <Question title="평소 한 번에 얼마나 달려요?">
        <View style={styles.chips} accessibilityRole="radiogroup">
          {DISTANCE_OPTIONS.map((o) => (
            <FilterChip key={o.value} label={o.label} selected={value.distance === o.value} onPress={() => toggle('distance', o.value)} />
          ))}
        </View>
      </Question>

      <Question title="달리기는 얼마나 해 봤어요?">
        <View style={styles.rows} accessibilityRole="radiogroup">
          {EXPERIENCE_OPTIONS.map((o) => (
            <ChoiceRow key={o.value} label={o.label} caption={o.caption} selected={value.experience === o.value} onPress={() => toggle('experience', o.value)} />
          ))}
        </View>
      </Question>

      <Question title="주로 언제 달려요?">
        <View style={styles.chips} accessibilityRole="radiogroup">
          {TIME_OPTIONS.map((o) => (
            <FilterChip key={o.value} label={o.label} selected={value.preferredTime === o.value} onPress={() => toggle('preferredTime', o.value)} />
          ))}
        </View>
      </Question>
    </View>
  );
}

function Question({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.question}>
      <AppText role="sectionTitle" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function ChoiceRow({ label, caption, selected, onPress }: { label: string; caption: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const fg = selected ? colors.action.onSecondary : colors.text.primary;
  return (
    <AppPressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={`${label}, ${caption}`}
      accessibilityState={{ selected, checked: selected }}
      style={[styles.row, { backgroundColor: selected ? colors.action.secondary : colors.bg.surface }]}
    >
      <View style={styles.flex}>
        <AppText role="body" style={[styles.rowLabel, { color: fg }]}>
          {label}
        </AppText>
        <AppText role="caption" style={{ color: selected ? colors.action.onSecondary : colors.text.secondary }}>
          {caption}
        </AppText>
      </View>
      {selected ? <AppIcon name="check" size={18} color={fg} /> : null}
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xxl,
  },
  question: {
    gap: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rows: {
    gap: spacing.sm,
  },
  row: {
    minHeight: touchTarget.primary,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowLabel: {
    fontFamily: fontFamily.bold,
  },
  flex: {
    flex: 1,
  },
});
