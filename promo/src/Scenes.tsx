import type { ReactNode } from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { Backdrop } from './Backdrop';
import { useOnBeat } from './beat';
import { Chip, Line, Metric } from './Kinetic';
import { Phone } from './Phone';
import { Route } from './Route';
import { C, FONT } from './theme';

// 릴스 안전 영역: 위 220px · 아래 420px에는 중요한 글을 두지 않는다
const LEFT = 90;
const HEAD_TOP = 250;

function Headline({ a, b, size = 128 }: { a: ReactNode; b: ReactNode; size?: number }) {
  return (
    <div style={{ position: 'absolute', top: HEAD_TOP, left: LEFT, right: LEFT }}>
      <Line delay={2} size={size}>
        {a}
      </Line>
      <Line delay={9} size={size} color={C.signal}>
        {b}
      </Line>
    </div>
  );
}

// 휴대폰이 들어오는 방식을 장면마다 바꾼다 (같은 등장만 반복하면 단조롭다). 들어온 뒤에는 천천히 커진다
type Enter = 'rise' | 'zoom' | 'tilt' | 'drop' | 'left' | 'right';

function ScenePhone({ screen, width = 620, top = 660, x = 0, rotate = 0, delay = 0, enter = 'rise' }: { screen: string; width?: number; top?: number; x?: number; rotate?: number; delay?: number; enter?: Enter }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // drop은 위에서 떨어져 한 번 튕기며 멈춘다 (덜 감쇠)
  const p = spring({ frame: frame - delay, fps, config: enter === 'drop' ? { damping: 9, mass: 0.8, stiffness: 140 } : { damping: 18, mass: 0.9 } });
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.05]);
  const move = {
    rise: `translateY(${(1 - p) * 520}px)`,
    zoom: `scale(${0.55 + 0.45 * p})`,
    tilt: `perspective(1600px) translateY(${(1 - p) * 360}px) rotateX(${(1 - p) * 38}deg)`,
    drop: `translateY(${(1 - p) * -900}px)`,
    left: `translateX(${(1 - p) * -1000}px) rotate(${(1 - p) * -14}deg)`,
    right: `translateX(${(1 - p) * 1000}px) rotate(${(1 - p) * 14}deg)`,
  }[enter];
  const opacity = enter === 'zoom' ? Math.min(1, p * 2) : 1;
  return (
    <div style={{ position: 'absolute', top, left: '50%', marginLeft: -width / 2 + x, opacity, transform: `${move} rotate(${rotate}deg) scale(${zoom})`, transformOrigin: '50% 30%' }}>
      <Phone screen={screen} width={width} />
    </div>
  );
}

function Check() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={C.signal} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}

export function Hook() {
  const frame = useCurrentFrame();
  const sub = interpolate(frame, [34, 46], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <Backdrop />
      <div style={{ position: 'absolute', top: 520, left: LEFT, right: LEFT }}>
        <Line delay={3} size={180}>
          오늘 저녁,
        </Line>
        <Line delay={11} size={180} color={C.signal}>
          어디 달리지?
        </Line>
        <div style={{ marginTop: 40, fontFamily: FONT, fontWeight: 500, fontSize: 48, color: C.muted, opacity: sub }}>코스 기반 소셜 러닝 앱, 달리모</div>
      </div>
      <Route d="M -60 1560 C 180 1560 240 1260 470 1280 S 760 1520 900 1330 S 1060 1080 1160 1060" from={14} to={70} />
    </AbsoluteFill>
  );
}

export function Explore() {
  return (
    <AbsoluteFill>
      <Backdrop />
      <Headline a="내 주변 코스를" b="지도에서 바로" />
      <ScenePhone screen="explore" delay={4} enter="rise" />
      <Chip delay={38} style={{ top: 1160, right: 50 }}>
        <span style={{ color: C.signal }}>●</span> 수성못 둘레길 1.9km
      </Chip>
    </AbsoluteFill>
  );
}

