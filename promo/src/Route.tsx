import { evolvePath, getLength, getPointAtLength } from '@remotion/paths';
import type { CSSProperties } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

import { C } from './theme';

// 브랜드 경로 선: 짙은 민트 테두리 + 민트 선. from~to 프레임 동안 그려진다
export function Route({ d, from, to, width = 1080, height = 1920, stroke = 14, style, dot = true }: { d: string; from: number; to: number; width?: number; height?: number; stroke?: number; style?: CSSProperties; dot?: boolean }) {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, to], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) });
  const { strokeDasharray, strokeDashoffset } = evolvePath(p, d);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', ...style }}>
      <path d={d} fill="none" stroke={C.signalDeep} strokeWidth={stroke * 1.8} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />
      <path d={d} fill="none" stroke={C.signal} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />
      {dot && p > 0 ? <PathDot d={d} p={p} r={stroke * 1.3} /> : null}
    </svg>
  );
}

// 선 끝에서 달리는 점
function PathDot({ d, p, r }: { d: string; p: number; r: number }) {
  const pt = getPointAtLength(d, getLength(d) * p);
  if (!pt) return null;
  return <circle cx={pt.x} cy={pt.y} r={r} fill={C.signal} stroke={C.ink} strokeWidth={r * 0.45} />;
}
