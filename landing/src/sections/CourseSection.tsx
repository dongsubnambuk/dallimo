import { BadgeCheck, MapPinned, Route } from 'lucide-react';

import { PhonePair } from '../components/PhonePair';
import { StorySection } from '../components/StorySection';

// ① 코스 · 인증 (앱 첫 실행 소개 1장과 같은 이야기, 결정 로그 84 · 88항)
export function CourseSection() {
  return (
    <StorySection
      id="course"
      step="01"
      eyebrow="코스 · 인증"
      tone="paper"
      title={
        <>
          달릴 코스가
          <br />
          이미 동네에 있어요
        </>
      }
      lead="지도에서 코스를 고르고 끝까지 달리면 공식 기록이 돼요. 같은 코스를 달린 러너와 그 기록으로 겨뤄요."
      points={[
        { icon: <MapPinned size={20} />, title: '내 주변 · 추천 코스', body: '평점 · 야간 조명 · 화장실까지 달리기 전에 확인해요.' },
        { icon: <BadgeCheck size={20} />, title: '끝까지 달린 기록만 인증', body: '경로를 따라 정상 속도로 달렸는지 확인해 순위에 올려요.' },
        { icon: <Route size={20} />, title: '내가 달린 길도 코스로', body: '자주 달리는 길을 코스로 올리면 다른 러너도 함께 겨뤄요.' },
      ]}
      visual={<PhonePair back="explore" front="result" />}
    />
  );
}
