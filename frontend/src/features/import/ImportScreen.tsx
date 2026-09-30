import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { importRepository } from '@/entities/import/api';
import { healthPlatformNote } from '@/entities/import/provider';
import { SOURCE_LABEL, type HealthRun, type ImportResult } from '@/entities/import/types';
import { runResultRepository } from '@/entities/run/api';
import { RoutePreview } from '@/features/my/components/RoutePreview';
import { dayLabel, timeLabel } from '@/features/my/labels';
import { ApiRequestError } from '@/shared/api/http';
import { formatDistanceKm, formatDuration, formatPace } from '@/shared/format';
import { setPreference } from '@/shared/preferences';

import { importKeys, newCandidates, useHealthConnection, useImportCandidates, useIntegrations, type Candidate } from './useImport';

// 122.3장 외부 기록 가져오기: 연동 설정 → 가져오기 후보 → 가져오기 결과.
// 가져온 기록은 먼저 러닝 기록(Run)이 되고, 코스와 맞으면 서버 검증을 거쳐야 공식 기록이 된다 (FEATURE-FEEDBACK 1항)
type Outcome = { kind: 'working' } | { kind: 'done'; result: ImportResult } | { kind: 'error'; message: string };

const PREVIEW_POINTS = 120;

export function ImportScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { provider, available, connected } = useHealthConnection();
  const candidates = useImportCandidates();
  const integrations = useIntegrations(connected);
  const [denied, setDenied] = useState(false);
  const [connecting, setConnecting] = useState(false);
  // 고르지 않은 기록 id (처음엔 모두 고른 상태)
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [running, setRunning] = useState(false);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/settings'));
  const label = SOURCE_LABEL[provider.source];
  const fresh = newCandidates(candidates.data).filter((c) => outcomes[c.run.id]?.kind !== 'done');
  const handled = (candidates.data?.length ?? 0) - newCandidates(candidates.data).length;
  const picked = fresh.filter((c) => !skipped.has(c.run.id));
  const results = Object.entries(outcomes);

  const connect = async () => {
    setConnecting(true);
    setDenied(false);
    try {
      const ok = await provider.connect();
      if (ok) setPreference('healthImport', true);
      else setDenied(true);
    } catch {
      setDenied(true);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    setPreference('healthImport', false);
    setOutcomes({});
    setSkipped(new Set());
    qc.removeQueries({ queryKey: importKeys.candidates });
  };

  const importOne = async (run: HealthRun) => {
    setOutcomes((o) => ({ ...o, [run.id]: { kind: 'working' } }));
    try {
      const points = run.indoor ? [] : await provider.route(run.id);
      const result = await importRepository.importRun(run, points);
      setOutcomes((o) => ({ ...o, [run.id]: { kind: 'done', result } }));
    } catch (e) {
      const message = e instanceof ApiRequestError && e.code !== 'NETWORK' && e.status < 500 ? e.message : '연결을 확인하고 다시 시도해 주세요';
      setOutcomes((o) => ({ ...o, [run.id]: { kind: 'error', message } }));
    }
  };

  // 한 번에 하나씩 보낸다 (같은 시간대 기록끼리 겹침 판단이 순서대로 되도록)
  const importPicked = async () => {
    setRunning(true);
    for (const c of picked) await importOne(c.run);
    setRunning(false);
    qc.invalidateQueries({ queryKey: importKeys.candidates });
    qc.invalidateQueries({ queryKey: importKeys.integrations });
    qc.invalidateQueries({ queryKey: ['me'] });
    qc.invalidateQueries({ queryKey: ['run'] });
  };

  const retry = async (run: HealthRun) => {
    await importOne(run);
    qc.invalidateQueries({ queryKey: importKeys.integrations });
    qc.invalidateQueries({ queryKey: ['me'] });
    qc.invalidateQueries({ queryKey: ['run'] });
  };

  const toggle = (id: string) =>
    setSkipped((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const runById = new Map((candidates.data ?? []).map((c) => [c.run.id, c.run]));

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppPressable onPress={back} accessibilityLabel="뒤로" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </AppPressable>
        <AppText role="sectionTitle" accessibilityRole="header">
          외부 기록 가져오기
        </AppText>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]}>
        {/* 연동 설정 */}
        <View style={[styles.card, { backgroundColor: colors.bg.surface }]}>
          <View style={styles.row}>
            <AppIcon name="health" size={22} color={colors.status.danger} />
            <View style={styles.flex}>
              <AppText role="body" style={styles.bold}>
                {label}
              </AppText>
              <AppText role="caption" tone="secondary">
                {!available
                  ? (healthPlatformNote ?? '이 기기에서는 쓸 수 없어요')
                  : connected
                    ? integrationLine(integrations.data?.find((i) => i.source === provider.source))
                    : 'Apple Watch · 다른 앱으로 달린 기록을 달리모로 가져와요'}
              </AppText>
            </View>
            {available ? (
              connected ? (
                <SecondaryButton label="연결 해제" size="sm" onPress={disconnect} />
              ) : (
                <SecondaryButton label={connecting ? '연결 중' : '연결하기'} size="sm" emphasized disabled={connecting} onPress={connect} />
              )
            ) : null}
          </View>
          {available && !connected ? (
            <AppText role="caption" tone="secondary">
              달리기 운동 · 경로 · 거리만 읽어요. 건강 앱에 아무것도 쓰지 않아요.
            </AppText>
          ) : null}
        </View>

        {denied ? (
          <StateNotice
            icon="warning"
            tone="warning"
            title={`${label} 권한이 없어요`}
            body="건강 앱 → 공유 → 앱에서 달리모의 운동 · 경로 읽기를 켜 주세요."
            actions={<SecondaryButton label="다시 연결하기" size="sm" onPress={connect} />}
          />
        ) : null}

        {/* 가져오기 결과 */}
        {results.length > 0 ? (
          <View style={styles.section}>
            <AppText role="sectionTitle" accessibilityRole="header">
              가져온 결과
            </AppText>
            {results.map(([id, o]) => {
              const run = runById.get(id);
              return run ? <ResultRow key={id} run={run} outcome={o} onRetry={() => retry(run)} disabled={running} /> : null;
            })}
          </View>
        ) : null}

        {/* 가져오기 후보 */}
        {connected ? (
          candidates.isPending ? (
            <View style={styles.loader}>
              <BrandLoader size={40} label="건강 앱 기록 찾는 중" />
            </View>
          ) : candidates.isError ? (
            <StateNotice
              icon="warning"
              tone="warning"
              title="기록을 찾지 못했어요"
              body="연결을 확인하고 다시 시도해 주세요."
              actions={<SecondaryButton label="다시 시도" size="sm" onPress={() => candidates.refetch()} />}
            />
          ) : fresh.length === 0 ? (
            results.length === 0 ? (
              <StateNotice
                icon="imported"
                title="새 러닝 기록이 없어요"
                body={`최근 30일 동안 ${label}에 저장된 달리기 중 가져올 기록이 없어요.${handled ? ` 이미 가져온 기록 ${handled}개는 빼고 찾았어요.` : ''} 기록이 보이지 않으면 건강 앱 → 공유 → 앱에서 달리모 권한을 확인해 주세요.`}
              />
            ) : null
          ) : (
            <View style={styles.section}>
              <View style={styles.flex}>
                <AppText role="sectionTitle" accessibilityRole="header">
                  새 러닝 기록 {fresh.length}개를 발견했어요
                </AppText>
                <AppText role="caption" tone="secondary">
                  코스와 경로가 맞으면 서버 검증을 거쳐 코스 기록이 돼요. 달리모로 함께 기록한 운동은 빼고 보여줘요.
                </AppText>
              </View>
              <View>
                {fresh.map((c) => (
                  <CandidateRow key={c.run.id} candidate={c} checked={!skipped.has(c.run.id)} disabled={running} onToggle={() => toggle(c.run.id)} />
                ))}
              </View>
              <SecondaryButton
                label={running ? '가져오는 중' : picked.length ? `${picked.length}개 가져오기` : '가져올 기록을 골라 주세요'}
                emphasized
                disabled={running || picked.length === 0}
                onPress={importPicked}
              />
            </View>
          )
        ) : null}
      </ScrollView>
    </View>
  );
}

