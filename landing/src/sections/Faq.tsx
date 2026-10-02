import { Plus } from 'lucide-react';

import { Reveal } from '../components/Reveal';
import { SectionHead } from '../components/Section';
import { FAQ } from '../content';

// 밝은 구간. details/summary라 JavaScript 없이도 열리고 키보드로 쓸 수 있다
export function Faq({ items = FAQ, id = 'faq' }: { items?: { q: string; a: string }[]; id?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="bg-paper py-24 text-paper-text md:py-32">
      <div className="wrap grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <Reveal>
          <SectionHead tone="paper" id={`${id}-title`} eyebrow="자주 묻는 질문" title="궁금한 게 있나요?" />
        </Reveal>
        <div className="divide-y divide-paper-text/12 border-y border-paper-text/12">
          {items.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-5 text-[18px] font-bold tracking-[-0.02em] [&::-webkit-details-marker]:hidden">
                {f.q}
                <Plus size={22} className="shrink-0 text-signal-ink transition-transform duration-200 group-open:rotate-45" aria-hidden />
              </summary>
              <p className="max-w-[40em] pb-6 text-[16px] leading-[1.7] text-paper-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