export function Course() {
  return (
    <AbsoluteFill>
      <Backdrop />
      <Headline a="달리기 전에" b="알아야 할 것만" />
      <ScenePhone screen="course" delay={6} enter="zoom" />
      <Chip delay={26} style={{ top: 1060, left: 40 }}>
        거리 <Metric size={48}>1.9km</Metric>
      </Chip>
      <Chip delay={40} style={{ top: 1270, right: 40 }}>
        오르막 <Metric size={48}>+9m</Metric>
      </Chip>
      <Chip delay={54} style={{ top: 1480, left: 40 }}>
        내 PB <Metric size={48} color={C.signal}>10:12</Metric>
      </Chip>
    </AbsoluteFill>
  );
}

export function Run() {
  const frame = useCurrentFrame();
  const km = interpolate(frame, [18, 80], [0, 0.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3) });
  return (
    <AbsoluteFill>
      <Backdrop />
      <Headline a="달리는 중엔" b="숫자 세 개만" />
      <ScenePhone screen="run" delay={4} enter="tilt" />
      <Chip delay={16} style={{ top: 880, right: 40, padding: '18px 34px' }}>
        <Metric size={76}>{km.toFixed(2)}</Metric>
        <span style={{ fontSize: 34, color: C.muted }}>km</span>
      </Chip>
      <Chip delay={46} style={{ top: 1260, left: 40 }}>
        음성으로 페이스 안내
      </Chip>
      <Chip delay={66} style={{ top: 1460, right: 40 }}>
        화면을 꺼도 계속 기록
      </Chip>
    </AbsoluteFill>
  );
}

export function Result() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pbAt = useOnBeat(52); // PB 칩은 박에 맞춰 튀어나온다
  const pb = spring({ frame: frame - pbAt, fps, config: { damping: 14 } });
  const strike = interpolate(frame, [pbAt + 10, pbAt + 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <Backdrop />
      <Headline a="멈추는 순간" b="공식 기록으로" />
      <ScenePhone screen="result" delay={6} enter="drop" />
      <Chip delay={28} style={{ top: 1160, left: 40 }}>
        <Check /> 공식 기록 인증됨
      </Chip>
      <div
        style={{
          position: 'absolute',
          left: 70,
          right: 70,
          top: 1290,
          padding: '36px 44px',
          borderRadius: 40,
          background: C.surface,
          border: '2px solid rgba(43,240,192,0.35)',
          boxShadow: '0 40px 80px -30px rgba(0,0,0,0.85)',
          transform: `scale(${pb})`,
          opacity: Math.min(1, pb * 1.5),
          fontFamily: FONT,
        }}
      >
        <div style={{ fontSize: 38, fontWeight: 700, color: C.muted }}>PB 갱신 · 4초 단축</div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 28 }}>
          <span style={{ position: 'relative' }}>
            <Metric size={92} color={C.muted}>
              10:12
            </Metric>
            <span style={{ position: 'absolute', left: -6, right: -6, top: '52%', height: 8, background: C.muted, transform: `scaleX(${strike})`, transformOrigin: 'left' }} />
          </span>
          <span style={{ fontSize: 64, color: C.muted }}>→</span>
          <Metric size={124} color={C.signal}>
            10:08
          </Metric>
        </div>
      </div>
    </AbsoluteFill>
  );
}

