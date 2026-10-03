import { Composition } from 'remotion';

import { Cover } from './Cover';
import { Promo } from './Promo';
import { STORE_SHOTS, STORE_SIZE, StoreBrand, StoreShot } from './Store';
import { DURATION, FPS } from './timeline';
import { WATCH_SHOTS, WATCH_SIZE } from './WatchStore';

// 인스타그램 릴스 세로 영상 1080×1920
// Promo는 "Rising Forest", PromoShinyTech는 처음 버전 음악 "Shiny Tech"로 같은 영상을 만든다
export function Root() {
  return (
    <>
      <Composition id="Promo" component={Promo} defaultProps={{ track: 'risingForest' as const }} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />
      <Composition id="PromoShinyTech" component={Promo} defaultProps={{ track: 'shinyTech' as const }} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />
      <Composition id="Cover" component={Cover} durationInFrames={60} fps={FPS} width={1080} height={1920} />
      {/* App Store 스크린샷 6.9인치 (npm run store). 1장 서비스 소개, 2~8장 기능 */}
      <Composition id="Store1" component={StoreBrand} durationInFrames={1} fps={FPS} {...STORE_SIZE} />
      {STORE_SHOTS.map(({ id, ...props }) => (
        <Composition key={id} id={id} component={StoreShot} defaultProps={props} durationInFrames={1} fps={FPS} {...STORE_SIZE} />
      ))}
      {/* App Store Apple Watch 스크린샷 (npm run store) */}
      {WATCH_SHOTS.map(({ id, component }) => (
        <Composition key={id} id={id} component={component} durationInFrames={1} fps={FPS} {...WATCH_SIZE} />
      ))}
    </>
  );
}
