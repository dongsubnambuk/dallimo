import type { ReactNode } from 'react';

// 구간 머리: 작은 라벨 + 제목 + 설명. tone=paper는 밝은 구간
export function SectionHead({ eyebrow, title, lead, tone = 'ink', className = '', id }: { eyebrow: string; title: ReactNode; lead?: ReactNode; tone?: 'ink' | 'paper'; className?: string; id?: string }) {
  const paper = tone === 'paper';
  return (
    <div className={className}>
      <p className={`mb-4 text-[14px] font-bold ${paper ? 'text-signal-ink' : 'text-signal'}`}>{eyebrow}</p>
      <h2 id={id} className="text-[clamp(30px,4.6vw,52px)] leading-[1.14] font-extrabold tracking-[-0.035em]">
        {title}
      </h2>
      {lead ? <p className={`mt-5 max-w-[34em] text-[17px] leading-[1.65] md:text-[18px] ${paper ? 'text-paper-muted' : 'text-muted'}`}>{lead}</p> : null}
    </div>
  );
}
