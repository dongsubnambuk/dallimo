import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { AbsoluteFill, Audio, interpolate, staticFile } from 'remotion';

import { loadFonts } from './fonts';
import { Course, End, Explore, Hook, Ranking, Result, Run, Together } from './Scenes';
import { C } from './theme';
import { CUT_FRAMES, DURATION, FPS, MUSIC, MUSIC_TRIM, SCENE_FRAMES, TRANSITION } from './timeline';

loadFonts();

// 장면 길이 · 전환은 timeline.ts에서 배경 음악의 마디에 맞춰 계산한다
const COMPONENTS = [Hook, Explore, Course, Run, Result, Ranking, Together, End];
export const SCENES = COMPONENTS.map((Scene, i) => ({ C: Scene, d: SCENE_FRAMES[i] }));
export { CUT_FRAMES, DURATION, TRANSITION };

export function Promo() {
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Audio
        src={staticFile(MUSIC.file)}
        trimBefore={MUSIC_TRIM}
        volume={(f) => interpolate(f, [DURATION - MUSIC.fadeOut * FPS, DURATION], [0.9, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
      />
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
