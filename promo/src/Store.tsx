import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';

import { Backdrop } from './Backdrop';
import { loadFonts } from './fonts';
import { Phone } from './Phone';
import { C, FONT } from './theme';

loadFonts();

// App Store 스크린샷 (6.9인치 1320×2868, docs/store/APP-STORE.md). 홍보 영상과 같은 틀 · 색 · 글꼴로 정지 화면을 만든다.
// 화면은 실제 앱 캡처(mock 데이터)에 상태 표시줄을 그린 것 (promo/assets/store-screens, 1179×2556)
// 1장은 서비스 소개, 2~8장은 기능 하나씩. 바탕색을 번갈아 바꾸고 화면의 핵심 부분을 크게 띄운다 (결정 로그 72항)
export const STORE_SIZE = { width: 1320, height: 2868 };
const SRC_W = 1179;

type Tone = 'dark' | 'mint' | 'light';
type Rect = [x: number, y: number, w: number, h: number]; // 화면 원본(1179×2556) 안의 영역

const TONES: Record<Tone, { text: string; accent: string; sub: string }> = {
  dark: { text: C.text, accent: C.signal, sub: C.muted },
  mint: { text: C.ink, accent: C.ink, sub: 'rgba(11,11,12,0.62)' },
  light: { text: C.ink, accent: C.signalDeep, sub: '#5f6462' },
};

export const STORE_SHOTS = [
  { id: 'Store2', tone: 'mint', icon: 'pin', screen: 'explore', a: '내 주변 코스를', b: '지도에서 바로', sub: '이번 주 몇 명이 달렸는지까지 한눈에', zoom: [30, 1075, 1120, 455] },
  { id: 'Store3', tone: 'light', icon: 'route', screen: 'course', a: '달리기 전에', b: '알아야 할 것만', sub: '거리 · 오르막 · 내 최고 기록', zoom: [40, 1335, 1095, 615] },
  { id: 'Store4', tone: 'dark', icon: 'timer', screen: 'run', a: '달리는 중엔', b: '숫자 세 개만', sub: '음성 안내 · 화면을 꺼도 계속 기록', zoom: [40, 1345, 1095, 180] },
  { id: 'Store5', tone: 'mint', icon: 'trophy', screen: 'result', a: '멈추는 순간', b: '공식 기록으로', sub: '코스를 끝까지 달리면 자동으로 인증', zoom: [40, 1880, 1100, 475] },
  { id: 'Store6', tone: 'light', icon: 'chart', screen: 'ranking', a: '코스마다', b: '순위가 있어요', sub: '이번 주 · 이번 달 · 친구 순위', zoom: [50, 1170, 1075, 150] },
  { id: 'Store7', tone: 'dark', icon: 'users', screen: 'live', a: '장소가 달라도', b: '같은 시간에 출발', sub: '위치 대신 거리 · 페이스만 보여요', zoom: [45, 935, 1080, 430] },
  { id: 'Store8', tone: 'mint', icon: 'bell', screen: 'activity', a: '친구가 내 기록을', b: '넘으면 알려 줘요', sub: '코스 크라운 · 로컬 레전드 소식', zoom: [40, 385, 1100, 205] },
] as const satisfies readonly { id: string; tone: Tone; icon: keyof typeof ICONS; screen: string; a: string; b: string; sub: string; zoom: Rect }[];

// lucide 아이콘 모양 (24×24 선)
const ICONS = {
  pin: (
    <>
      <path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <circle cx="18" cy="5" r="3" />
    </>
  ),
  timer: (
    <>
      <path d="M10 2h4M12 14l3-3" />
      <circle cx="12" cy="14" r="8" />
    </>
  ),
  trophy: (
    <>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16" />
      <path d="M10 14.7V17c0 .6-.5 1-1 1.2C7.9 18.8 7 20.2 7 22M14 14.7V17c0 .6.5 1 1 1.2 1.2.6 2 2 2 3.8" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </>
  ),
  chart: <path d="M18 20V10M12 20V4M6 20v-6" />,
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
    </>
  ),
  bell: <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />,
};

