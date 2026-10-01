import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { AbsoluteFill } from 'remotion';

import { loadFonts } from './fonts';
import { Course, End, Explore, Hook, Ranking, Result, Run, Together } from './Scenes';
import { C } from './theme';

loadFonts();

// 장면 길이(프레임, 30fps). 전환 7번 × 10프레임이 겹쳐 합계 900프레임 = 30초
export const SCENES = [
  { C: Hook, d: 80 },
  { C: Explore, d: 125 },
  { C: Course, d: 125 },
  { C: Run, d: 140 },
  { C: Result, d: 125 },
  { C: Ranking, d: 110 },
  { C: Together, d: 130 },
  { C: End, d: 135 },
];
export const TRANSITION = 10;
export const DURATION = SCENES.reduce((a, s) => a + s.d, 0) - TRANSITION * (SCENES.length - 1);

export function Promo() {
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <TransitionSeries>
        {SCENES.flatMap(({ C: Scene, d }, i) => [
          <TransitionSeries.Sequence key={`s${i}`} durationInFrames={d}>
            <Scene />
          </TransitionSeries.Sequence>,
          ...(i < SCENES.length - 1
            ? [
                <TransitionSeries.Transition
                  key={`t${i}`}
                  presentation={i === SCENES.length - 2 ? fade() : slide({ direction: 'from-right' })}
                  timing={linearTiming({ durationInFrames: TRANSITION })}
                />,
              ]
            : []),
        ])}
      </TransitionSeries>
    </AbsoluteFill>
  );
}
