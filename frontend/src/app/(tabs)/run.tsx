import { useLocalSearchParams } from 'expo-router';

import { PendingScreen } from '@/features/pending/PendingScreen';
import { formatDuration } from '@/shared/format';

const MODE_LABEL: Record<string, string> = { COURSE: '완주', PB: 'PB 어택', CHALLENGE: '라이벌', FREE: '자유 달리기' };

export default function RunTab() {
  const p = useLocalSearchParams<{ mode?: string; courseName?: string; targetSec?: string; targetLabel?: string }>();
  const handoff = p.mode
    ? [p.courseName, MODE_LABEL[p.mode] ?? p.mode, p.targetSec ? `목표 ${p.targetLabel ?? ''} ${formatDuration(Number(p.targetSec))}` : null].filter(Boolean).join(' · ')
    : null;
  return <PendingScreen title="달리기" order="Run Ready·Active Run 단계(72장 5~7번)" handoff={handoff} />;
}
