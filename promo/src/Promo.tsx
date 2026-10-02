import { linearTiming, TransitionSeries, type TransitionPresentation } from '@remotion/transitions';
import { clockWipe } from '@remotion/transitions/clock-wipe';
import { fade } from '@remotion/transitions/fade';
import { flip } from '@remotion/transitions/flip';
import { iris } from '@remotion/transitions/iris';
import { pushCut } from '@remotion/transitions/push-cut';
import { wipe } from '@remotion/transitions/wipe';
import { AbsoluteFill, Audio, interpolate, staticFile } from 'remotion';

import { BeatContext } from './beat';
import { loadFonts } from './fonts';
import { Course, End, Explore, Hook, Ranking, Result, Run, Together } from './Scenes';
import { C } from './theme';
import { DURATION, FPS, timeline, TRANSITIONS, type TrackId } from './timeline';
import { whip } from './whip';

loadFonts();

// 장면 길이 · 전환은 timeline.ts에서 배경 음악의 마디에 맞춰 계산한다
const SCENES = [Hook, Explore, Course, Run, Result, Ranking, Together];

// 컷마다 다른 전환 (같은 밀기만 반복하면 단조롭다). 장면 뜻에 맞춰 골랐고 모두 CSS로 그린다 (WebGL 전환은 렌더 환경을 탄다)
const SIZE = { width: 1080, height: 1920 };
const CUTS = [
  pushCut({ flashColor: C.signal, flashOpacity: 0.55 }), // 시작 → 탐색: 드롭에 민트 빛과 함께 확 들어간다
  iris(SIZE), // 탐색 → 코스 상세: 지도에서 코스를 누르면 원이 열리듯
  whip(), // 코스 상세 → 달리는 중: 위로 휙 지나가며 출발
  clockWipe(SIZE), // 달리는 중 → 결과: 스톱워치 바늘이 돌듯 기록이 멈춘다
  flip({ direction: 'from-right', perspective: 2400 }), // 결과 → 랭킹: 곡이 다음 흐름으로 넘어갈 때 카드가 뒤집힌다
  wipe({ direction: 'from-bottom-left' }), // 랭킹 → 함께 달리기: 비스듬히 쓸어 넘긴다
  fade(), // 함께 달리기 → 끝: 부드럽게 마무리
] as unknown as TransitionPresentation<Record<string, unknown>>[]; // 전환마다 props 모양이 달라 한 배열에 담는다

export function Promo({ track: id }: { track: TrackId }) {
  const { track, trim, starts, sceneFrames, beats, endAccent } = timeline(id);
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
            <BeatContext.Provider value={{ start: starts[i], ...beats }}>{scene}</BeatContext.Provider>
          </TransitionSeries.Sequence>,
          ...(i < scenes.length - 1
            ? [
                <TransitionSeries.Transition
                  key={`t${i}`}
                  presentation={CUTS[i]}
                  timing={linearTiming({ durationInFrames: TRANSITIONS[i] })}
                />,
              ]
            : []),
        ])}
      </TransitionSeries>
    </AbsoluteFill>
  );
}
