import type { ReactNode } from 'react';

import { Reveal } from './Reveal';
import { SectionHead } from './Section';

export type StoryPoint = { icon: ReactNode; title: string; body: string };

type Props = {
  id: string;
  // 앱 소개 3장과 같은 순서 번호 (결정 로그 84 · 88항)
  step: string;
  eyebrow: string;
  title: ReactNode;
  lead: string;
  points: StoryPoint[];
  visual: ReactNode;
  tone?: 'ink' | 'paper' | 'surface';
  // 데스크톱에서 그림을 왼쪽에
  flip?: boolean;
  children?: ReactNode;
};

// 소개 구간 하나: 글(제목 · 설명 · 기능 목록) + 그림. 768 아래는 글 → 그림 한 열, 1024부터 두 열
export function StorySection({ id, step, eyebrow, title, lead, points, visual, tone = 'ink', flip = false, children }: Props) {
  const paper = tone === 'paper';
  const bg = paper ? 'bg-paper text-paper-text' : tone === 'surface' ? 'bg-surface/40' : '';
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-16 py-20 md:py-28 ${bg}`}>
      <div className="wrap grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className={flip ? 'lg:order-2' : ''}>
          <Reveal>
            <SectionHead tone={paper ? 'paper' : 'ink'} id={`${id}-title`} eyebrow={`${step} · ${eyebrow}`} title={title} lead={lead} />
          </Reveal>
          <Reveal delay={0.08}>
            <ul className={`mt-9 divide-y border-y ${paper ? 'divide-paper-text/10 border-paper-text/10' : 'divide-white/8 border-white/8'}`}>
              {points.map((p) => (
                <li key={p.title} className="flex gap-4 py-4">
                  <span
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${paper ? 'bg-paper-text/6 text-signal-ink' : 'bg-surface text-signal'}`}
                    aria-hidden
                  >
                    {p.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[17px] font-bold tracking-[-0.01em]">{p.title}</span>
                    <span className={`mt-1 block text-[15px] leading-[1.6] ${paper ? 'text-paper-muted' : 'text-muted'}`}>{p.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
          {children}
        </div>
        <Reveal className={`min-w-0 ${flip ? 'lg:order-1' : ''}`}>{visual}</Reveal>
      </div>
    </section>
  );
}
