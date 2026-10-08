import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { FilterChip } from '@/components/FilterChip';
import { AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { COURSE_DESCRIPTION_MAX, COURSE_NAME_MAX } from '@/entities/course/api/courseRegistration';

// 탐색 필터 · 기존 코스와 같은 태그 이름을 쓴다
export const COURSE_TAGS = ['평지', '오르막', '강변', '신호 적음', '야간 밝음', '초보 추천'];
export const COURSE_TIMES = ['새벽', '아침', '오전', '오후', '저녁', '밤'];

// 고른 순서가 아니라 하루 순서대로 적는다. 예: "새벽 · 저녁"
export const joinTimes = (times: string[]) => (times.length ? COURSE_TIMES.filter((t) => times.includes(t)).join(' · ') : null);
// 저장된 추천 시간 글자에서 고른 칸을 되살린다 (코스 고치기)
export const splitTimes = (text: string | null) => (text ? COURSE_TIMES.filter((t) => text.split('·').some((x) => x.trim() === t)) : []);

export type CourseInfoValue = { name: string; description: string; tags: string[]; times: string[] };

// 코스 이름 · 설명 · 태그 · 추천 시간 입력. 코스 등록(CREG-001~002)과 코스 고치기(결정 로그 90항)가 같이 쓴다
export function CourseInfoFields({ value, onChange }: { value: CourseInfoValue; onChange: (next: CourseInfoValue) => void }) {
  const { colors } = useTheme();
  const trimmed = value.name.trim();
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <>
      <Field label="코스 이름" required counter={`${trimmed.length}/${COURSE_NAME_MAX}`} over={trimmed.length > COURSE_NAME_MAX}>
        <TextInput
          value={value.name}
          onChangeText={(name) => onChange({ ...value, name })}
          placeholder="예: 수성못 새벽 한 바퀴"
          placeholderTextColor={colors.text.secondary}
          accessibilityLabel="코스 이름"
          maxFontSizeMultiplier={1.4}
          style={[styles.input, { backgroundColor: colors.bg.surface, color: colors.text.primary }]}
        />
      </Field>
      <Field label="설명" hint="선택">
        <TextInput
          value={value.description}
          onChangeText={(description) => onChange({ ...value, description })}
          placeholder="어떤 길인지, 달릴 때 알아 두면 좋은 점"
          placeholderTextColor={colors.text.secondary}
          accessibilityLabel="코스 설명"
          maxLength={COURSE_DESCRIPTION_MAX}
          multiline
          maxFontSizeMultiplier={1.4}
          style={[styles.input, styles.multiline, { backgroundColor: colors.bg.surface, color: colors.text.primary }]}
        />
      </Field>
      <Field label="태그" hint="여러 개 고를 수 있어요">
        <View style={styles.chips}>
          {COURSE_TAGS.map((t) => (
            <FilterChip key={t} label={t} selected={value.tags.includes(t)} onPress={() => onChange({ ...value, tags: toggle(value.tags, t) })} />
          ))}
        </View>
      </Field>
      <Field label="추천 시간" hint="여러 개 고를 수 있어요">
        <View style={styles.chips}>
          {COURSE_TIMES.map((t) => (
            <FilterChip key={t} label={t} selected={value.times.includes(t)} onPress={() => onChange({ ...value, times: toggle(value.times, t) })} />
          ))}
        </View>
      </Field>
    </>
  );
}

function Field({ label, hint, required, counter, over, children }: { label: string; hint?: string; required?: boolean; counter?: string; over?: boolean; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <View style={styles.fieldHead}>
        <AppText role="label" style={styles.bold}>
          {label}
          {required ? <AppText role="label" style={{ color: colors.status.danger }}> *</AppText> : null}
        </AppText>
        {hint ? (
          <AppText role="caption" tone="secondary">
            {hint}
          </AppText>
        ) : counter ? (
          <AppText role="caption" tone={over ? 'danger' : 'secondary'} tabular>
            {counter}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  fieldHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  input: {
    minHeight: touchTarget.min + spacing.sm,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fontFamily.medium,
    fontSize: 16,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
});
