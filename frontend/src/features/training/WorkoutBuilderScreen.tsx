import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { elevation, fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import type { WorkoutScenario } from '@/entities/workout/api/mockWorkoutRepository';
import { STEP_LABEL, stepLabel, summarizeBlocks, totalLabel } from '@/entities/workout/labels';
import { RECOMMENDED_WORKOUTS, starterBlocks } from '@/entities/workout/templates';
import type { StepType, Workout } from '@/entities/workout/types';
import { blocksProblem, WORKOUT_LIMITS } from '@/entities/workout/validate';
import { ApiRequestError } from '@/shared/api/http';

import {
  addRepeat,
  addStep,
  addStepToRepeat,
  autoName,
  fromBlocks,
  moveBlock,
  moveStep,
  removeBlock,
  removeStep,
  setRepeatCount,
  toBlocks,
  updateStep,
  type EditBlock,
  type EditStep,
} from './builderModel';
import { StepEditorSheet } from './components/StepEditorSheet';
import { useWorkout, useWorkoutRepository, workoutKeys } from './useWorkouts';

// 123.2장 WorkoutBuilder: 구간(Step) 추가 · 지우기 · 순서 바꾸기, 반복 묶음(Repeat Group)과 반복 횟수.
// 129장 완료 기준 "400m WORK + 200m RECOVERY × N을 1분 안에 만들고 저장": 새로 만들면 그 구성으로 시작해 횟수만 바꾸고 저장하면 된다.
// 순서는 끌어서 옮기는 대신 ↑ ↓ 버튼으로 바꾼다 (스크린 리더 · 한 손 조작에서도 되도록, FOUNDATION-DECISION-LOG 45항).
type Props = { id: string | null; template: string | null; scenario: WorkoutScenario };

export function WorkoutBuilderScreen({ id, template, scenario }: Props) {
  const existing = useWorkout(scenario, id);
  if (id != null && existing.isPending) {
    return (
      <Frame title="인터벌 고치기" onBack={() => router.back()}>
        <View style={styles.center}>
          <BrandLoader size={48} label="인터벌 불러오는 중" />
        </View>
      </Frame>
    );
  }
  if (id != null && existing.isError) {
    return (
      <Frame title="인터벌 고치기" onBack={() => router.back()}>
        <View style={styles.pad}>
          <StateNotice
            icon="warning"
            tone="warning"
            title="인터벌을 불러오지 못했어요"
            body="지워졌거나 연결이 끊겼어요. 다시 시도해 주세요."
            actions={<SecondaryButton label="다시 시도" size="sm" onPress={() => existing.refetch()} />}
          />
        </View>
      </Frame>
    );
  }
  return <Builder workout={existing.data ?? null} template={template} scenario={scenario} />;
}

function Builder({ workout, template, scenario }: { workout: Workout | null; template: string | null; scenario: WorkoutScenario }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const repo = useWorkoutRepository(scenario);
  const base = workout ?? RECOMMENDED_WORKOUTS.find((t) => t.key === template) ?? null;
  const [name, setName] = useState(workout?.name ?? base?.name ?? '');
  const [blocks, setBlocks] = useState<EditBlock[]>(() => fromBlocks(base?.blocks ?? starterBlocks()));
  const [editing, setEditing] = useState<EditStep | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'leave' | 'delete' | null>(null);
  const [dirty, setDirty] = useState(false);

  const plain = useMemo(() => toBlocks(blocks), [blocks]);
  const problem = blocksProblem(plain);
  const fallbackName = autoName(plain);
  const trimmed = name.trim();
  const nameProblem = trimmed.length > WORKOUT_LIMITS.nameMax ? `이름은 ${WORKOUT_LIMITS.nameMax}자까지 쓸 수 있어요` : null;
  const stepCount = blocks.reduce((a, b) => a + b.steps.length, 0);

  const change = (next: EditBlock[]) => {
    setBlocks(next);
    setDirty(true);
    setError(null);
  };

  const done = async () => {
    await queryClient.invalidateQueries({ queryKey: workoutKeys.all });
    router.back();
  };

  const save = async () => {
    if (problem || nameProblem || saving) return;
    setSaving(true);
    try {
      const draft = { name: trimmed || fallbackName, description: workout?.description ?? null, blocks: plain };
      if (workout) await repo.update(workout.id, draft);
      else await repo.create(draft);
      await done();
    } catch (e) {
      setError(e instanceof ApiRequestError && e.code !== 'NETWORK' && e.code !== 'INTERNAL_ERROR' ? e.message : '저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const act = async (fn: () => Promise<unknown>) => {
    setSaving(true);
    try {
      await fn();
      await done();
    } catch {
      setError('처리하지 못했어요. 연결을 확인하고 다시 시도해 주세요.');
      setConfirm(null);
    } finally {
      setSaving(false);
    }
  };

  const back = () => (dirty ? setConfirm('leave') : router.back());

  return (
    <Frame
      title={workout ? '인터벌 고치기' : '인터벌 만들기'}
      onBack={back}
      right={
        <AppPressable
          onPress={save}
          disabled={problem != null || nameProblem != null || saving}
          accessibilityRole="button"
          accessibilityLabel="저장"
          accessibilityState={{ disabled: problem != null || nameProblem != null || saving, busy: saving }}
          style={[styles.save, { backgroundColor: problem || nameProblem ? colors.border.subtle : colors.action.primary }]}
        >
          <AppText role="label" style={[styles.bold, { color: problem || nameProblem ? colors.text.secondary : colors.action.onPrimary }]}>
            {saving ? '저장 중' : '저장'}
          </AppText>
        </AppPressable>
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <AppText role="label" style={styles.bold}>
              이름{' '}
              <AppText role="caption" tone="secondary">
                비우면 &quot;{fallbackName}&quot;
              </AppText>
            </AppText>
            <TextInput
              value={name}
              onChangeText={(t) => {
                setName(t);
                setDirty(true);
                setError(null);
              }}
              placeholder={fallbackName}
              placeholderTextColor={colors.text.secondary}
              accessibilityLabel="인터벌 이름"
              maxFontSizeMultiplier={1.4}
              style={[styles.input, { backgroundColor: colors.bg.surface, color: colors.text.primary }]}
            />
            {nameProblem ? (
              <AppText role="caption" style={{ color: colors.status.warning }}>
                {nameProblem}
              </AppText>
            ) : null}
          </View>

          <View style={[styles.summary, { backgroundColor: colors.action.tint }]} accessible accessibilityLabel={`구성 ${summarizeBlocks(plain)}, ${totalLabel(plain)}`}>
            <AppText role="label" style={styles.bold} numberOfLines={3}>
              {summarizeBlocks(plain) || '구간이 없어요'}
            </AppText>
            <AppText role="caption" tone="secondary" tabular>
              {totalLabel(plain)}
            </AppText>
          </View>

          <View style={styles.blocks}>
            {blocks.map((b, i) =>
              b.type === 'REPEAT' ? (
                <RepeatBlock
                  key={b.key}
                  block={b}
                  first={i === 0}
                  last={i === blocks.length - 1}
                  onMove={(dir) => change(moveBlock(blocks, b.key, dir))}
                  onCount={(n) => change(setRepeatCount(blocks, b.key, n))}
                  onRemove={() => change(removeBlock(blocks, b.key))}
                  onAdd={() => change(addStepToRepeat(blocks, b.key))}
                  onMoveStep={(stepKey, dir) => change(moveStep(blocks, b.key, stepKey, dir))}
                  onEdit={setEditing}
                />
              ) : (
                <StepRow
                  key={b.key}
                  step={b.steps[0]}
                  first={i === 0}
                  last={i === blocks.length - 1}
                  onMove={(dir) => change(moveBlock(blocks, b.key, dir))}
                  onEdit={setEditing}
                />
              ),
            )}
          </View>

          <View style={styles.addRow}>
            <AddButton label="구간 추가" disabled={blocks.length >= WORKOUT_LIMITS.maxBlocks} onPress={() => change(addStep(blocks))} />
            <AddButton label="반복 묶음 추가" disabled={blocks.length >= WORKOUT_LIMITS.maxBlocks} onPress={() => change(addRepeat(blocks))} />
          </View>

          {problem || error ? (
            <View style={styles.problem} accessibilityLiveRegion="polite">
              <AppIcon name="warning" size={16} color={colors.status.warning} />
              <AppText role="label" style={styles.flex}>
                {error ?? problem}
              </AppText>
            </View>
          ) : null}

          {workout ? (
            <View style={styles.manage}>
              <SecondaryButton label="복제해서 새로 만들기" disabled={saving} onPress={() => act(() => repo.duplicate(workout.id))} />
              <SecondaryButton label="이 인터벌 지우기" disabled={saving} onPress={() => setConfirm('delete')} />
              <AppText role="caption" tone="secondary">
                고쳐도 지난 달리기 기록은 그때 구성 그대로 남아요.
              </AppText>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {editing ? (
        <StepEditorSheet
          step={editing}
          canRemove={stepCount > 1}
          onClose={() => setEditing(null)}
          onDone={(s) => {
            change(updateStep(blocks, s));
            setEditing(null);
          }}
          onRemove={() => {
            change(removeStep(blocks, editing.key));
            setEditing(null);
          }}
        />
      ) : null}

      {confirm ? (
        <ConfirmSheet
          title={confirm === 'leave' ? '저장하지 않고 나갈까요?' : '이 인터벌을 지울까요?'}
          body={confirm === 'leave' ? '고친 내용이 사라져요.' : '지난 달리기 기록은 남아요.'}
          stay={confirm === 'leave' ? '계속 고치기' : '취소'}
          go={confirm === 'leave' ? '나가기' : '지우기'}
          onStay={() => setConfirm(null)}
          onGo={() => (confirm === 'leave' ? router.back() : act(() => repo.remove(workout!.id)))}
        />
      ) : null}
    </Frame>
  );
}

// ---- 조각 ----

function Frame({ title, onBack, right, children }: { title: string; onBack: () => void; right?: React.ReactNode; children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppPressable onPress={onBack} accessibilityLabel="뒤로" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </AppPressable>
        <AppText role="sectionTitle" accessibilityRole="header" style={styles.flex}>
          {title}
        </AppText>
        {right}
      </View>
      {children}
    </View>
  );
}

// 구간 종류 표시: 빠르게는 민트 채움, 천천히는 회색 선, 몸풀기 · 마무리는 옅은 칸. 글자로도 적는다 (색만으로 구분하지 않음)
function TypeMark({ type }: { type: StepType }) {
  const { colors } = useTheme();
  const bg = type === 'WORK' ? colors.action.primary : type === 'RECOVERY' ? colors.text.secondary : colors.border.subtle;
  return <View style={[styles.mark, { backgroundColor: bg }]} />;
}

function StepRow({
  step,
  first,
  last,
  inRepeat,
  onMove,
  onEdit,
}: {
  step: EditStep;
  first: boolean;
  last: boolean;
  inRepeat?: boolean;
  onMove: (dir: -1 | 1) => void;
  onEdit: (s: EditStep) => void;
}) {
  const { colors } = useTheme();
  const label = stepLabel(step);
  return (
    <View style={[styles.stepRow, !inRepeat && { backgroundColor: colors.bg.surface }]}>
      <AppPressable onPress={() => onEdit(step)} accessibilityRole="button" accessibilityLabel={label} accessibilityHint="구간을 고쳐요" style={styles.stepMain}>
        <TypeMark type={step.stepType} />
        <AppText role="body" style={styles.flex} numberOfLines={2}>
          <AppText role="body" style={styles.bold}>
            {STEP_LABEL[step.stepType]}
          </AppText>
          {label.slice(STEP_LABEL[step.stepType].length)}
        </AppText>
        <AppIcon name="edit" size={16} color={colors.text.secondary} />
      </AppPressable>
      <MoveButtons label={label} first={first} last={last} onMove={onMove} />
    </View>
  );
}

function MoveButtons({ label, first, last, onMove }: { label: string; first: boolean; last: boolean; onMove: (dir: -1 | 1) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.moves}>
      <AppPressable onPress={() => onMove(-1)} disabled={first} accessibilityLabel={`${label} 위로`} style={styles.move}>
        <AppIcon name="moveUp" size={20} color={first ? colors.border.subtle : colors.text.primary} />
      </AppPressable>
      <AppPressable onPress={() => onMove(1)} disabled={last} accessibilityLabel={`${label} 아래로`} style={styles.move}>
        <AppIcon name="moveDown" size={20} color={last ? colors.border.subtle : colors.text.primary} />
      </AppPressable>
    </View>
  );
}

// 123.2장 RepeatBlock: 묶은 구간과 반복 횟수
function RepeatBlock({
  block,
  first,
  last,
  onMove,
  onCount,
  onRemove,
  onAdd,
  onMoveStep,
  onEdit,
}: {
  block: EditBlock;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  onCount: (n: number) => void;
  onRemove: () => void;
  onAdd: () => void;
  onMoveStep: (stepKey: string, dir: -1 | 1) => void;
  onEdit: (s: EditStep) => void;
}) {
  const { colors } = useTheme();
  const n = block.repeatCount;
  const title = `반복 ${n}회`;
  return (
    <View style={[styles.repeat, { backgroundColor: colors.bg.surface, borderColor: colors.border.subtle }]}>
      <View style={styles.repeatHead}>
        <AppIcon name="modeInterval" size={18} color={colors.text.accent} />
        <AppText role="body" style={[styles.bold, styles.flex]}>
          반복
        </AppText>
        <View style={styles.stepper} accessible accessibilityRole="adjustable" accessibilityLabel={title}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => onCount(e.nativeEvent.actionName === 'increment' ? n + 1 : n - 1)}
        >
          <AppPressable onPress={() => onCount(n - 1)} disabled={n <= WORKOUT_LIMITS.minRepeat} accessibilityLabel="반복 줄이기" style={[styles.stepBtn, { backgroundColor: colors.bg.canvas }]}>
            <AppText role="sectionTitle" tone={n <= WORKOUT_LIMITS.minRepeat ? 'secondary' : 'primary'}>
              −
            </AppText>
          </AppPressable>
          <AppText role="sectionTitle" tabular style={styles.count}>
            {n}회
          </AppText>
          <AppPressable onPress={() => onCount(n + 1)} disabled={n >= WORKOUT_LIMITS.maxRepeat} accessibilityLabel="반복 늘리기" style={[styles.stepBtn, { backgroundColor: colors.bg.canvas }]}>
            <AppText role="sectionTitle" tone={n >= WORKOUT_LIMITS.maxRepeat ? 'secondary' : 'primary'}>
              +
            </AppText>
          </AppPressable>
        </View>
      </View>
      <View style={[styles.repeatSteps, { borderLeftColor: colors.action.primary }]}>
        {block.steps.map((s, i) => (
          <StepRow key={s.key} step={s} inRepeat first={i === 0} last={i === block.steps.length - 1} onMove={(dir) => onMoveStep(s.key, dir)} onEdit={onEdit} />
        ))}
      </View>
      <View style={styles.repeatFoot}>
        <AppPressable onPress={onAdd} disabled={block.steps.length >= WORKOUT_LIMITS.maxStepsInRepeat} accessibilityRole="button" accessibilityLabel="반복 안에 구간 추가" style={styles.footBtn}>
          <AppIcon name="add" size={16} color={colors.text.secondary} />
          <AppText role="label" tone="secondary">
            구간 추가
          </AppText>
        </AppPressable>
        <AppPressable onPress={onRemove} accessibilityRole="button" accessibilityLabel="반복 묶음 지우기" style={styles.footBtn}>
          <AppIcon name="remove" size={16} color={colors.text.secondary} />
          <AppText role="label" tone="secondary">
            묶음 지우기
          </AppText>
        </AppPressable>
        <MoveButtons label="반복 묶음" first={first} last={last} onMove={onMove} />
      </View>
    </View>
  );
}

function AddButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <AppPressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={[styles.add, { borderColor: colors.border.subtle }]}>
      <AppIcon name="add" size={18} color={disabled ? colors.text.secondary : colors.text.primary} />
      <AppText role="label" style={styles.bold} tone={disabled ? 'secondary' : 'primary'}>
        {label}
      </AppText>
    </AppPressable>
  );
}

function ConfirmSheet({ title, body, stay, go, onStay, onGo }: { title: string; body: string; stay: string; go: string; onStay: () => void; onGo: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.scrim}>
      <AppPressable onPress={onStay} feedback="none" accessibilityLabel={stay} style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg.canvas + 'B3' }]} />
      <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.bg.elevated, paddingBottom: insets.bottom + spacing.lg, boxShadow: elevation.sheet }]}>
        <AppText role="sectionTitle" accessibilityRole="header">
          {title}
        </AppText>
        <AppText role="body" tone="secondary">
          {body}
        </AppText>
        <View style={styles.addRow}>
          <SecondaryButton label={stay} onPress={onStay} style={styles.flex} />
          <SecondaryButton label={go} emphasized onPress={onGo} style={styles.flex} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    minHeight: touchTarget.min + spacing.sm,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  round: {
    width: touchTarget.min - 4,
    height: touchTarget.min - 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  save: {
    minHeight: touchTarget.min - 4,
    minWidth: 64,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pad: {
    padding: spacing.lg,
  },
  flex: {
    flex: 1,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  input: {
    minHeight: touchTarget.min + spacing.sm,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    fontFamily: fontFamily.medium,
    fontSize: 16,
  },
  summary: {
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  blocks: {
    gap: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.control,
    paddingLeft: spacing.sm,
  },
  stepMain: {
    flex: 1,
    minHeight: touchTarget.min + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingRight: spacing.xs,
  },
  mark: {
    width: 6,
    alignSelf: 'stretch',
    minHeight: 28,
    borderRadius: radius.pill,
  },
  moves: {
    flexDirection: 'row',
  },
  move: {
    width: touchTarget.min,
    height: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeat: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  repeatHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    minWidth: 48,
    textAlign: 'center',
  },
  repeatSteps: {
    borderLeftWidth: 3,
    marginLeft: spacing.sm,
    paddingLeft: spacing.xs,
  },
  repeatFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footBtn: {
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    flexShrink: 1,
  },
  addRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  add: {
    flex: 1,
    minHeight: touchTarget.min + spacing.sm,
    borderRadius: radius.control,
    borderWidth: 1,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  problem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  manage: {
    gap: spacing.sm,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
