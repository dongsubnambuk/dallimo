import type { CSSProperties, ReactNode } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { C, FONT } from './theme';

// 한 줄씩 아래에서 밀려 올라오는 글자 (가려진 칸 안에서 움직인다)
export function Line({ children, delay = 0, size = 120, color = C.text, weight = 900, style, exitAt }: { children: ReactNode; delay?: number; size?: number; color?: string; weight?: number; style?: CSSProperties; exitAt?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.6 } });
  const out = exitAt == null ? 0 : interpolate(frame, [exitAt, exitAt + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ overflow: 'hidden', paddingBottom: size * 0.08, ...style }}>
      <div
        style={{
          fontFamily: FONT,
          fontSize: size,
          fontWeight: weight,
          lineHeight: 1.12,
          letterSpacing: '-0.045em',
          color,
          transform: `translateY(${(1 - p) * 110 - out * 110}%)`,
          opacity: p,
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// 앱 기록 숫자 스타일: Black + 기울임
export function Metric({ children, size, color = C.text, style }: { children: ReactNode; size: number; color?: string; style?: CSSProperties }) {
  return (
    <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: size, color, letterSpacing: '-0.04em', fontStyle: 'italic', display: 'inline-block', transform: 'skewX(-6deg)', fontVariantNumeric: 'tabular-nums', ...style }}>
      {children}
    </span>
  );
}

// 둥근 알약 라벨 (칩)
export function Chip({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 160 } });
  return (
    <div
      style={{
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '22px 34px',
        borderRadius: 999,
        background: C.surface,
        border: '2px solid rgba(255,255,255,0.1)',
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.8)',
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: 40,
        color: C.text,
        whiteSpace: 'nowrap',
        transform: `scale(${p})`,
        opacity: Math.min(1, p * 1.5),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
