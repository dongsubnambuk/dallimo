import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { AbsoluteFill, Audio, staticFile } from 'remotion';

import { loadFonts } from './fonts';
import { Course, End, Explore, Hook, Ranking, Result, Run, Together } from './Scenes';
import { C } from './theme';
import timeline from './timeline.json';

loadFonts();

// 장면 길이 · 전환은 timeline.json 한 곳에서 정한다 (배경 음악 scripts/make-music.mjs도 같은 값으로 비트를 맞춘다)
// 120BPM에서 한 박 = 15프레임. 장면 길이와 전환을 박 단위로 맞춰 장면이 바뀌는 순간 킥이 들어간다
const COMPONENTS = [Hook, Explore, Course, Run, Result, Ranking, Together, End];
export const SCENES = COMPONENTS.map((Scene, i) => ({ C: Scene, d: timeline.scenes[i] }));
export const TRANSITION = timeline.transition;
export const DURATION = SCENES.reduce((a, s) => a + s.d, 0) - TRANSITION * (SCENES.length - 1);

export function Promo() {
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Audio src={staticFile('music.wav')} />
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
