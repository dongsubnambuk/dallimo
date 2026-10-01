import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { AbsoluteFill, Audio, interpolate, staticFile } from 'remotion';

import { loadFonts } from './fonts';
import { Course, End, Explore, Hook, Ranking, Result, Run, Together } from './Scenes';
import { C } from './theme';
import { DURATION, FPS, timeline, TRANSITION, type TrackId } from './timeline';

loadFonts();

// 장면 길이 · 전환은 timeline.ts에서 배경 음악의 마디에 맞춰 계산한다
const SCENES = [Hook, Explore, Course, Run, Result, Ranking, Together];

export function Promo({ track: id }: { track: TrackId }) {
  const { track, trim, sceneFrames, endAccent } = timeline(id);
  const scenes = [...SCENES.map((Scene) => <Scene />), <End accent={endAccent} credit={track.credit} />];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Audio
        src={staticFile(track.file)}
        trimBefore={trim}
        volume={(f) => interpolate(f, [DURATION - track.fadeOut * FPS, DURATION], [0.9, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
      />
      <TransitionSeries>
        {scenes.flatMap((scene, i) => [
          <TransitionSeries.Sequence key={`s${i}`} durationInFrames={sceneFrames[i]}>
            {scene}
          </TransitionSeries.Sequence>,
          ...(i < scenes.length - 1
            ? [
                <TransitionSeries.Transition
                  key={`t${i}`}
                  presentation={i === scenes.length - 2 ? fade() : slide({ direction: 'from-right' })}
                  timing={linearTiming({ durationInFrames: TRANSITION })}
                />,
              ]
            : []),
        ])}
      </TransitionSeries>
    </AbsoluteFill>
  );
}
