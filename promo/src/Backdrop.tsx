import { AbsoluteFill } from 'remotion';

import { C } from './theme';

// 검은 바탕 + 지도 같은 옅은 길 무늬 + 가장자리 어둡게
export function Backdrop({ tint = C.ink }: { tint?: string }) {
  return (
    <AbsoluteFill style={{ background: tint }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.07 }}>
        <defs>
          <pattern id="streets" width="240" height="240" patternUnits="userSpaceOnUse" patternTransform="rotate(-14)">
            <path d="M0 80h240M0 200h240M60 0v240M190 0v240" stroke="#f4f5f4" strokeWidth="3" />
            <path d="M0 140h240" stroke="#f4f5f4" strokeWidth="10" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#streets)" />
      </svg>
      <AbsoluteFill style={{ background: 'radial-gradient(120% 80% at 50% 45%, transparent 40%, rgba(0,0,0,0.65) 100%)' }} />
    </AbsoluteFill>
  );
}