function integrationLine(i: { importedCount: number; lastImportedAt: number | null } | undefined): string {
  if (!i || i.importedCount === 0) return '연결됨 · 아직 가져온 기록이 없어요';
  const last = i.lastImportedAt ? ` · 마지막 ${dayLabel(new Date(i.lastImportedAt))}` : '';
  return `연결됨 · 가져온 기록 ${i.importedCount}개${last}`;
}

function runLine(run: HealthRun): string {
  const pace = run.distanceM && run.distanceM > 50 ? `${formatPace(Math.round(run.activeSec / (run.distanceM / 1000)))}/km` : null;
  return [run.distanceM != null ? `${formatDistanceKm(run.distanceM)}km` : null, formatDuration(run.activeSec), pace].filter(Boolean).join(' · ');
}

// 경로 미리보기는 줄마다 필요할 때 읽는다. 선만 그리므로 점을 줄인다
function useRoutePreview(run: HealthRun) {
  const { provider } = useHealthConnection();
  return useQuery({
    queryKey: ['import', 'route', run.id],
    enabled: !run.indoor,
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const points = await provider.route(run.id);
      const step = Math.max(1, Math.ceil(points.length / PREVIEW_POINTS));
      return points.filter((_, i) => i % step === 0 || i === points.length - 1).map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
    },
  });
}

