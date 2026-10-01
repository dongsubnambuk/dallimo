import { m, useReducedMotion } from 'motion/react';

import { Reveal } from '../components/Reveal';

const STEPS = [
  { n: '01', title: '코스 발견', body: '내 주변 코스를 지도에서 고르고 거리 · 오르막 · 내 기록을 봐요.' },
  { n: '02', title: '달리기', body: '화면을 꺼도 기록은 이어지고 페이스는 음성으로 들려요.' },
  { n: '03', title: '기록 인증', body: '경로를 따라 끝까지 달렸는지 확인해 공식 기록으로 남겨요.' },
  { n: '04', title: '순위 · 공유 · 재도전', body: '코스 순위가 바뀌고 친구에게 도전장을 보낼 수 있어요.' },
];

// 제품 한 바퀴: DISCOVER → RUN → VERIFIED → RANK. 점과 선이 차례로 이어진다
export function Loop() {
  const reduce = useReducedMotion();
  return (
    <section aria-labelledby="loop-title" className="border-y border-white/8 bg-surface/40 py-16 md:py-20">
      <div className="wrap">
        <h2 id="loop-title" className="sr-only">
          달리모 한 바퀴
        </h2>
        <ol className="relative grid gap-10 md:grid-cols-4 md:gap-6">
          {/* 가로 선 (데스크톱) */}
          <m.span
            aria-hidden
            className="absolute top-[11px] right-[calc(25%-30px)] left-[12px] hidden h-[3px] origin-left rounded-full bg-signal md:block"
            initial={reduce ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1] }}
          />
          {/* 세로 선 (모바일) */}
          <span aria-hidden className="absolute top-3 bottom-3 left-[10.5px] w-[3px] rounded-full bg-signal/30 md:hidden" />
          {STEPS.map((s, i) => (
            <li key={s.n} className="relative pl-11 md:pl-0">
              <Reveal delay={reduce ? 0 : 0.2 + i * 0.25}>
                <span aria-hidden className="absolute top-0 left-0 block h-6 w-6 rounded-full border-[4px] border-signal bg-ink md:relative" />
                <p className="metric mt-0 text-[15px] text-signal md:mt-6">{s.n}</p>
                <h3 className="mt-1 text-[21px] font-extrabold tracking-[-0.02em]">{s.title}</h3>
                <p className="mt-2 max-w-[22em] text-[15px] leading-[1.65] text-muted">{s.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
