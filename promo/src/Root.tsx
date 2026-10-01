import { Composition } from 'remotion';

import { Cover } from './Cover';
import { Promo } from './Promo';
import { DURATION, FPS } from './timeline';

// 인스타그램 릴스 세로 영상 1080×1920
// Promo는 "Laserpack", PromoShinyTech는 처음 버전 음악 "Shiny Tech"로 같은 영상을 만든다
export function Root() {
  return (
    <>
      <Composition id="Promo" component={Promo} defaultProps={{ track: 'laserpack' as const }} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />
      <Composition id="PromoShinyTech" component={Promo} defaultProps={{ track: 'shinyTech' as const }} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />
      <Composition id="Cover" component={Cover} durationInFrames={60} fps={FPS} width={1080} height={1920} />
    </>
  );
}