function RunThumb({ run }: { run: HealthRun }) {
  const { colors } = useTheme();
  const route = useRoutePreview(run);
  if (run.indoor) {
    return (
      <View style={[styles.indoor, { backgroundColor: colors.mapBase.land }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <AppText role="caption" tone="secondary">
          실내
        </AppText>
      </View>
    );
  }
  return <RoutePreview points={route.data ?? []} course={false} />;
}

function CandidateRow({ candidate: c, checked, disabled, onToggle }: { candidate: Candidate; checked: boolean; disabled: boolean; onToggle: () => void }) {
  const { colors } = useTheme();
  const d = new Date(c.run.startedAt);
  const failed = c.check?.status === 'FAILED' ? c.check.failureReason : null;
  const device = c.run.deviceName ?? c.run.sourceName;
  const when = `${dayLabel(d)} ${timeLabel(d)}`;
  return (
    <AppPressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={[when, device, c.run.indoor ? '실내' : null, runLine(c.run), failed ? `지난번에 가져오지 못함, ${failed}` : null].filter(Boolean).join(', ')}
      style={styles.item}
    >
      <View style={[styles.box, { borderColor: checked ? colors.action.secondary : colors.border.strong, backgroundColor: checked ? colors.action.secondary : 'transparent' }]}>
        {checked ? <AppIcon name="check" size={14} color={colors.action.onSecondary} /> : null}
      </View>
      <RunThumb run={c.run} />
      <View style={styles.flex}>
        <AppText role="body" numberOfLines={1} style={styles.bold}>
          {when}
        </AppText>
        <View style={styles.meta}>
          <AppIcon name={device.toLowerCase().includes('watch') ? 'watch' : 'imported'} size={12} color={colors.text.secondary} />
          <AppText role="caption" tone="secondary" numberOfLines={1}>
            {device}
            {c.run.indoor ? ' · 실내' : ''}
          </AppText>
        </View>
        <AppText role="caption" tone="secondary" tabular>
          {runLine(c.run)}
        </AppText>
        {failed ? (
          <View style={styles.meta}>
            <AppIcon name="warning" size={12} color={colors.status.warning} />
            <AppText role="caption" tone="secondary">
              지난번에 가져오지 못했어요 · {failed}
            </AppText>
          </View>
        ) : null}
      </View>
    </AppPressable>
  );
}

// 가져온 기록이 코스와 맞았으면 검증이 끝날 때까지 기록을 다시 읽는다
function useVerification(result: ImportResult | null) {
  const runId = result?.runId ?? null;
  const q = useQuery({
    queryKey: ['run', 'result', runId],
    queryFn: () => runResultRepository.get(runId!),
    enabled: runId != null && result?.verification === 'pending',
    retry: false,
    refetchInterval: (query) => (query.state.data?.verification === 'pending' ? 2000 : false),
  });
  return { verification: q.data?.verification ?? result?.verification ?? null, pb: q.data?.pb?.improved === true };
}

function ResultRow({ run, outcome, onRetry, disabled }: { run: HealthRun; outcome: Outcome; onRetry: () => void; disabled: boolean }) {
  const { colors } = useTheme();
  const result = outcome.kind === 'done' ? outcome.result : null;
  const { verification, pb } = useVerification(result);
  const d = new Date(run.startedAt);
  const line = outcomeLine(outcome, verification, pb);
  const target = result?.status === 'IMPORTED' ? result.runId : result?.status === 'MERGE_CANDIDATE' ? result.mergedRunId : null;
  const icon = outcome.kind === 'working' ? 'pending' : line.tone === 'warning' ? 'warning' : line.tone === 'done' ? 'verified' : 'check';
  const iconColor = line.tone === 'warning' ? colors.status.warning : line.tone === 'done' ? colors.status.success : colors.text.secondary;

  return (
    <AppPressable
      onPress={target ? () => router.push({ pathname: '/my/runs/[id]', params: { id: target } }) : undefined}
      disabled={!target}
      accessibilityRole={target ? 'button' : undefined}
      accessibilityLabel={`${dayLabel(d)} ${timeLabel(d)}, ${line.text}`}
      style={styles.item}
    >
      <AppIcon name={icon} size={20} color={iconColor} />
      <View style={styles.flex}>
        <AppText role="body" numberOfLines={1} style={styles.bold}>
          {dayLabel(d)} {timeLabel(d)}
        </AppText>
        <AppText role="caption" tone="secondary" tabular>
          {runLine(run)}
        </AppText>
        <AppText role="caption" tone="secondary" accessibilityLiveRegion="polite">
          {line.text}
        </AppText>
      </View>
      {outcome.kind === 'error' ? <SecondaryButton label="다시 시도" size="sm" disabled={disabled} onPress={onRetry} /> : null}
      {target ? <AppIcon name="collapse" size={18} color={colors.text.secondary} /> : null}
    </AppPressable>
  );
}

function outcomeLine(o: Outcome, verification: string | null, pb: boolean): { text: string; tone: 'neutral' | 'warning' | 'done' } {
  if (o.kind === 'working') return { text: '가져오는 중', tone: 'neutral' };
  if (o.kind === 'error') return { text: `가져오지 못했어요 · ${o.message}`, tone: 'warning' };
  const r = o.result;
  if (r.status === 'MERGE_CANDIDATE') return { text: '이미 달리모로 기록한 러닝이에요 · 기존 기록을 그대로 둬요', tone: 'neutral' };
  if (r.status === 'FAILED') return { text: `가져오지 못했어요 · ${r.failureReason ?? '다시 시도해 주세요'}`, tone: 'warning' };
  if (!r.course) return { text: '러닝 기록으로 저장했어요', tone: 'neutral' };
  const match = `${r.course.name}과 ${Math.round(r.course.matchRate ?? 0)}% 일치`;
  if (verification === 'pending') return { text: `${match} · 인증 확인 중`, tone: 'neutral' };
  if (verification === 'verified') return { text: `${match} · 코스 기록 인증${pb ? ' · PB' : ''}`, tone: 'done' };
  if (verification === 'unverified' || verification === 'rejected') return { text: `${match} · 공식 기록으로 인증되지 않았어요`, tone: 'warning' };
  return { text: match, tone: 'neutral' };
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
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xl,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.card,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  loader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  item: {
    minHeight: touchTarget.min + spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indoor: {
    width: 52,
    height: 52,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  flex: {
    flex: 1,
    gap: 1,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
});
