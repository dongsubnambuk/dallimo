import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';

import { loadFonts } from './fonts';
import { FONT } from './theme';

loadFonts();

// App Store Apple Watch 스크린샷 (Apple Watch Ultra 410×502, 화면만). 워치 앱 frontend/targets/watch/RunViews.swift를 그대로 옮겨 그린다.
// 1pt = 2px. 문구는 휴대폰이 보내는 값(src/features/watch/watchMessages.ts)과 같은 모양, 데이터는 App Store 아이폰 스크린샷과 같은 mock
export const WATCH_SIZE = { width: 410, height: 502 };

const MINT = '#2BF0C0';
const WARNING = '#D99500';
const DANGER = '#F06262';
const SECONDARY = 'rgba(235,235,245,0.6)';
const pt = (n: number) => n * 2;

// watchOS 글자 크기 (pt): footnote 14 · body 17 · title3 20 · caption2 13
const footnote = pt(14);
const body = pt(17);
const title3 = pt(20);
const caption2 = pt(13);

// top: ScrollView처럼 위에서부터 (요약)
function Screen({ children, dots, center, top }: { children: ReactNode; dots?: 0 | 1; center?: boolean; top?: boolean }) {
  return (
    <AbsoluteFill style={{ background: '#000', fontFamily: FONT, color: '#fff', letterSpacing: '-0.01em', wordBreak: 'keep-all' }}>
      {/* watchOS 앱 오른쪽 위 시계 */}
      <div style={{ position: 'absolute', top: pt(6), right: pt(12), fontSize: pt(15), fontWeight: 700 }}>9:41</div>
      <div
        style={{
          position: 'absolute',
          inset: `${pt(28)}px ${pt(10)}px ${pt(18)}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: top ? 'flex-start' : 'center',
          alignItems: center ? 'center' : 'stretch',
        }}
      >
        {children}
      </div>
      {dots != null ? (
        <div style={{ position: 'absolute', bottom: pt(6), left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: pt(4) }}>
          {[0, 1].map((i) => (
            <span key={i} style={{ width: pt(5), height: pt(5), borderRadius: 99, background: i === dots ? '#fff' : 'rgba(255,255,255,0.3)' }} />
          ))}
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

const num: CSSProperties = { fontVariantNumeric: 'tabular-nums' };

function Heart({ bpm }: { bpm: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: pt(3), color: DANGER, fontSize: body, ...num }}>
      <svg width={pt(15)} height={pt(14)} viewBox="0 0 24 22" fill={DANGER}>
        <path d="M12 21.6 10.3 20C4.2 14.5 0 10.7 0 6.2 0 2.7 2.7 0 6.2 0 8.2 0 10.1.9 11.4 2.4L12 3.1l.6-.7C13.9.9 15.8 0 17.8 0 21.3 0 24 2.7 24 6.2c0 4.5-4.2 8.3-10.3 13.8z" />
      </svg>
      {bpm}
    </span>
  );
}

// RunMetricsView: 상태 · 시간 · 거리 · 페이스 · 심박 · 모드별 한 줄
export function Metrics(p: { status: string; statusColor: string; time: string; km: string; pace: string; bpm: number; stripLabel: string; stripValue: string; stripColor: string }) {
  return (
    <Screen dots={1}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: pt(2) }}>
        <div style={{ fontSize: footnote, fontWeight: 700, color: p.statusColor }}>{p.status}</div>
        <div style={{ fontSize: title3, fontWeight: 700, color: MINT, ...num }}>{p.time}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: pt(2) }}>
          <span style={{ fontSize: pt(40), fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', ...num }}>{p.km}</span>
          <span style={{ fontSize: footnote, color: SECONDARY }}>km</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: pt(10) }}>
          <span style={{ fontSize: body, ...num }}>{p.pace}/km</span>
          <Heart bpm={p.bpm} />
        </div>
        <div style={{ marginTop: pt(2) }}>
          <div style={{ fontSize: caption2, color: SECONDARY }}>{p.stripLabel}</div>
          <div style={{ fontSize: footnote, fontWeight: 700, color: p.stripColor }}>{p.stripValue}</div>
        </div>
      </div>
    </Screen>
  );
}

// RunControlsView 버튼 (watchOS 기본 버튼 모양)
function Button({ icon, label, color, tint }: { icon: ReactNode; label: string; color: string; tint?: string }) {
  return (
    <div
      style={{
        height: pt(44),
        borderRadius: pt(22),
        background: tint ?? 'rgba(255,255,255,0.14)',
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: pt(6),
        fontSize: body,
        fontWeight: 700,
      }}
    >
      {icon}
      {label}
    </div>
  );
}

export function WatchCountdown() {
  return (
    <Screen center>
      <div style={{ fontSize: pt(72), fontWeight: 900, color: MINT, lineHeight: 1 }}>3</div>
      <div style={{ marginTop: pt(4), fontSize: footnote, color: SECONDARY, textAlign: 'center' }}>수성못 둘레길 · PB 어택</div>
    </Screen>
  );
}

export function WatchPb() {
  return <Metrics status="기록 중" statusColor={MINT} time="7:31" km="1.42" pace={`5'18"`} bpm={156} stripLabel="목표" stripValue="0:05 빨라요" stripColor={MINT} />;
}

export function WatchRace() {
  return <Metrics status="기록 중" statusColor={MINT} time="12:24" km="2.31" pace={`5'22"`} bpm={162} stripLabel="3명 중 2위" stripValue="선두와 5초 차이" stripColor={SECONDARY} />;
}

export function WatchControls() {
  return (
    <Screen dots={0}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: pt(8) }}>
        <Button
          label="일시정지"
          color={WARNING}
          tint="rgba(217,149,0,0.22)"
          icon={
            <svg width={pt(14)} height={pt(16)} viewBox="0 0 14 16" fill={WARNING}>
              <rect x="1" y="0" width="4" height="16" rx="1.5" />
              <rect x="9" y="0" width="4" height="16" rx="1.5" />
            </svg>
          }
        />
        <Button
          label="끝내기"
          color={DANGER}
          icon={
            <svg width={pt(14)} height={pt(14)} viewBox="0 0 14 14" fill={DANGER}>
              <rect x="0" y="0" width="14" height="14" rx="3" />
            </svg>
          }
        />
      </div>
    </Screen>
  );
}

export function WatchSummary() {
  return (
    <Screen top>
      <div style={{ display: 'flex', flexDirection: 'column', gap: pt(3) }}>
        <div style={{ fontSize: footnote, fontWeight: 700, color: MINT }}>기록 저장</div>
        <div style={{ fontSize: footnote, color: SECONDARY }}>수성못 둘레길 · PB 어택</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: pt(2) }}>
          <span style={{ fontSize: pt(36), fontWeight: 800, lineHeight: 1.05, ...num }}>1.90</span>
          <span style={{ fontSize: footnote, color: SECONDARY }}>km</span>
        </div>
        <div style={{ fontSize: title3, ...num }}>10:08</div>
        <div style={{ fontSize: body, color: SECONDARY, ...num }}>5'20"/km</div>
        <div style={{ marginTop: pt(4), fontSize: caption2, color: SECONDARY }}>자세한 결과는 휴대폰에서 볼 수 있어요</div>
        <div style={{ marginTop: pt(4) }}>
          <Button label="완료" color="#fff" icon={null} />
        </div>
      </div>
    </Screen>
  );
}

export const WATCH_SHOTS = [
  { id: 'Watch1', component: WatchPb },
  { id: 'Watch2', component: WatchRace },
  { id: 'Watch3', component: WatchControls },
  { id: 'Watch4', component: WatchCountdown },
  { id: 'Watch5', component: WatchSummary },
] as const;
