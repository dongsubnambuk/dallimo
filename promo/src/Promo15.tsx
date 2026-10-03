import { linearTiming, TransitionSeries, type TransitionPresentation } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { pushCut } from '@remotion/transitions/push-cut';
import type { ReactNode } from 'react';
import { AbsoluteFill, Audio, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { Backdrop } from './Backdrop';
import { BeatContext, useOnBeat } from './beat';
import { loadFonts } from './fonts';
import { Line, Metric } from './Kinetic';
import { Route } from './Route';
import { C, FONT } from './theme';
import { FPS, TRACKS } from './timeline';
import { Phone } from './Phone';
import { Metrics } from './WatchStore';
import { whip } from './whip';

loadFonts();

// 15초 인스타 릴스 광고. 기능을 늘어놓지 않고 이야기 하나로 (결정 로그 76항):
// 친구가 내 기록을 넘었다는 알림 → 다시 달린다 → 되찾는다 → 이번엔 친구 차례 → 다음엔 같이 → 달리모
// 주인공은 휴대폰 앱이다. 워치는 달리는 장면에서 옆에 작게만 (사용자 결정)
// 알림 문구는 서버 RecordBeatenNotifier, 워치 화면은 targets/watch/RunViews.swift와 같은 모양. 숫자는 휴대폰 화면 캡처(mock)와 맞춘다
export const DURATION_15 = 15 * FPS;

const track = TRACKS.risingForest;
const VIDEO_DROP = 2.5;
const TRIM = Math.round((track.trackDrop - VIDEO_DROP) * FPS);
const DROP = track.trackDrop - TRIM / FPS;
const BAR = (4 * 60) / track.bpm;
const barFrame = (n: number) => Math.round((DROP + n * BAR) * FPS);
// 장면이 완전히 바뀌는 프레임: 드롭 · 1 · 2 · 3 · 4마디
const CUTS = [0, 1, 2, 3, 4].map(barFrame);
const TRANSITIONS = [6, 8, 6, 8, 12];
const STARTS = [0, ...CUTS.map((c, i) => c - TRANSITIONS[i])];
const SCENE_FRAMES = STARTS.map((s, i) => (i < CUTS.length ? CUTS[i] : DURATION_15) - s);
const BEATS = { drop: DROP * FPS, beat: (BAR / 4) * FPS };
// 끝 장면 출시 안내는 5마디 첫 박에
const END_ACCENT = barFrame(5) - STARTS[STARTS.length - 1];

const PRESENTATIONS = [
  pushCut({ flashColor: C.signal, flashOpacity: 0.6 }), // 드롭: 달리기 시작
  whip(), // 달리는 중 → 되찾음
  pushCut({ flashColor: C.signal, flashOpacity: 0.35 }), // 되찾음 → 친구 차례
  whip(), // 친구 차례 → 같이
  fade(), // 같이 → 끝
] as unknown as TransitionPresentation<Record<string, unknown>>[];

const LEFT = 90;

// iOS 알림 배너. 위에서 내려온다
function Notice({ title, body, delay = 0, top = 300 }: { title: string; body: string; delay?: number; top?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 170 } });
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 50,
        right: 50,
        padding: '34px 38px',
        borderRadius: 48,
        background: 'rgba(44,45,48,0.92)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 40px 90px -30px rgba(0,0,0,0.9)',
        display: 'flex',
        gap: 30,
        fontFamily: FONT,
        transform: `translateY(${(1 - p) * -520}px)`,
        opacity: Math.min(1, p * 1.4),
      }}
    >
      <Img src={staticFile('icon.png')} style={{ width: 92, height: 92, borderRadius: 22, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 34, color: C.muted, fontWeight: 500 }}>
          <span>달리모</span>
          <span>지금</span>
        </div>
        <div style={{ marginTop: 4, fontSize: 42, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>{title}</div>
        <div style={{ marginTop: 6, fontSize: 38, fontWeight: 500, color: '#d6d8d7', lineHeight: 1.35, letterSpacing: '-0.02em' }}>{body}</div>
      </div>
    </div>
  );
}

// Apple Watch (손목 줄 + 몸체 + 디지털 크라운). 화면은 410×502 워치 화면 그대로
function Watch({ children, scale = 1.3, top = 640, x = 0, delay = 0 }: { children: ReactNode; scale?: number; top?: number; x?: number; delay?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 170, mass: 0.8 } });
  const W = 410 + 56;
  const H = 502 + 56;
  return (
    <div style={{ position: 'absolute', top, left: '50%', width: W, marginLeft: -W / 2 + x, transform: `translateY(${(1 - p) * 700}px) scale(${scale})`, transformOrigin: '50% 0%' }}>
      {/* 줄 */}
      <div style={{ position: 'absolute', left: 70, right: 70, top: -150, height: 190, borderRadius: '40px 40px 0 0', background: 'linear-gradient(180deg, #121314, #232427)' }} />
      <div style={{ position: 'absolute', left: 70, right: 70, top: H - 40, height: 300, borderRadius: '0 0 40px 40px', background: 'linear-gradient(0deg, #121314, #232427)' }} />
      {/* 크라운 · 옆 버튼 */}
      <div style={{ position: 'absolute', right: -16, top: 120, width: 22, height: 84, borderRadius: 10, background: 'linear-gradient(90deg,#4a4c50,#2a2b2e)' }} />
      <div style={{ position: 'absolute', right: -10, top: 250, width: 14, height: 110, borderRadius: 8, background: '#2f3034' }} />
      {/* 몸체 */}
      <div style={{ position: 'relative', width: W, height: H, borderRadius: 120, background: 'linear-gradient(145deg,#5a5c61 0%,#2b2c30 35%,#1b1c1f 65%,#46484d 100%)', boxShadow: '0 60px 120px -40px rgba(0,0,0,0.9)' }}>
        <div style={{ position: 'absolute', inset: 10, borderRadius: 112, background: '#000' }} />
        <div style={{ position: 'absolute', left: 28, top: 28, width: 410, height: 502, borderRadius: 92, overflow: 'hidden' }}>{children}</div>
      </div>
    </div>
  );
}

