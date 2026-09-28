import { useLocalSearchParams } from 'expo-router';

import { parseRankingScenario } from '@/entities/ranking/api/mockRankingRepository';
import { CourseRankingScreen, type RankingTab } from '@/features/ranking/CourseRankingScreen';

const TABS: RankingTab[] = ['weekly', 'monthly', 'all', 'friends'];

export default function CourseRankingRoute() {
  const { id, tab, scenario } = useLocalSearchParams<{ id: string; tab?: string; scenario?: string }>();
  return <CourseRankingScreen courseId={id} initialTab={TABS.find((t) => t === tab) ?? 'weekly'} scenario={parseRankingScenario(scenario)} />;
}
