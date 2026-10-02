import type { CSSProperties } from 'react';
import { Img, staticFile } from 'remotion';

// 랜딩의 DeviceFrame과 같은 iPhone 틀. width 기준 1u = width/100 (화면 393×852pt 비율)
// dir: 화면 그림 폴더. 영상은 screens(780px), App Store 스크린샷은 store-screens(원본 1179px)
export function Phone({ screen, width, style, dir = 'screens' }: { screen: string; width: number; style?: CSSProperties; dir?: string }) {
  const u = width / 100;
  const button = (side: 'left' | 'right', top: string, h: string): CSSProperties => ({
    position: 'absolute',
    top,
    height: h,
    width: 1.2 * u,
    [side]: -0.9 * u,
    background: '#3a3c40',
    borderRadius: side === 'left' ? `${0.6 * u}px 0 0 ${0.6 * u}px` : `0 ${0.6 * u}px ${0.6 * u}px 0`,
  });
  return (
    <div style={{ position: 'relative', width, height: width * 2.063, ...style }}>
      <span style={button('left', '17%', '3.4%')} />
      <span style={button('left', '23.5%', '6.4%')} />
      <span style={button('left', '31.5%', '6.4%')} />
      <span style={button('right', '26%', '10%')} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 17 * u,
          background: 'linear-gradient(145deg,#55575c 0%,#2a2b2e 30%,#1c1d20 60%,#46484c 100%)',
          boxShadow: `0 ${8 * u}px ${18 * u}px -${5 * u}px rgba(0,0,0,0.75)`,
        }}
      />
      <div style={{ position: 'absolute', inset: 0.9 * u, borderRadius: 16.1 * u, background: '#050505' }} />
      <div style={{ position: 'absolute', inset: 4.5 * u, borderRadius: 12.6 * u, overflow: 'hidden', background: '#0b0b0c' }}>
        <Img src={staticFile(`${dir}/${screen}.webp`)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', top: 2.55 * u, left: '50%', width: 28.9 * u, height: 8.6 * u, marginLeft: -14.45 * u, borderRadius: 999, background: '#000' }} />
      </div>
    </div>
  );
}
