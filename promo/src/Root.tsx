import { Composition } from 'remotion';

import { Cover } from './Cover';
import { DURATION, Promo } from './Promo';
import { FPS } from './timeline';

// 인스타그램 릴스 세로 영상 1080×1920
export function Root() {
  return (
    <>
      <Composition id="Promo" component={Promo} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />
      <Composition id="Cover" component={Cover} durationInFrames={60} fps={FPS} width={1080} height={1920} />
    </>
  );
}
