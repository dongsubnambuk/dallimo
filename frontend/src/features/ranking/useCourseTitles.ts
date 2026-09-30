import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getRankingRepository } from '@/entities/ranking/api';
import type { RankingScenario } from '@/entities/ranking/api/mockRankingRepository';
import type { CourseTitles } from '@/entities/ranking/types';
import type { CourseTitleKind } from '@/components/CourseTitleBadge';

// 124장 코스 크라운 · 로컬 레전드 (코스 상세 · 랭킹)
export function useCourseTitles(courseId: string, scenario: RankingScenario = 'normal') {
  const repo = useMemo(() => getRankingRepository(scenario), [scenario]);
  return useQuery({ queryKey: ['ranking', 'titles', courseId, scenario], queryFn: () => repo.getTitles(courseId), retry: false });
}

/** 랭킹 줄에 붙일 타이틀 (사용자 id → 크라운 · 레전드) */
export function titlesOf(titles: CourseTitles | undefined, userId: string): CourseTitleKind[] {
  if (!titles) return [];
  const out: CourseTitleKind[] = [];
  if (titles.crown.holder?.userId === userId) out.push('crown');
  if (titles.legend.holder?.userId === userId) out.push('legend');
  return out;
}
