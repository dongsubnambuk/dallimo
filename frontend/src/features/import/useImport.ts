import { useQuery } from '@tanstack/react-query';

import { importRepository } from '@/entities/import/api';
import { getHealthProvider } from '@/entities/import/provider';
import type { HealthRun, ImportCheck } from '@/entities/import/types';
import { usePreferences } from '@/shared/preferences';

// 122.3장 "새 러닝 기록 N개를 발견했어요": 최근 30일 건강 앱 달리기 중 아직 처리하지 않은 것
export const CANDIDATE_DAYS = 30;
export const CANDIDATE_LIMIT = 50;

export type Candidate = { run: HealthRun; check: ImportCheck | null };

export const importKeys = {
  candidates: ['import', 'candidates'] as const,
  integrations: ['import', 'integrations'] as const,
};

export function useHealthConnection() {
  const provider = getHealthProvider();
  const enabled = usePreferences().healthImport;
  const available = provider.available();
  return { provider, available, connected: available && enabled };
}

export function useImportCandidates() {
  const { provider, connected } = useHealthConnection();
  return useQuery({
    queryKey: importKeys.candidates,
    enabled: connected,
    retry: false,
    queryFn: async (): Promise<Candidate[]> => {
      const runs = await provider.listRuns(Date.now() - CANDIDATE_DAYS * 86_400_000, CANDIDATE_LIMIT);
      const checks = await importRepository.check(provider.source, runs.map((r) => r.id));
      const byId = new Map(checks.map((c) => [c.externalId, c]));
      return runs.map((run) => ({ run, check: byId.get(run.id) ?? null }));
    },
  });
}

/** 아직 가져오지 않은(처음 보거나 실패한) 기록 */
export function newCandidates(list: Candidate[] | undefined): Candidate[] {
  return (list ?? []).filter((c) => c.check == null || c.check.status === 'FAILED');
}

export function useIntegrations(enabled: boolean) {
  return useQuery({ queryKey: importKeys.integrations, queryFn: () => importRepository.integrations(), enabled, retry: false });
}
