import type { TransitionPresentation, TransitionPresentationComponentProps } from '@remotion/transitions';
import { AbsoluteFill } from 'remotion';

// 휙 넘기기: 두 장면이 위로 빠르게 지나가며 가운데에서 가장 흐려진다 (달리기 시작 느낌). CSS만 써서 렌더 환경을 타지 않는다
type WhipProps = { blur: number };

function Whip({ children, presentationProgress: p, presentationDirection }: TransitionPresentationComponentProps<WhipProps>) {
  // 빠르게 출발해 끝에서 멈추는 곡선
  const eased = 1 - Math.pow(1 - p, 3);
  const y = presentationDirection === 'exiting' ? -eased * 100 : (1 - eased) * 100;
  const blur = Math.sin(Math.PI * p) * 28;
  return <AbsoluteFill style={{ transform: `translateY(${y}%)`, filter: `blur(${blur.toFixed(1)}px)` }}>{children}</AbsoluteFill>;
}

export const whip = (): TransitionPresentation<WhipProps> => ({ component: Whip, props: { blur: 28 } });
