import { DeviceFrame } from './DeviceFrame';
import type { ScreenKey } from '../content';

// 휴대폰 두 대를 겹쳐 놓는다. 크기는 부모 폭을 따라 줄어서 휴대폰 너비에서도 한 화면에 들어온다
export function PhonePair({ back, front, flip = false }: { back: ScreenKey; front: ScreenKey; flip?: boolean }) {
  return (
    <div className="relative mx-auto aspect-[1/1.08] w-full max-w-[460px]">
      <div className={`absolute top-[5%] w-[50%] ${flip ? 'right-[3%] rotate-[5deg]' : 'left-[3%] -rotate-[5deg]'}`}>
        <DeviceFrame screen={back} sizes="(min-width: 1024px) 230px, 46vw" />
      </div>
      <div className={`absolute top-0 w-[54%] ${flip ? 'left-[3%] -rotate-[2deg]' : 'right-[3%] rotate-[3deg]'}`}>
        <DeviceFrame screen={front} sizes="(min-width: 1024px) 250px, 50vw" />
      </div>
    </div>
  );
}
