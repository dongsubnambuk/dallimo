import { Crown, Flag, MapPinned, Mountain, Timer, Users } from 'lucide-react';
import { AnimatePresence, m, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { DeviceFrame } from '../components/DeviceFrame';
import { Reveal } from '../components/Reveal';
import { SectionHead } from '../components/Section';
import type { ScreenKey } from '../content';

type Step = { screen: ScreenKey; title: string; body: string; points: { icon: ReactNode; text: string }[] };

const STEPS: Step[] = [
  {
    screen: 'explore',
    title: '내 주변 코스를 지도에서 바로',
    body: '가까운 코스부터 지도에 그려져요. 이번 주에 몇 명이 달렸는지, 코스 1위와 내 기록은 얼마인지 카드 한 장에 보여요.',
    points: [
      { icon: <MapPinned size={18} />, text: '3~5km · 평지 · 야간 밝음 · 초보 추천 필터' },
      { icon: <Flag size={18} />, text: '공공 데이터로 만든 추천 코스' },
    ],
  },
  {
    screen: 'course',
    title: '달리기 전에 알아야 할 것만',
    body: '거리, 예상 시간, 난이도, 오르막을 먼저 보여 줘요. 내 최고 기록과 이번 주 순위도 함께 보여서 목표를 정하기 쉬워요.',
    points: [
      { icon: <Mountain size={18} />, text: '오르막 · 난이도 · 예상 시간' },
      { icon: <Timer size={18} />, text: '내 PB · 코스 1위 · 친구 최고 기록' },
    ],
  },
  {
    screen: 'ranking',
    title: '코스마다 순위가 있어요',
    body: '경로를 따라 끝까지 달린 기록만 순위에 올라가요. 이번 주, 이번 달, 전체 기간, 친구끼리 나눠서 볼 수 있어요.',
    points: [
      { icon: <Crown size={18} />, text: '최근 90일 최고 기록은 코스 크라운' },
      { icon: <Users size={18} />, text: '최근 90일 가장 많이 완주하면 로컬 레전드' },
    ],
  },
];

// 밝은 구간. 데스크톱은 휴대폰이 멈춰 있고 글을 내리면 화면이 바뀐다. 모바일은 단계마다 휴대폰을 보여 준다
export function CourseStory() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  return (
    <section id="course" aria-labelledby="course-title" className="bg-paper py-24 text-paper-text md:py-36">
      <div className="wrap">
        <Reveal>
          <SectionHead
            tone="paper"
            id="course-title"
            eyebrow="코스 찾기"
            title={
              <>
                어디서 달릴지
                <br className="hidden sm:block" /> 고민하지 않게
              </>
            }
            lead="달리모의 중심은 코스예요. 지도에서 고르고, 상세에서 확인하고, 순위로 겨뤄요."
          />
        </Reveal>

        <div className="mt-16 grid gap-20 lg:mt-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div className="hidden lg:block">
            <div className="sticky top-[max(88px,calc(50vh-340px))] mx-auto w-[310px]">
              <AnimatePresence mode="wait" initial={false}>
                <m.div
                  key={STEPS[active].screen}
                  initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduce ? undefined : { opacity: 0, y: -24, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
                >
                  <DeviceFrame screen={STEPS[active].screen} />
                </m.div>
              </AnimatePresence>
              <ol className="mt-8 flex justify-center gap-2" aria-hidden>
                {STEPS.map((s, i) => (
                  <li key={s.screen} className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? 'w-8 bg-signal-ink' : 'w-1.5 bg-paper-muted/40'}`} />
                ))}
              </ol>
            </div>
          </div>
          <div>
            {STEPS.map((s, i) => (
              <StepBlock key={s.screen} step={s} index={i} onActive={() => setActive(i)} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StepBlock({ step, index, onActive }: { step: Step; index: number; onActive: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-45% 0px -45% 0px' });
  useEffect(() => {
    if (inView) onActive();
  }, [inView, onActive]);
  return (
    <div ref={ref} className="flex flex-col gap-10 lg:min-h-[74vh] lg:justify-center">
      <Reveal>
        <p className="metric text-[15px] text-signal-ink">0{index + 1}</p>
        <h3 className="mt-2 text-[clamp(26px,3.2vw,38px)] leading-[1.2] font-extrabold tracking-[-0.03em]">{step.title}</h3>
        <p className="mt-4 max-w-[30em] text-[17px] leading-[1.7] text-paper-muted">{step.body}</p>
        <ul className="mt-7 divide-y divide-paper-text/10 border-y border-paper-text/10">
          {step.points.map((p) => (
            <li key={p.text} className="flex items-center gap-3 py-3.5 text-[16px] font-semibold">
              <span className="text-signal-ink" aria-hidden>
                {p.icon}
              </span>
              {p.text}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal className="mx-auto w-[min(300px,78vw)] lg:hidden">
        <DeviceFrame screen={step.screen} />
      </Reveal>
    </div>
  );
}
