import { EyeOff, Flag, HeartPulse, Lock, Watch } from 'lucide-react';

import { DeviceFrame } from '../components/DeviceFrame';
import { LockScreenMock } from '../components/LockScreenMock';
import { StorySection } from '../components/StorySection';
import { WatchMock } from '../components/WatchMock';

// ③ 함께 · 기기 (앱 첫 실행 소개 3장)
export function TogetherSection() {
  return (
    <StorySection
      id="together"
      step="03"
      eyebrow="함께 · 기기"
      tone="surface"
      title={
        <>
          친구와 같이 달리고
          <br />
          손목에서 바로 봐요
        </>
      }
      lead="장소가 달라도 같은 시간에 출발해요. 휴대폰을 꺼내지 않아도 손목과 잠금 화면에서 기록이 보여요."
      points={[
        { icon: <Flag size={20} />, title: '레이스 · 타임 어택 · 친구 도전', body: '방을 만들고 친구를 부르면 각자 있는 곳에서 동시에 출발해요.' },
        { icon: <EyeOff size={20} />, title: '위치는 숨기고 거리 · 순위만', body: '다른 참가자에게 지금 어디를 달리는지는 보내지 않아요.' },
        { icon: <Watch size={20} />, title: 'Apple Watch만 차고 달려도', body: '휴대폰을 두고 나가도 기록하고, 돌아오면 휴대폰으로 옮겨요.' },
        { icon: <Lock size={20} />, title: '잠금 화면 · 다이내믹 아일랜드', body: '거리 · 시간 · 순위를 실시간으로 보여 줘요.' },
        { icon: <HeartPulse size={20} />, title: '심박 센서 · Apple 건강', body: '심박 밴드를 연결하고, 다른 기기로 달린 기록도 가져와요.' },
      ]}
      visual={
        <div className="relative mx-auto grid w-full max-w-[480px] grid-cols-[1fr_1fr] items-center gap-4 sm:gap-6">
          <div className="-rotate-[3deg]">
            <DeviceFrame screen="live" sizes="(min-width: 1024px) 230px, 44vw" />
          </div>
          <div className="flex flex-col gap-6">
            <WatchMock className="mx-auto w-[82%]" />
            <LockScreenMock className="hidden sm:flex" />
          </div>
          <LockScreenMock className="col-span-2 sm:hidden" />
        </div>
      }
    />
  );
}
