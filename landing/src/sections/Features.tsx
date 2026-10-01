import { Ghost, HeartPulse, Repeat, Share2, Watch } from 'lucide-react';
import type { ReactNode } from 'react';

import { Reveal } from '../components/Reveal';
import { SectionHead } from '../components/Section';
import { SCREENS } from '../content';

// 수성못 둘레길 실제 경로(OpenStreetMap)를 300×170 칸에 맞춘 선
const LOOP =
  'M264.3 35.8 L271.6 41.2 L272.3 53.5 L273.7 58.0 L284.0 79.4 L285.7 86.9 L286.0 109.1 L283.7 118.5 L275.0 136.7 L268.0 142.4 L260.6 145.7 L251.3 147.0 L231.3 142.4 L182.9 126.4 L141.5 119.0 L109.5 116.9 L18.3 123.5 L15.0 121.0 L14.0 112.0 L28.7 33.8 L31.7 28.0 L38.7 23.9 L44.7 23.0 L133.1 28.4 L146.8 29.6 L151.8 32.5 L156.8 30.5 L167.9 30.9 L170.5 29.6 L264.3 35.8';

// 인터벌 예시: 준비 · (빠르게 1분 · 천천히 1분)×4 · 정리
const INTERVAL: { kind: 'easy' | 'fast'; w: number }[] = [
  { kind: 'easy', w: 3 },
  ...Array.from({ length: 4 }, () => [
    { kind: 'fast' as const, w: 1.2 },
    { kind: 'easy' as const, w: 1.2 },
  ]).flat(),
  { kind: 'easy', w: 2.4 },
];

