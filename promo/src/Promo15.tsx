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

// 15초 인스타 릴스 광고 (결정 로그 76항). 앱 흐름 그대로, 장면 글을 이어 읽으면 서비스 설명이 된다:
// 오늘 저녁, 어디 달리지? → 내 주변 코스 찾고 → 코스를 달리고(워치 연동) → 인터벌도 정확하게(워치 연동) → 기록 깨고 순위 올리고 → 친구랑 같이 달리고 → 달리모, 코스 기반 소셜 러닝 앱
// 주인공은 휴대폰 앱. 워치는 달리는 장면에서 손목에 작게, 옆 휴대폰과 같은 숫자 (사용자 결정)
// 워치 화면은 targets/watch/RunViews.swift, 문구는 watchMessages.ts와 같은 모양. 숫자는 휴대폰 화면 캡처(mock)와 맞춘다
export const DURATION_15 = 15 * FPS;

const track = TRACKS.risingForest;
const VIDEO_DROP = 1.5;
const TRIM = Math.round((track.trackDrop - VIDEO_DROP) * FPS);
const DROP = track.trackDrop - TRIM / FPS;
const BAR = (4 * 60) / track.bpm;
const barFrame = (n: number) => Math.round((DROP + n * BAR) * FPS);
// 장면이 완전히 바뀌는 프레임: 드롭 · 1 · 2 · 3 · 4 · 5마디
const CUTS = [0, 1, 2, 3, 4, 5].map(barFrame);
const TRANSITIONS = [6, 8, 6, 8, 6, 10];
const STARTS = [0, ...CUTS.map((c, i) => c - TRANSITIONS[i])];
const SCENE_FRAMES = STARTS.map((s, i) => (i < CUTS.length ? CUTS[i] : DURATION_15) - s);
const BEATS = { drop: DROP * FPS, beat: (BAR / 4) * FPS };
// 끝 장면 출시 안내는 6마디 첫 박에
const END_ACCENT = barFrame(6) - STARTS[STARTS.length - 1];

const PRESENTATIONS = [
  pushCut({ flashColor: C.signal, flashOpacity: 0.6 }), // 드롭: 코스 찾기
  whip(), // 찾고 → 달리고
  pushCut({ flashColor: C.signal, flashOpacity: 0.35 }), // 달리고 → 인터벌
  whip(), // 인터벌 → 순위
  pushCut({ flashColor: C.signal, flashOpacity: 0.35 }), // 순위 → 같이
  fade(), // 같이 → 끝
] as unknown as TransitionPresentation<Record<string, unknown>>[];

const LEFT = 90;

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

// 0~1.5초: 30초 영상과 같은 질문
function Hook() {
  return (
    <AbsoluteFill>
      <Backdrop />
      <div style={{ position: 'absolute', top: 640, left: LEFT, right: LEFT }}>
        <Line delay={1} size={170}>
          오늘 저녁,
        </Line>
        <Line delay={7} size={170} color={C.signal}>
          어디 달리지?
        </Line>
      </div>
      <Route d="M -60 1560 C 180 1560 240 1260 470 1280 S 760 1520 900 1330 S 1060 1080 1160 1060" from={4} to={44} />
    </AbsoluteFill>
  );
}

// 작은 알약 글 (워치 옆 설명 등)
function Tag({ children, top, left, right, delay = 14 }: { children: ReactNode; top: number; left?: number; right?: number; delay?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = useOnBeat(delay);
  const p = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 180 } });
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left,
        right,
        padding: '18px 30px',
        borderRadius: 999,
        background: C.surface,
        border: '2px solid rgba(43,240,192,0.35)',
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.85)',
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: 36,
        color: C.text,
        whiteSpace: 'nowrap',
        transform: `scale(${p})`,
        opacity: Math.min(1, p * 1.5),
      }}
    >
      {children}
    </div>
  );
}

