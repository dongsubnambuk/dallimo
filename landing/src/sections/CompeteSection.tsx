import { Crown, Ghost, Trophy, Volume2 } from 'lucide-react';

import { PhonePair } from '../components/PhonePair';
import { StorySection } from '../components/StorySection';

// ② 경쟁 (앱 첫 실행 소개 2장)
export function CompeteSection() {
  return (
    <StorySection
      id="compete"
      step="02"
      eyebrow="겨루기"
      flip
      title={
        <>
          지난 나와 친구를
          <br />
          코스 위에서 이겨요
        </>
      }
      lead="달리는 동안 내 최고 기록 · 친구 기록과 실시간으로 비교하고, 끝나면 코스 순위가 바뀌어요."
      points={[
        { icon: <Ghost size={20} />, title: '고스트와 같이 달리기', body: '내 PB나 친구 기록이 지도 위에서 같이 달려요.' },
        { icon: <Volume2 size={20} />, title: '소리로 듣는 앞섬 · 뒤처짐', body: '구간 기록과 차이를 음성 · 진동으로 알려 줘요. 인터벌 훈련도 돼요.' },
        { icon: <Trophy size={20} />, title: '코스 · 주간 · 친구 랭킹', body: '코스 안 구간마다 기록도 따로 겨뤄요.' },
        { icon: <Crown size={20} />, title: '크라운 · 로컬 레전드', body: '가장 빠르면 크라운, 가장 자주 달리면 로컬 레전드.' },
      ]}
      visual={<PhonePair back="ranking" front="run" flip />}
    />
  );
}
