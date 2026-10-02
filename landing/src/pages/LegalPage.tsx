import type { LegalBlock, LegalDocument, LegalTable } from '@legal/types';

import { SiteShell } from '../components/SiteShell';

// 앱 LegalScreen과 같은 규칙: ①항 · 1.호 · ·목록은 머리를 내어 쓰고, 가.는 소제목
const CLAUSE = /^([①-⑳])\s*/;
const ITEM = /^(\d+\.)\s+/;
const BULLET = /^(·)\s+/;
const SUBHEAD = /^[가-힣]\.\s+/;

export function LegalPage({ doc }: { doc: LegalDocument }) {
  return (
    <SiteShell>
      <article className="wrap max-w-[760px] pt-32 pb-24 md:pt-40">
        <h1 className="text-[clamp(30px,5vw,44px)] leading-[1.15] font-extrabold tracking-[-0.035em]">{doc.title}</h1>
        <p className="mt-3 text-[14px] text-muted">{doc.effectiveDate}부터 적용</p>
        <p className="mt-8 text-[17px] leading-[1.75]">{doc.intro}</p>
        <nav aria-label="목차" className="mt-10 rounded-[var(--radius-card)] border border-white/8 bg-surface p-6">
          <h2 className="text-[14px] font-bold text-muted">목차</h2>
          <ol className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {doc.sections.map((s, i) => (
              <li key={s.heading}>
                <a href={`#s${i}`} className="inline-block py-1 text-[15px] hover:text-signal">
                  {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        {doc.sections.map((s, i) => (
          <section key={s.heading} id={`s${i}`} className="mt-12 scroll-mt-24">
            <h2 className="text-[21px] font-bold tracking-[-0.02em]">{s.heading}</h2>
            <div className="mt-4 space-y-2.5">
              {s.blocks.map((b, j) => (
                <Block key={j} block={b} />
              ))}
            </div>
          </section>
        ))}
      </article>
    </SiteShell>
  );
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block !== 'string') return <Table table={block} />;
  if (SUBHEAD.test(block)) return <p className="pt-3 text-[16px] font-bold">{block}</p>;
  const clause = CLAUSE.exec(block);
  const item = clause ? null : (ITEM.exec(block) ?? BULLET.exec(block));
  const m = clause ?? item;
  if (!m) return <p className="text-[16px] leading-[1.75] text-muted">{block}</p>;
  return (
    <p className={`flex gap-1.5 text-[16px] leading-[1.75] text-muted ${item ? 'pl-4' : ''}`}>
      <span className="shrink-0">{m[1]}</span>
      <span>{block.slice(m[0].length)}</span>
    </p>
  );
}

function Table({ table }: { table: LegalTable }) {
  return (
    <div className="my-3 overflow-x-auto rounded-[var(--radius-control)] border border-white/8">
      <table className="w-full min-w-[480px] border-collapse text-left text-[14px]">
        <thead className="bg-surface">
          <tr>
            {table.head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => (
            <tr key={i} className="border-t border-white/8">
              {r.map((c, j) => (
                <td key={j} className={`px-4 py-3 align-top leading-[1.6] ${j === 0 ? 'font-semibold text-text' : 'text-muted'}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
