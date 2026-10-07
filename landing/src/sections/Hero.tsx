import { BadgeCheck, Check, Trophy } from 'lucide-react';
import { m, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef, type ReactNode } from 'react';

import { DeviceFrame } from '../components/DeviceFrame';
import { RouteLine } from '../components/RouteLine';
import { StoreBadges } from '../components/StoreBadges';

const EASE = [0.25, 1, 0.5, 1] as const;

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  // 스크롤하면 뒤 휴대폰은 천천히, 앞 휴대폰은 빠르게 (transform만)
  const yFront = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60]);
  const yBack = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 50]);
  const enter = (delay: number) => (reduce ? {} : { initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, ease: EASE, delay } });

  return (
    <section ref={ref} aria-labelledby="hero-title" className="relative isolate overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28 lg:min-h-[100dvh]">
      {/* 지도 같은 옅은 길 무늬 */}
      <svg aria-hidden className="absolute inset-0 -z-10 h-full w-full opacity-[0.07] [mask-image:radial-gradient(70%_60%_at_70%_45%,black,transparent)]">
        <defs>
          <pattern id="streets" width="120" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
            <path d="M0 40h120M0 100h120M30 0v120M95 0v120" stroke="#f4f5f4" strokeWidth="1.5" />
            <path d="M0 70h120" stroke="#f4f5f4" strokeWidth="5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#streets)" />
      </svg>

      <div className="wrap grid items-center gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-6">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-muted">
            <span className="h-2 w-2 rounded-full bg-signal" aria-hidden />
            코스를 달리고 기록으로 겨루는 러닝 앱
          </p>
          <h1 id="hero-title" className="mt-7 text-[clamp(52px,9vw,104px)] leading-[1.02] font-black tracking-[-0.05em]">
            코스를 찾고,
            <br />
            같이 달리고,
            <br />
            <span className="text-signal italic">기록을 깨다.</span>
          </h1>
          <p className="mt-7 max-w-[30em] text-[17px] leading-[1.7] text-muted md:text-[19px]">
            내 주변 코스를 골라 달리면 공식 기록이 돼요. 같은 코스 러너와 순위로 겨루고, 멀리 있는 친구와도 같은 시간에 달려요.
          </p>
          <div>
            <StoreBadges className="mt-9" />
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-muted">
              {['모든 기능 무료', 'Apple Watch만 차고 달려도 기록', '함께 달려도 위치는 비공개'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check size={16} strokeWidth={2.5} className="text-signal" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 휴대폰 세 대: 탐색 · 달리는 중 · 결과 */}
        <div className="relative mx-auto aspect-[1/1.14] w-full max-w-[560px]">
          {/* 휴대폰 아래로 지나가는 경로 선 */}
          <RouteLine
            viewBox="0 0 560 638"
            className="absolute inset-0 -z-10 h-full w-full overflow-visible"
            d="M-30 560 C 40 610, 120 600, 190 585 S 330 545, 400 590 S 520 640, 600 520"
            start={[-30, 560]}
            end={[600, 520]}
            delay={0.4}
          />
          <m.div style={{ y: yBack }} className="absolute top-[9%] left-[1%] w-[40%] -rotate-[7deg]">
            <m.div {...enter(0.3)}>
              <DeviceFrame screen="explore" priority sizes="(min-width: 1024px) 225px, 36vw" />
            </m.div>
          </m.div>
          <m.div style={{ y: yBack }} className="absolute top-[11%] right-[1%] w-[40%] rotate-[7deg]">
            <m.div {...enter(0.4)}>
              <DeviceFrame screen="result" priority sizes="(min-width: 1024px) 225px, 36vw" />
            </m.div>
          </m.div>
          <m.div style={{ y: yFront }} className="absolute top-0 left-1/2 z-10 w-[47%] -translate-x-1/2">
            <m.div {...enter(0.2)}>
              <DeviceFrame screen="run" priority sizes="(min-width: 1024px) 265px, 42vw" />
            </m.div>
          </m.div>

          <m.div {...enter(0.9)} className="absolute bottom-[9%] left-[-1%] z-20 sm:left-[2%]">
            <Chip icon={<BadgeCheck size={18} strokeWidth={2.2} className="text-signal" />} label="공식 기록 인증됨" />
          </m.div>
          <m.div {...enter(1.05)} className="absolute top-[46%] right-[-1%] z-20 sm:right-[-3%]">
            <Chip
              icon={<Trophy size={18} strokeWidth={2.2} className="text-signal" />}
              label={
                <>
                  PB <span className="metric">10:12</span> → <span className="metric text-signal">10:08</span>
                </>
              }
            />
          </m.div>
        </div>
      </div>
    </section>
  );
}

function Chip({ icon, label }: { icon: ReactNode; label: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-surface/95 px-3 py-2 text-[12.5px] font-bold whitespace-nowrap shadow-[0_12px_30px_-10px_rgba(0,0,0,0.7)] sm:gap-2 sm:px-4 sm:py-2.5 sm:text-[15px]">
      <span aria-hidden>{icon}</span>
      {label}
    </div>
  );
}
