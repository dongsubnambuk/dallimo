import { linearTiming, TransitionSeries, type TransitionPresentation } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { iris } from '@remotion/transitions/iris';
import { pushCut } from '@remotion/transitions/push-cut';
import { AbsoluteFill, Audio, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { Backdrop } from './Backdrop';
import { BeatContext, useOnBeat } from './beat';
import { loadFonts } from './fonts';
import { Chip, Line, Metric } from './Kinetic';
import { Phone } from './Phone';
import { Route } from './Route';
import { C, FONT } from './theme';
import { FPS, TRACKS } from './timeline';
import { whip } from './whip';

loadFonts();

// 15초 인스타 릴스 광고. 기능 설명 대신 "찾고 · 깨고 · 올리고 · 같이" 네 마디로 핵심만 (결정 로그 76항)
// 음악은 30초 영상과 같은 "Rising Forest". 드롭을 1.5초에 두고 그 뒤 한 마디(1.936초)마다 장면을 바꾼다
export const DURATION_15 = 15 * FPS;

const track = TRACKS.risingForest;
const VIDEO_DROP = 1.5;
const TRIM = Math.round((track.trackDrop - VIDEO_DROP) * FPS);
const DROP = track.trackDrop - TRIM / FPS;
const BAR = (4 * 60) / track.bpm;
const barFrame = (n: number) => Math.round((DROP + n * BAR) * FPS);
// 장면이 완전히 바뀌는 프레임: 드롭 · 1 · 2 · 3 · 4마디
const CUTS = [0, 1, 2, 3, 4].map(barFrame);
// 컷마다 전환 길이 (전환이 끝나는 순간 박이 온다)
const TRANSITIONS = [6, 8, 8, 8, 12];
const STARTS = [0, ...CUTS.map((c, i) => c - TRANSITIONS[i])];
const SCENE_FRAMES = STARTS.map((s, i) => (i < CUTS.length ? CUTS[i] : DURATION_15) - s);
const BEATS = { drop: DROP * FPS, beat: (BAR / 4) * FPS };
// 끝 장면 출시 안내는 6마디 첫 박에 튀어나온다
const END_ACCENT = barFrame(6) - STARTS[STARTS.length - 1];

const SIZE = { width: 1080, height: 1920 };
const PRESENTATIONS = [
  pushCut({ flashColor: C.signal, flashOpacity: 0.6 }), // 드롭: 민트 빛과 함께 확
  whip(), // 찾고 → 깨고
  pushCut({ flashColor: C.signal, flashOpacity: 0.35 }), // 깨고 → 올려
  iris(SIZE), // 올려 → 같이
  fade(), // 같이 → 끝
] as unknown as TransitionPresentation<Record<string, unknown>>[];

const LEFT = 90;

// 장면 머리글: 한 줄, 크게. 두 번째 단어만 민트
function Punch({ a, b }: { a: string; b: string }) {
  return (
    <div style={{ position: 'absolute', top: 250, left: LEFT, right: LEFT, display: 'flex', gap: 34 }}>
      <Line delay={1} size={176}>
        {a}
      </Line>
      <Line delay={5} size={176} color={C.signal}>
        {b}
      </Line>
    </div>
  );
}

// 휴대폰이 빠르게 튀어 들어온다 (한 마디 안에 다 보이게)
function SlamPhone({ screen, from = 'bottom', delay = 2 }: { screen: string; from?: 'bottom' | 'right' | 'zoom'; delay?: number }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 190, mass: 0.7 } });
  const drift = interpolate(frame, [0, durationInFrames], [1, 1.06]);
  const move = { bottom: `translateY(${(1 - p) * 700}px)`, right: `translateX(${(1 - p) * 1100}px) rotate(${(1 - p) * 12}deg)`, zoom: `scale(${0.5 + 0.5 * p})` }[from];
  return (
    <div style={{ position: 'absolute', top: 520, left: '50%', marginLeft: -340, transform: `${move} scale(${drift})`, transformOrigin: '50% 20%', opacity: Math.min(1, p * 2) }}>
      <Phone screen={screen} width={680} />
    </div>
  );
}

function Hook() {
  return (
    <AbsoluteFill>
      <Backdrop />
      <div style={{ position: 'absolute', top: 640, left: LEFT, right: LEFT }}>
        <Line delay={1} size={190}>
          오늘도
        </Line>
        <Line delay={9} size={190} color={C.signal}>
          그냥 뛰었어?
        </Line>
      </div>
      <Route d="M -60 1500 C 180 1500 260 1300 480 1320 S 800 1480 1160 1260" from={4} to={44} />
    </AbsoluteFill>
  );
}

function Find() {
  return (
    <AbsoluteFill>
      <Backdrop />
      <Punch a="코스를" b="찾고" />
      <SlamPhone screen="explore" from="zoom" />
      <Chip delay={16} style={{ top: 1120, right: 44 }}>
        <span style={{ color: C.signal }}>●</span> 내 주변 코스 5개
      </Chip>
    </AbsoluteFill>
  );
}