// 지도에서 내 주변 코스를 찾는다
function Find() {
  return (
    <AbsoluteFill>
      <Backdrop />
      <Head a="내 주변 코스" b="찾고" />
      <HeroPhone screen="explore" />
    </AbsoluteFill>
  );
}

// 코스를 달린다. 휴대폰이 기록하고 손목의 워치에도 같은 숫자
function Run() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const sec = 161 + interpolate(frame, [0, durationInFrames], [0, 2]);
  return (
    <AbsoluteFill>
      <Backdrop />
      <Route d="M -80 1700 C 200 1640 260 1420 520 1460 S 900 1660 1180 1380" from={0} to={50} />
      <Head a="코스를" b="달리고" />
      <HeroPhone screen="run" x={-70} top={730} />
      <Watch delay={8} top={1400} x={350} scale={0.6}>
        <Metrics status="기록 중" statusColor="#2BF0C0" time={clock(sec)} km="0.50" pace={`5'24"`} bpm={168} stripLabel="구간 1 도전 · 1/2" stripValue="0:15 빨라요" stripColor="#2BF0C0" />
      </Watch>
      <Tag top={632} right={40} delay={16}>
        Apple Watch에도 그대로
      </Tag>
    </AbsoluteFill>
  );
}

// 인터벌 달리기 (1분 빠르게 · 1분 천천히). 워치에 구간 · 남은 시간
function Interval() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const sec = 319 + interpolate(frame, [0, durationInFrames], [0, 2]);
  return (
    <AbsoluteFill>
      <Backdrop />
      <Head a="인터벌도" b="정확하게" />
      <HeroPhone screen="interval" x={-70} top={730} />
      <Watch delay={8} top={1400} x={350} scale={0.6}>
        <Metrics status="기록 중" statusColor="#2BF0C0" time={clock(sec)} km="1.01" pace={`5'16"`} bpm={174} stripLabel="빠르게 1/8 · 2/18" stripValue="0:41 남음" stripColor="#2BF0C0" />
      </Watch>
      <Tag top={632} right={40} delay={16}>
        구간이 바뀌면 소리 · 진동
      </Tag>
    </AbsoluteFill>
  );
}

// 기록을 깨면 코스 순위가 오른다 (PB 갱신 18위 → 14위, 결과 화면과 같은 숫자)
function Rank() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = useOnBeat(10);
  const pop = spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 190 } });
  const rank = Math.round(interpolate(frame, [at + 4, at + 24], [18, 14], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return (
    <AbsoluteFill>
      <Backdrop />
      <Head a="기록 깨고" b="순위 올리고" />
      <HeroPhone screen="ranking" />
      <div
        style={{
          position: 'absolute',
          top: 1120,
          right: 50,
          display: 'flex',
          alignItems: 'baseline',
          gap: 16,
          padding: '24px 44px',
          borderRadius: 999,
          background: C.surface,
          border: '2px solid rgba(43,240,192,0.4)',
          boxShadow: '0 30px 60px -20px rgba(0,0,0,0.85)',
          fontFamily: FONT,
          transform: `scale(${pop})`,
          opacity: Math.min(1, pop * 1.5),
        }}
      >
        <span style={{ fontSize: 40, fontWeight: 800, color: C.muted }}>이번 주</span>
        <Metric size={120} color={C.signal}>
          {rank}위
        </Metric>
      </div>
    </AbsoluteFill>
  );
}

// 장소가 달라도 친구와 같은 시간에 출발
function Together() {
  return (
    <AbsoluteFill>
      <Backdrop />
      <Head a="친구랑" b="같이 달리고" />
      <HeroPhone screen="live" />
      <Tag top={1120} left={40} delay={12}>
        장소가 달라도 같은 시간에 출발
      </Tag>
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
        <Line delay={18} size={66} weight={800} color={C.signal} style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          코스 기반 소셜 러닝 앱
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

const SCENES = [Hook, Find, Run, Interval, Rank, Together, End];

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
