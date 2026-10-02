import { SCREENS, type ScreenKey } from '../content';

type Props = {
  screen: ScreenKey;
  className?: string;
  // 첫 화면처럼 바로 보이는 이미지는 먼저 받는다
  priority?: boolean;
  // 화면에 그려지는 폭 (srcset 고르기용)
  sizes?: string;
};

// iPhone 모양 틀. 크기는 부모 폭을 따른다(container query 단위 cqw).
// 화면 393×852pt 기준: 테두리 4.5cqw, Dynamic Island 125×37pt · 위 11pt
export function DeviceFrame({ screen, className = '', priority = false, sizes = '(min-width: 1024px) 300px, 70vw' }: Props) {
  const s = SCREENS[screen];
  return (
    <div className={`@container relative ${className}`} style={{ aspectRatio: '100 / 206.3' }}>
      {/* 옆 버튼 */}
      <span aria-hidden className="absolute top-[17%] -left-[0.9cqw] h-[3.4%] w-[1.2cqw] rounded-l-[0.6cqw] bg-[#3a3c40]" />
      <span aria-hidden className="absolute top-[23.5%] -left-[0.9cqw] h-[6.4%] w-[1.2cqw] rounded-l-[0.6cqw] bg-[#3a3c40]" />
      <span aria-hidden className="absolute top-[31.5%] -left-[0.9cqw] h-[6.4%] w-[1.2cqw] rounded-l-[0.6cqw] bg-[#3a3c40]" />
      <span aria-hidden className="absolute top-[26%] -right-[0.9cqw] h-[10%] w-[1.2cqw] rounded-r-[0.6cqw] bg-[#3a3c40]" />
      {/* 티타늄 테두리 */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-[17cqw] bg-[linear-gradient(145deg,#55575c_0%,#2a2b2e_30%,#1c1d20_60%,#46484c_100%)] shadow-[0_50px_100px_-30px_rgba(0,0,0,0.75),0_30px_60px_-30px_rgba(0,0,0,0.5)]"
      />
      <div aria-hidden className="absolute inset-[0.9cqw] rounded-[16.1cqw] bg-[#050505] ring-1 ring-white/5" />
      {/* 화면 */}
      <div className="absolute inset-[4.5cqw] overflow-hidden rounded-[12.6cqw] bg-ink">
        <img
          src={s.src}
          srcSet={`${s.src.replace('.webp', '-480.webp')} 480w, ${s.src} 780w`}
          sizes={sizes}
          alt={s.alt}
          width={780}
          height={1691}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="block h-full w-full object-cover"
        />
        <span aria-hidden className="absolute top-[2.55cqw] left-1/2 h-[8.6cqw] w-[28.9cqw] -translate-x-1/2 rounded-full bg-black" />
      </div>
    </div>
  );
}