export function Ranking() {
  const frame = useCurrentFrame();
  const rank = Math.round(interpolate(frame, [36, 72], [18, 14], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return (
    <AbsoluteFill>
      <Backdrop />
      <Headline a="코스마다" b="순위가 있어요" />
      <ScenePhone screen="ranking" delay={8} enter="right" />
      <Chip delay={24} style={{ top: 1220, right: 40, padding: '24px 40px' }}>
        <span style={{ color: C.muted, fontSize: 38 }}>이번 주</span>
        <Metric size={110} color={C.signal}>
          {rank}위
        </Metric>
      </Chip>
      <Chip delay={60} style={{ top: 1490, left: 40 }}>
        최근 90일 최고 기록은 코스 크라운
      </Chip>
    </AbsoluteFill>
  );
}

export function Together() {
  return (
    <AbsoluteFill>
      <Backdrop />
      <Headline a="장소가 달라도" b="같은 시간에 출발" />
      <ScenePhone screen="room" width={500} top={760} x={-190} rotate={-6} delay={4} enter="left" />
      <ScenePhone screen="live" width={540} top={700} x={170} rotate={4} delay={12} enter="right" />
      <Chip delay={46} style={{ top: 1560, left: '50%', transform: undefined, translate: '-50% 0' }}>
        위치 대신 거리 · 페이스만 보여요
      </Chip>
    </AbsoluteFill>
  );
}

export function End({ accent, credit: creditText }: { accent: number; credit: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const icon = spring({ frame: frame - 6, fps, config: { damping: 12, stiffness: 140 } });
  // 출시 안내는 음악의 마디 첫 박(timeline.ts의 accentBar)에 튀어나온다
  const pill = spring({ frame: frame - accent, fps, config: { damping: 11, stiffness: 170 } });
  const credit = interpolate(frame, [accent + 6, accent + 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <Backdrop />
      <Route d="M -60 1500 C 200 1520 300 1340 540 1360 S 880 1520 1140 1380" from={0} to={50} dot />
      <AbsoluteFill style={{ alignItems: 'center', top: 380 }}>
        <Img src={staticFile('icon.png')} style={{ width: 230, height: 230, borderRadius: 56, transform: `scale(${icon})`, boxShadow: '0 40px 80px -30px rgba(43,240,192,0.35)' }} />
        <div style={{ marginTop: 50, textAlign: 'center' }}>
          <Line delay={14} size={150} style={{ display: 'flex', justifyContent: 'center' }}>
            달리모
          </Line>
          <Line delay={24} size={64} weight={800} style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            코스를 찾고, 같이 달리고,
          </Line>
          <Line delay={30} size={64} weight={800} color={C.signal} style={{ display: 'flex', justifyContent: 'center' }}>
            기록을 깨다.
          </Line>
        </div>
        <div
          style={{
            marginTop: 70,
            padding: '26px 48px',
            borderRadius: 999,
            background: C.signal,
            color: C.ink,
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 44,
            opacity: Math.min(1, pill * 1.5),
            transform: `scale(${pill})`,
          }}
        >
          곧 App Store · Google Play 출시
        </div>
        {creditText ? <div style={{ marginTop: 40, fontFamily: FONT, fontWeight: 500, fontSize: 26, color: C.muted, opacity: credit * 0.8 }}>{creditText}</div> : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// 릴스 커버 (정지 화면): 첫 화면과 같은 구성
export function CoverArt() {
  return (
    <AbsoluteFill>
      <Backdrop />
      <div style={{ position: 'absolute', top: 260, left: LEFT, right: LEFT }}>
        <Line size={150}>코스를 찾고,</Line>
        <Line size={150}>같이 달리고,</Line>
        <Line size={150} color={C.signal}>
          <span style={{ fontStyle: 'italic', display: 'inline-block', transform: 'skewX(-6deg)' }}>기록을 깨다.</span>
        </Line>
      </div>
      <Route d="M -60 1820 C 200 1840 300 1640 540 1660 S 880 1820 1140 1680" from={-10} to={0} dot={false} />
      <div style={{ position: 'absolute', top: 980, left: 70, transform: 'rotate(-7deg)' }}>
        <Phone screen="explore" width={380} />
      </div>
      <div style={{ position: 'absolute', top: 990, right: 70, transform: 'rotate(7deg)' }}>
        <Phone screen="result" width={380} />
      </div>
      <div style={{ position: 'absolute', top: 900, left: '50%', marginLeft: -230 }}>
        <Phone screen="run" width={460} />
      </div>
    </AbsoluteFill>
  );
}