// 휴대폰 (주인공). 아래에서 빠르게 올라온다
function HeroPhone({ screen, x = 0, top = 640, delay = 2 }: { screen: string; x?: number; top?: number; delay?: number }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 190, mass: 0.7 } });
  const drift = interpolate(frame, [0, durationInFrames], [1, 1.05]);
  return (
    <div style={{ position: 'absolute', top, left: '50%', marginLeft: -320 + x, transform: `translateY(${(1 - p) * 800}px) scale(${drift})`, transformOrigin: '50% 20%' }}>
      <Phone screen={screen} width={640} />
    </div>
  );
}

// 위쪽 큰 글 한두 줄
function Head({ a, b, top = 250 }: { a: string; b?: string; top?: number }) {
  return (
    <div style={{ position: 'absolute', top, left: LEFT, right: LEFT }}>
      <Line delay={1} size={150}>
        {a}
      </Line>
      {b ? (
        <Line delay={6} size={150} color={C.signal}>
          {b}
        </Line>
      ) : null}
    </div>
  );
}

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

// 0~2.5초: 친구가 내 기록을 넘었다는 알림
function Hook() {
  return (
    <AbsoluteFill>
      <Backdrop />
      <Notice delay={3} top={330} title="내 코스 기록을 넘었어요" body="민수님이 수성못 둘레길에서 9:58로 내 기록 10:12을 넘었어요" />
      <div style={{ position: 'absolute', top: 1000, left: LEFT, right: LEFT }}>
        <Line delay={34} size={160}>
          …그냥 둘 수
        </Line>
        <Line delay={42} size={160} color={C.signal}>
          없지.
        </Line>
      </div>
    </AbsoluteFill>
  );
}

// 드롭: 다시 달린다. 휴대폰이 기록하고 손목의 워치에도 같은 숫자
function Run() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const sec = 161 + interpolate(frame, [0, durationInFrames], [0, 2]);
  return (
    <AbsoluteFill>
      <Backdrop />
      <Route d="M -80 1700 C 200 1640 260 1420 520 1460 S 900 1660 1180 1380" from={0} to={50} />
      <Head a="다시," b="수성못으로." />
      <HeroPhone screen="run" x={-70} top={640} />
      <Watch delay={10} top={1320} x={350} scale={0.6}>
        <Metrics status="기록 중" statusColor="#2BF0C0" time={clock(sec)} km="0.50" pace={`5'24"`} bpm={168} stripLabel="구간 1 도전 · 1/2" stripValue="0:15 빨라요" stripColor="#2BF0C0" />
      </Watch>
    </AbsoluteFill>
  );
}

// 되찾았다: 9:58을 긋고 9:51
function Win() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = useOnBeat(8);
  const slam = spring({ frame: frame - at, fps, config: { damping: 10, stiffness: 220, mass: 0.7 } });
  const strike = interpolate(frame, [2, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
        <div style={{ fontSize: 52, fontWeight: 700, color: C.muted }}>수성못 둘레길 · 공식 기록</div>
        <div style={{ position: 'relative', marginTop: 30 }}>
          <Metric size={150} color={C.muted}>
            민수 9:58
          </Metric>
          <span style={{ position: 'absolute', left: -8, right: -8, top: '52%', height: 10, background: C.muted, transform: `scaleX(${strike})`, transformOrigin: 'left' }} />
        </div>
        <div style={{ marginTop: 10, transform: `scale(${0.6 + 0.4 * slam})`, opacity: Math.min(1, slam * 2) }}>
          <Metric size={330} color={C.signal}>
            9:51
          </Metric>
        </div>
        <div style={{ marginTop: 20, opacity: Math.min(1, slam * 2) }}>
          <Line delay={at + 4} size={110}>
            되찾았다.
          </Line>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// 이번엔 민수 차례: 같은 알림이 민수에게 간다
function Turn() {
  return (
    <AbsoluteFill>
      <Backdrop />
      <Head a="이번엔" b="민수 차례." />
      <Notice delay={8} top={760} title="내 코스 기록을 넘었어요" body="수성러너님이 수성못 둘레길에서 9:51로 내 기록 9:58을 넘었어요" />
    </AbsoluteFill>
  );
}

// 다음엔 같이: 장소가 달라도 같은 시간에 출발하는 레이스
function Together() {
  return (
    <AbsoluteFill>
      <Backdrop />
      <Head a="다음엔" b="같이 붙자." />
      <HeroPhone screen="live" x={-70} top={640} />
      <Watch delay={10} top={1320} x={350} scale={0.6}>
        <Metrics status="기록 중" statusColor="#2BF0C0" time="0:40" km="0.12" pace={`5'37"`} bpm={171} stripLabel="3명 중 3위" stripValue="선두와 5초 차이" stripColor="rgba(235,235,245,0.6)" />
      </Watch>
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

const SCENES = [Hook, Run, Win, Turn, Together, End];

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