function Background({ tone }: { tone: Tone }) {
  if (tone === 'dark') {
    return (
      <>
        <Backdrop />
        <div style={{ position: 'absolute', left: '50%', top: 1300, width: 1500, height: 1500, marginLeft: -750, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(43,240,192,0.24), transparent)' }} />
      </>
    );
  }
  if (tone === 'mint') return <AbsoluteFill style={{ background: 'linear-gradient(170deg, #4ff5cd 0%, #2bf0c0 45%, #17d3a6 100%)' }} />;
  return <AbsoluteFill style={{ background: 'linear-gradient(180deg, #f4f5f4 0%, #e6eae8 100%)' }} />;
}

// 화면 원본의 한 영역을 잘라 크게 띄운 카드
function Zoom({ screen, rect, width, style }: { screen: string; rect: Rect; width: number; style?: CSSProperties }) {
  const [x, y, w, h] = rect;
  const z = width / w;
  return (
    <div
      style={{
        position: 'absolute',
        width,
        height: h * z,
        borderRadius: 40,
        overflow: 'hidden',
        boxShadow: '0 50px 90px -20px rgba(0,0,0,0.55), 0 0 0 5px rgba(255,255,255,0.95)',
        ...style,
      }}
    >
      <Img src={staticFile(`store-screens/${screen}.webp`)} style={{ position: 'absolute', left: -x * z, top: -y * z, width: SRC_W * z, display: 'block' }} />
    </div>
  );
}

const PHONE_W = 1000;
const PHONE_TOP = 900;
const ZOOM_W = 1140;

export function StoreShot({ tone, icon, screen, a, b, sub, zoom }: { tone: Tone; icon: keyof typeof ICONS; screen: string; a: string; b: string; sub: string; zoom: Rect }) {
  const t = TONES[tone];
  // 휴대폰 화면 안에서 확대할 영역의 세로 가운데 (Phone: 화면은 틀에서 4.5u 안쪽, 폭 91u)
  const u = PHONE_W / 100;
  const s = (91 * u) / SRC_W;
  const zoomH = zoom[3] * (ZOOM_W / zoom[2]);
  const zoomTop = PHONE_TOP + 4.5 * u + (zoom[1] + zoom[3] / 2) * s - zoomH / 2;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Background tone={tone} />
      <div style={{ position: 'absolute', top: 190, left: 80, right: 80, textAlign: 'center' }}>
        <svg width={120} height={120} viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          {ICONS[icon]}
        </svg>
        <div style={{ marginTop: 40, fontSize: 116, fontWeight: 900, lineHeight: 1.18, letterSpacing: '-0.045em', color: t.text }}>{a}</div>
        <div style={{ fontSize: 116, fontWeight: 900, lineHeight: 1.18, letterSpacing: '-0.045em', color: t.accent }}>{b}</div>
        <div style={{ marginTop: 32, fontSize: 48, fontWeight: 600, color: t.sub, letterSpacing: '-0.02em' }}>{sub}</div>
      </div>
      <div style={{ position: 'absolute', top: PHONE_TOP, left: '50%', marginLeft: -PHONE_W / 2 }}>
        <Phone screen={screen} width={PHONE_W} dir="store-screens" />
      </div>
      <Zoom screen={screen} rect={zoom} width={ZOOM_W} style={{ top: zoomTop, left: (STORE_SIZE.width - ZOOM_W) / 2 }} />
    </AbsoluteFill>
  );
}

// 1장: 서비스 소개. 앱 아이콘 · 이름 · 부제와 기울어진 휴대폰 두 대
export function StoreBrand() {
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <div style={{ position: 'absolute', right: -300, bottom: -200, width: 1800, height: 1800, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(43,240,192,0.3), transparent)' }} />
      <div style={{ position: 'absolute', top: 200, left: 110, right: 110 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          <Img src={staticFile('icon.png')} style={{ width: 200, height: 200, borderRadius: 46, boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.08)' }} />
          <div style={{ fontSize: 184, fontWeight: 900, letterSpacing: '-0.05em', color: C.text }}>달리모</div>
        </div>
        <Lines>
          <div>코스를 찾고,</div>
          <div>같이 달리고,</div>
          <div style={{ color: C.signal }}>기록을 깨다.</div>
        </Lines>
      </div>
      <Tilted screen="run" left={-120} top={1430} />
      <Tilted screen="explore" left={420} top={1250} />
    </AbsoluteFill>
  );
}

function Lines({ children }: { children: ReactNode }) {
  return <div style={{ marginTop: 70, fontSize: 132, fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.045em', color: C.text }}>{children}</div>;
}

function Tilted({ screen, left, top }: { screen: string; left: number; top: number }) {
  return (
    <div style={{ position: 'absolute', left, top, transform: 'perspective(4000px) rotateX(24deg) rotateY(-14deg) rotateZ(-18deg)', transformOrigin: 'top left' }}>
      <Phone screen={screen} width={900} dir="store-screens" />
    </div>
  );
}