function Break() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = useOnBeat(16);
  const pb = spring({ frame: frame - at, fps, config: { damping: 13, stiffness: 180 } });
  const strike = interpolate(frame, [at + 6, at + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <Backdrop />
      <Punch a="기록을" b="깨고" />
      <SlamPhone screen="result" from="bottom" />
      <div
        style={{
          position: 'absolute',
          left: 60,
          right: 60,
          top: 1100,
          padding: '34px 44px',
          borderRadius: 40,
          background: C.surface,
          border: '2px solid rgba(43,240,192,0.4)',
          boxShadow: '0 40px 80px -30px rgba(0,0,0,0.85)',
          transform: `scale(${pb})`,
          opacity: Math.min(1, pb * 1.5),
          fontFamily: FONT,
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 800, color: C.muted }}>PB 갱신</div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 26 }}>
          <span style={{ position: 'relative' }}>
            <Metric size={96} color={C.muted}>
              10:12
            </Metric>
            <span style={{ position: 'absolute', left: -6, right: -6, top: '52%', height: 8, background: C.muted, transform: `scaleX(${strike})`, transformOrigin: 'left' }} />
          </span>
          <span style={{ fontSize: 64, color: C.muted }}>→</span>
          <Metric size={136} color={C.signal}>
            10:08
          </Metric>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Climb() {
  const frame = useCurrentFrame();
  const rank = Math.round(interpolate(frame, [14, 40], [18, 14], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return (
    <AbsoluteFill>
      <Backdrop />
      <Punch a="순위를" b="올려" />
      <SlamPhone screen="ranking" from="right" />
      <Chip delay={10} style={{ top: 1100, right: 44, padding: '24px 44px' }}>
        <span style={{ color: C.muted, fontSize: 40 }}>이번 주</span>
        <Metric size={120} color={C.signal}>
          {rank}위
        </Metric>
      </Chip>
    </AbsoluteFill>
  );
}

function Together() {
  return (
    <AbsoluteFill>
      <Backdrop />
      <Punch a="친구랑" b="같이" />
      <SlamPhone screen="live" from="bottom" />
      <Chip delay={14} style={{ top: 1120, left: 44 }}>
        장소가 달라도 같은 시간에 출발
      </Chip>
    </AbsoluteFill>
  );
}

function End() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const icon = spring({ frame: frame - 4, fps, config: { damping: 12, stiffness: 150 } });
  const pill = spring({ frame: frame - END_ACCENT, fps, config: { damping: 11, stiffness: 170 } });
  return (
    <AbsoluteFill>
      <Backdrop />
      <Route d="M -60 1500 C 200 1520 300 1340 540 1360 S 880 1520 1140 1380" from={0} to={40} dot />
      <AbsoluteFill style={{ alignItems: 'center', top: 420 }}>
        <Img src={staticFile('icon.png')} style={{ width: 240, height: 240, borderRadius: 58, transform: `scale(${icon})`, boxShadow: '0 40px 80px -30px rgba(43,240,192,0.4)' }} />
        <Line delay={10} size={170} style={{ display: 'flex', justifyContent: 'center', marginTop: 46 }}>
          달리모
        </Line>
        <Line delay={18} size={60} weight={800} style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          코스를 찾고, 같이 달리고,
        </Line>
        <Line delay={24} size={60} weight={800} color={C.signal} style={{ display: 'flex', justifyContent: 'center' }}>
          기록을 깨다.
        </Line>
        <div
          style={{
            marginTop: 70,
            padding: '26px 52px',
            borderRadius: 999,
            background: C.signal,
            color: C.ink,
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 46,
            opacity: Math.min(1, pill * 1.5),
            transform: `scale(${pill})`,
          }}
        >
          곧 App Store 출시
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

const SCENES = [Hook, Find, Break, Climb, Together, End];

export function Promo15() {
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Audio
        src={staticFile(track.file)}
        trimBefore={TRIM}
        volume={(f) => interpolate(f, [DURATION_15 - 1.2 * FPS, DURATION_15], [0.9, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
      />
      <TransitionSeries>
        {SCENES.flatMap((Scene, i) => [
          <TransitionSeries.Sequence key={`s${i}`} durationInFrames={SCENE_FRAMES[i]}>
            <BeatContext.Provider value={{ start: STARTS[i], ...BEATS }}>
              <Scene />
            </BeatContext.Provider>
          </TransitionSeries.Sequence>,
          ...(i < SCENES.length - 1
            ? [<TransitionSeries.Transition key={`t${i}`} presentation={PRESENTATIONS[i]} timing={linearTiming({ durationInFrames: TRANSITIONS[i] })} />]
            : []),
        ])}
      </TransitionSeries>
    </AbsoluteFill>
  );
}
