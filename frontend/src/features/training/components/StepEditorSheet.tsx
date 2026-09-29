import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterChip } from '@/components/FilterChip';
import { SecondaryButton } from '@/components/SecondaryButton';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { elevation, fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { formatStepDistance, formatStepTime, STEP_LABEL } from '@/entities/workout/labels';
import type { EndConditionType, StepType } from '@/entities/workout/types';
import { parseClock, stepProblem } from '@/entities/workout/validate';
import { formatDuration } from '@/shared/format';

import type { EditStep } from '../builderModel';

// 123.2장 WorkoutStepEditor: 구간 종류 · 끝나는 조건(거리 · 시간 · 직접 넘기기) · 목표(시간 · 페이스).
// 자주 쓰는 값은 칩으로 한 번에, 다른 값은 직접 입력한다.
const TYPES: StepType[] = ['WARMUP', 'WORK', 'RECOVERY', 'COOLDOWN'];
const ENDS: { key: EndConditionType; label: string }[] = [
  { key: 'DISTANCE', label: '거리' },
  { key: 'TIME', label: '시간' },
  { key: 'MANUAL', label: '직접 넘기기' },
];
const DISTANCES = [200, 400, 800, 1000, 2000];
const TIMES = [30, 60, 120, 180, 300];

// 목표 고르기: 목표 시간(정확히) · 최대 시간 · 목표 페이스. 시간 목표는 거리 구간에서만
type TargetKind = 'NONE' | 'TIME' | 'MAX_TIME' | 'PACE';
const TARGETS: { key: TargetKind; label: string }[] = [
  { key: 'NONE', label: '없음' },
  { key: 'TIME', label: '목표 시간' },
  { key: 'MAX_TIME', label: '최대 시간' },
  { key: 'PACE', label: '목표 페이스' },
];

function targetKindOf(s: EditStep): TargetKind {
  if (s.targetType === 'TARGET_PACE') return 'PACE';
  if (s.targetType === 'TARGET_TIME') return s.targetMin == null ? 'MAX_TIME' : 'TIME';
  return 'NONE';
}

function targetValueOf(s: EditStep): number | null {
  return s.targetMax ?? s.targetMin;
}

type Props = {
  step: EditStep;
  // 지우면 인터벌에 구간이 하나도 남지 않으면 지울 수 없다
  canRemove: boolean;
  onDone: (step: EditStep) => void;
  onRemove: () => void;
  onClose: () => void;
};

export function StepEditorSheet({ step, canRemove, onDone, onRemove, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<EditStep>(step);
  const [endText, setEndText] = useState(() => endTextOf(step));
  const [targetText, setTargetText] = useState(() => (targetValueOf(step) != null ? formatDuration(targetValueOf(step)) : ''));
  const kind = targetKindOf(draft);

  const setEnd = (type: EndConditionType, value: number | null) => {
    const next: EditStep = { ...draft, endConditionType: type, endConditionValue: value };
    // 시간 목표는 거리 구간에서만 (시간 · 직접 넘기기 구간이 되면 목표를 없앤다)
    if (type !== 'DISTANCE' && next.targetType === 'TARGET_TIME') Object.assign(next, { targetType: null, targetMin: null, targetMax: null });
    setDraft(next);
    setEndText(endTextOf(next));
  };

  const setTarget = (k: TargetKind, value: number | null) => {
    const v = value ?? null;
    if (k === 'NONE') setDraft({ ...draft, targetType: null, targetMin: null, targetMax: null });
    else if (k === 'TIME') setDraft({ ...draft, targetType: 'TARGET_TIME', targetMin: v, targetMax: v });
    else if (k === 'MAX_TIME') setDraft({ ...draft, targetType: 'TARGET_TIME', targetMin: null, targetMax: v });
    else setDraft({ ...draft, targetType: 'TARGET_PACE', targetMin: v, targetMax: v });
  };

  const endParsed = draft.endConditionType === 'DISTANCE' ? parseMeters(endText) : draft.endConditionType === 'TIME' ? parseClock(endText) : null;
  const targetParsed = kind === 'NONE' ? null : parseClock(targetText);
  const inputProblem =
    draft.endConditionType !== 'MANUAL' && endParsed == null
      ? draft.endConditionType === 'DISTANCE'
        ? '거리를 m 단위 숫자로 적어 주세요 (예: 400)'
        : '시간을 분:초로 적어 주세요 (예: 1:30)'
      : kind !== 'NONE' && targetParsed == null
        ? '목표를 분:초로 적어 주세요 (예: 1:30)'
        : null;
  const problem = inputProblem ?? stepProblem(draft);
  const targets = TARGETS.filter((t) => draft.endConditionType === 'DISTANCE' || (t.key !== 'TIME' && t.key !== 'MAX_TIME'));

  return (
    <View style={styles.wrap}>
      <AppPressable onPress={onClose} feedback="none" accessibilityLabel="닫기" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg.canvas + 'B3' }]} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.avoid} pointerEvents="box-none">
        <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.bg.elevated, paddingBottom: insets.bottom + spacing.lg, boxShadow: elevation.sheet }]}>
          <View style={styles.head}>
            <AppText role="sectionTitle" accessibilityRole="header" style={styles.flex}>
              구간 고치기
            </AppText>
            <AppPressable onPress={onClose} accessibilityLabel="닫기" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
              <AppIcon name="close" size={18} color={colors.text.primary} />
            </AppPressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Field label="종류">
              <View style={styles.chips}>
                {TYPES.map((t) => (
                  <FilterChip key={t} label={STEP_LABEL[t]} selected={draft.stepType === t} onPress={() => setDraft({ ...draft, stepType: t })} />
                ))}
              </View>
            </Field>

            <Field label="끝나는 조건">
              <View style={styles.chips}>
                {ENDS.map((e) => (
                  <FilterChip
                    key={e.key}
                    label={e.label}
                    selected={draft.endConditionType === e.key}
                    onPress={() => setEnd(e.key, e.key === 'DISTANCE' ? 400 : e.key === 'TIME' ? 60 : null)}
                  />
                ))}
              </View>
              {draft.endConditionType === 'MANUAL' ? (
                <AppText role="caption" tone="secondary">
                  달리는 중 &quot;다음 구간&quot; 버튼을 누르면 넘어가요. 신호등 · 물 마시기처럼 끝을 정하기 어려울 때 써요.
                </AppText>
              ) : (
                <>
                  <View style={styles.chips}>
                    {(draft.endConditionType === 'DISTANCE' ? DISTANCES : TIMES).map((v) => (
                      <FilterChip
                        key={v}
                        label={draft.endConditionType === 'DISTANCE' ? formatStepDistance(v) : formatStepTime(v)}
                        selected={draft.endConditionValue === v}
                        onPress={() => setEnd(draft.endConditionType, v)}
                      />
                    ))}
                  </View>
                  <View style={styles.inputRow}>
                    <TextInput
                      value={endText}
                      onChangeText={(t) => {
                        setEndText(t);
                        const v = draft.endConditionType === 'DISTANCE' ? parseMeters(t) : parseClock(t);
                        setDraft({ ...draft, endConditionValue: v });
                      }}
                      keyboardType={draft.endConditionType === 'DISTANCE' ? 'number-pad' : 'numbers-and-punctuation'}
                      placeholder={draft.endConditionType === 'DISTANCE' ? '400' : '1:30'}
                      placeholderTextColor={colors.text.secondary}
                      accessibilityLabel={draft.endConditionType === 'DISTANCE' ? '거리, 미터' : '시간, 분:초'}
                      maxFontSizeMultiplier={1.4}
                      style={[styles.input, { backgroundColor: colors.bg.surface, color: colors.text.primary }]}
                    />
                    <AppText role="label" tone="secondary" numberOfLines={1} style={styles.unit}>
                      {draft.endConditionType === 'DISTANCE' ? 'm' : '분:초'}
                    </AppText>
                  </View>
                </>
              )}
            </Field>

            <Field label="목표" hint="선택">
              <View style={styles.chips}>
                {targets.map((t) => (
                  <FilterChip
                    key={t.key}
                    label={t.label}
                    selected={kind === t.key}
                    onPress={() => {
                      // 페이스 ↔ 시간을 바꾸면 값 단위가 달라 기본값으로 다시 시작한다
                      const same = (kind === 'PACE') === (t.key === 'PACE') && kind !== 'NONE';
                      const v = same && targetParsed != null ? targetParsed : defaultTarget(t.key, draft);
                      setTarget(t.key, v);
                      setTargetText(v != null ? formatDuration(v) : '');
                    }}
                  />
                ))}
              </View>
              {kind !== 'NONE' ? (
                <>
                  <View style={styles.inputRow}>
                    <TextInput
                      value={targetText}
                      onChangeText={(t) => {
                        setTargetText(t);
                        setTarget(kind, parseClock(t));
                      }}
                      keyboardType="numbers-and-punctuation"
                      placeholder={kind === 'PACE' ? '5:00' : '1:30'}
                      placeholderTextColor={colors.text.secondary}
                      accessibilityLabel={kind === 'PACE' ? '목표 페이스, 1킬로미터당 분:초' : '목표 시간, 분:초'}
                      maxFontSizeMultiplier={1.4}
                      style={[styles.input, { backgroundColor: colors.bg.surface, color: colors.text.primary }]}
                    />
                    <AppText role="label" tone="secondary" numberOfLines={1} style={styles.unit}>
                      {kind === 'PACE' ? '분:초 / km' : '분:초'}
                    </AppText>
                  </View>
                  <AppText role="caption" tone="secondary">
                    {kind === 'TIME'
                      ? '이 구간을 이 시간에 맞춰 달려요. 달리는 동안 목표보다 빠른지 느린지 알려 줘요.'
                      : kind === 'MAX_TIME'
                        ? '이 시간 안에만 들어오면 돼요. 천천히 구간에 좋아요.'
                        : '1km를 이 페이스로 달려요.'}
                  </AppText>
                </>
              ) : null}
            </Field>

            {problem ? (
              <View style={styles.problem} accessibilityLiveRegion="polite">
                <AppIcon name="warning" size={16} color={colors.status.warning} />
                <AppText role="label" style={styles.flex}>
                  {problem}
                </AppText>
              </View>
            ) : null}
          </ScrollView>
          <View style={styles.actions}>
            {canRemove ? <SecondaryButton label="이 구간 지우기" onPress={onRemove} style={styles.flex} /> : null}
            <SecondaryButton label="완료" emphasized disabled={problem != null} onPress={() => onDone(draft)} style={styles.flex} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <AppText role="label" style={styles.fieldLabel}>
        {label}
        {hint ? (
          <AppText role="caption" tone="secondary">
            {'  '}
            {hint}
          </AppText>
        ) : null}
      </AppText>
      {children}
    </View>
  );
}

function endTextOf(s: EditStep): string {
  if (s.endConditionValue == null) return '';
  return s.endConditionType === 'TIME' ? formatDuration(s.endConditionValue) : String(s.endConditionValue);
}

function parseMeters(t: string): number | null {
  const v = t.trim();
  return /^\d{1,6}$/.test(v) ? Number(v) : null;
}

// 목표를 처음 고를 때 넣는 값: 빠르게 400m면 1:30, 페이스는 5:00
function defaultTarget(k: TargetKind, s: EditStep): number | null {
  if (k === 'PACE') return 300;
  if (k === 'NONE') return null;
  const m = s.endConditionType === 'DISTANCE' ? (s.endConditionValue ?? 400) : 400;
  return Math.round((m / 1000) * (k === 'MAX_TIME' ? 450 : 225));
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  avoid: {
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: spacing.lg,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  round: {
    width: touchTarget.min - 4,
    height: touchTarget.min - 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  field: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontFamily: fontFamily.bold,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: touchTarget.min + spacing.sm,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    fontFamily: fontFamily.medium,
    fontSize: 16,
  },
  unit: {
    flexShrink: 0,
  },
  problem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
