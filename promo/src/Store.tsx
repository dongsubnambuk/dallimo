import { AbsoluteFill } from 'remotion';

import { Backdrop } from './Backdrop';
import { loadFonts } from './fonts';
import { Phone } from './Phone';
import { C, FONT } from './theme';

loadFonts();

// App Store 스크린샷 (6.9인치 1320×2868, docs/store/APP-STORE.md). 홍보 영상과 같은 틀 · 색 · 글꼴로 정지 화면을 만든다.
// 화면은 실제 앱 캡처(mock 데이터)에 상태 표시줄을 그린 것 (promo/assets/store-screens)
export const STORE_SIZE = { width: 1320, height: 2868 };

export const STORE_SHOTS = [
  { id: 'Store1', screen: 'explore', a: '내 주변 코스를', b: '지도에서 바로', sub: '이번 주 몇 명이 달렸는지까지 한눈에' },
  { id: 'Store2', screen: 'course', a: '달리기 전에', b: '알아야 할 것만', sub: '거리 · 오르막 · 내 최고 기록' },
  { id: 'Store3', screen: 'run', a: '달리는 중엔', b: '숫자 세 개만', sub: '음성 안내 · 화면을 꺼도 계속 기록' },
  { id: 'Store4', screen: 'result', a: '멈추는 순간', b: '공식 기록으로', sub: '코스를 끝까지 달리면 자동으로 인증' },
  { id: 'Store5', screen: 'ranking', a: '코스마다', b: '순위가 있어요', sub: '이번 주 · 이번 달 · 친구 순위' },
  { id: 'Store6', screen: 'live', a: '장소가 달라도', b: '같은 시간에 출발', sub: '위치 대신 거리 · 페이스만 보여요' },
  { id: 'Store7', screen: 'activity', a: '친구가 내 기록을', b: '넘으면 알려 줘요', sub: '코스 크라운 · 로컬 레전드 소식' },
] as const;

const PHONE_W = 980;

export function StoreShot({ screen, a, b, sub }: { screen: string; a: string; b: string; sub: string }) {
  return (
    <AbsoluteFill>
      <Backdrop />
      <div style={{ position: 'absolute', top: 170, left: 110, right: 110, fontFamily: FONT }}>
        <div style={{ fontSize: 132, fontWeight: 900, lineHeight: 1.14, letterSpacing: '-0.045em', color: C.text }}>{a}</div>
        <div style={{ fontSize: 132, fontWeight: 900, lineHeight: 1.14, letterSpacing: '-0.045em', color: C.signal }}>{b}</div>
        <div style={{ marginTop: 34, fontSize: 50, fontWeight: 500, color: C.muted, letterSpacing: '-0.02em' }}>{sub}</div>
      </div>
      {/* 휴대폰 뒤 민트 빛 */}
      <div style={{ position: 'absolute', left: '50%', top: 1500, width: 1100, height: 1100, marginLeft: -550, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(43,240,192,0.22), transparent)' }} />
      <div style={{ position: 'absolute', top: 760, left: '50%', marginLeft: -PHONE_W / 2 }}>
        <Phone screen={screen} width={PHONE_W} dir="store-screens" />
      </div>
    </AbsoluteFill>
  );
}