export function Features() {
  return (
    <section aria-labelledby="features-title" className="py-24 md:py-36">
      <div className="wrap">
        <Reveal>
          <SectionHead
            id="features-title"
            eyebrow="더 있어요"
            title={
              <>
                혼자 달려도,
                <br />
                매일 달려도 질리지 않게
              </>
            }
          />
        </Reveal>

        <div className="mt-14 grid gap-4 md:grid-cols-6">
          <Tile className="md:col-span-3 md:row-span-2" icon={<Watch size={20} />} title="Apple Watch" body="손목에서 거리 · 시간 · 페이스를 보고 일시정지하거나 끝낼 수 있어요. 동의하면 심박도 기록에 남겨요.">
            <WatchMock />
          </Tile>
          <Tile className="md:col-span-3" icon={<Repeat size={20} />} title="인터벌 달리기" body="빠르게 · 천천히를 반복해요. 구간이 바뀌면 소리와 진동으로 알려요.">
            <div className="mt-6 flex h-16 items-end gap-1" aria-hidden>
              {INTERVAL.map((b, i) => (
                <span key={i} style={{ flexGrow: b.w }} className={`block rounded-md ${b.kind === 'fast' ? 'h-full bg-signal' : 'h-[45%] bg-elevated'}`} />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[12px] text-muted" aria-hidden>
              <span>준비</span>
              <span>빠르게 1분 · 천천히 1분 × 4</span>
              <span>정리</span>
            </div>
          </Tile>
          <Tile className="md:col-span-3" icon={<Ghost size={20} />} title="고스트 러너" body="내 최고 기록이 지도 위에서 같이 달려요. 앞서는지 뒤처지는지 바로 보여요.">
            <svg viewBox="0 0 300 170" className="mt-4 h-auto w-full" aria-hidden>
              <path d={LOOP} fill="none" stroke="var(--color-elevated)" strokeWidth="7" strokeLinejoin="round" />
              <path d={LOOP} fill="none" stroke="var(--color-signal)" strokeWidth="3" strokeLinejoin="round" strokeDasharray="1 0" opacity="0.5" />
              <circle cx="182.9" cy="126.4" r="9" fill="var(--color-ink)" stroke="var(--color-muted)" strokeWidth="3" strokeDasharray="4 3" />
              <circle cx="141.5" cy="119" r="10" fill="var(--color-signal)" stroke="var(--color-ink)" strokeWidth="3" />
              <text x="141.5" y="100" textAnchor="middle" fill="var(--color-signal)" fontSize="15" fontWeight="800">
                나 +0:15
              </text>
              <text x="190" y="155" textAnchor="middle" fill="var(--color-muted)" fontSize="13" fontWeight="700">
                PB 고스트
              </text>
            </svg>
          </Tile>
          <Tile className="md:col-span-2" icon={<HeartPulse size={20} />} title="Apple 건강 가져오기" body="다른 기기로 달린 기록도 달리모 기록 목록에 모아요." />
          <Tile className="md:col-span-2" icon={<Share2 size={20} />} title="기록 공유 카드" body="집이 드러나지 않게 출발 · 도착 200m는 지도에서 가려요.">
            <svg viewBox="0 0 300 170" className="mt-4 h-auto w-full" aria-hidden>
              <defs>
                <mask id="pz">
                  <rect width="300" height="170" fill="white" />
                  <circle cx="264.3" cy="35.8" r="34" fill="black" />
                </mask>
              </defs>
              <path d={LOOP} fill="none" stroke="var(--color-signal)" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" mask="url(#pz)" />
              <circle cx="264.3" cy="35.8" r="34" fill="none" stroke="var(--color-muted)" strokeWidth="2" strokeDasharray="5 5" />
              <text x="264.3" y="40" textAnchor="middle" fill="var(--color-muted)" fontSize="13" fontWeight="700">
                200m
              </text>
            </svg>
          </Tile>
          <Tile className="overflow-hidden md:col-span-2" title="친구 활동" body="친구가 내 기록을 넘거나 크라운을 차지하면 알려 줘요.">
            <div className="relative mt-5 -mb-7 h-44 overflow-hidden rounded-t-2xl border border-b-0 border-white/10 [mask-image:linear-gradient(to_bottom,black_60%,transparent)]">
              <img src={SCREENS.activity.src} alt="" width={780} height={1691} loading="lazy" decoding="async" className="w-full -translate-y-[9%]" />
            </div>
          </Tile>
        </div>
      </div>
    </section>
  );
}

function Tile({ icon, title, body, children, className = '' }: { icon?: ReactNode; title: string; body: string; children?: ReactNode; className?: string }) {
  return (
    <Reveal className={`flex flex-col rounded-[var(--radius-card)] border border-white/8 bg-surface p-7 ${className}`}>
      {icon ? (
        <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-signal" aria-hidden>
          {icon}
        </span>
      ) : null}
      <h3 className="text-[20px] font-extrabold tracking-[-0.02em]">{title}</h3>
      <p className="mt-2 max-w-[28em] text-[15px] leading-[1.65] text-muted">{body}</p>
      {children}
    </Reveal>
  );
}

// 손목 화면 그림: 달리는 중 화면의 같은 값(0.50km · 2:41 · 5'24")
function WatchMock() {
  return (
    <div className="mt-8 flex flex-1 items-center justify-center pb-2" aria-hidden>
      <div className="relative">
        <span className="absolute top-[22%] -right-[7px] h-[22%] w-[9px] rounded-r-md bg-[#3a3c40]" />
        <span className="absolute top-[52%] -right-[5px] h-[14%] w-[6px] rounded-r-md bg-[#2c2d30]" />
        <div className="w-[236px] rounded-[58px] bg-[linear-gradient(145deg,#55575c,#1c1d20_55%,#46484c)] p-[7px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]">
          <div className="rounded-[48px] bg-black px-6 pt-6 pb-7">
            <div className="flex items-center justify-between text-[12px] font-bold">
              <span className="flex items-center gap-1.5 text-signal">
                <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                기록 중
              </span>
              <span className="text-muted">9:41</span>
            </div>
            <p className="metric mt-3 text-[58px] leading-none">0.50</p>
            <p className="text-[12px] text-muted">킬로미터</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div>
                <p className="metric text-[22px] leading-none">2:41</p>
                <p className="mt-1 text-[11px] text-muted">시간</p>
              </div>
              <div>
                <p className="metric text-[22px] leading-none">5'24"</p>
                <p className="mt-1 text-[11px] text-muted">평균 페이스</p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[13px] font-bold text-[#f06262]">
              <HeartPulse size={14} />
              148 bpm
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
