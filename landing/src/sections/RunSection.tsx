import { BadgeCheck, Gauge, Lock, Route, Satellite, Volume2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { Counter, fmtClock, fmtKm, fmtPace } from '../components/Counter';
import { DeviceFrame } from '../components/DeviceFrame';
import { Reveal } from '../components/Reveal';
import { SectionHead } from '../components/Section';

// 숫자는 실제 캡처 화면(run · result)과 같은 값을 쓴다
export function RunSection() {
  return (
    <section id="run" aria-labelledby="run-title" className="relative overflow-hidden py-24 md:py-36">
      <div className="wrap grid items-center gap-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
        <Reveal className="order-2 mx-auto w-[min(320px,78vw)] lg:order-1">
          <DeviceFrame screen="run" />
        </Reveal>
        <div className="order-1 lg:order-2">
          <Reveal>
            <SectionHead
              id="run-title"
              eyebrow="달리기"
              title={
                <>
                  달리는 중에는
                  <br />
                  숫자 세 개면 충분해요
                </>
              }
              lead="1초만 봐도 읽히게 거리 · 시간 · 페이스만 크게 보여 줘요. 나머지는 소리와 진동으로 알려 드려요."
            />
          </Reveal>
          <Reveal delay={0.1}>
            <dl className="mt-10 grid grid-cols-3 gap-4 border-y border-white/10 py-7">
              <Metric label="킬로미터">
                <Counter to={0.5} format={fmtKm} />
              </Metric>
              <Metric label="시간">
                <Counter to={161} format={fmtClock} />
              </Metric>
              <Metric label="평균 페이스">
                <Counter to={324} format={fmtPace} />
              </Metric>
            </dl>
          </Reveal>
          <Reveal delay={0.15}>
            <ul className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Point icon={<Volume2 size={20} />} title="음성 안내" body="거리와 페이스, 구간 기록을 들려줘요." />
              <Point icon={<Satellite size={20} />} title="GPS · 코스 이탈 알림" body="신호가 약하거나 길을 벗어나면 바로 알려요." />
              <Point icon={<Lock size={20} />} title="화면을 꺼도 기록" body="휴대폰을 주머니에 넣어도 기록은 이어져요." />
              <Point icon={<Gauge size={20} />} title="구간 도전" body="코스 안 구간마다 내 최고 기록과 겨뤄요." />
            </ul>
          </Reveal>
        </div>
      </div>

      <div className="wrap mt-28 grid items-center gap-16 md:mt-40 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-20">
        <div>
          <Reveal>
            <SectionHead
              eyebrow="결과"
              title={
                <>
                  멈추는 순간
                  <br />
                  공식 기록이 돼요
                </>
              }
              lead="코스 경로를 따라 정상 속도로 달렸는지 확인한 기록만 순위에 올라가요. 그래서 순위표의 숫자를 믿을 수 있어요."
            />
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <Stat label="내 PB" value={<span className="metric">10:08</span>} sub="이전 10:12보다 4초 빨라요" />
              <Stat label="이번 주 순위" value={<span className="metric">14위</span>} sub="18위에서 4계단 올랐어요" />
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <ul className="mt-8 flex flex-wrap gap-2.5 text-[14px] font-semibold">
              {['경로 일치', '정상 속도', 'GPS 품질'].map((t) => (
                <li key={t} className="flex items-center gap-1.5 rounded-full border border-signal/30 bg-signal/10 px-3.5 py-2 text-signal">
                  <BadgeCheck size={16} aria-hidden />
                  {t}
                </li>
              ))}
              <li className="flex items-center gap-1.5 rounded-full border border-white/12 px-3.5 py-2 text-muted">
                <Route size={16} aria-hidden />
                못 맞추면 기록만 남고 순위는 그대로
              </li>
            </ul>
          </Reveal>
        </div>
        <Reveal className="mx-auto w-[min(320px,78vw)]">
          <DeviceFrame screen="result" />
        </Reveal>
      </div>
    </section>
  );
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="metric text-[clamp(30px,5vw,56px)] leading-none">{children}</dd>
      <dd className="mt-2 text-[13px] text-muted md:text-[14px]" aria-hidden>
        {label}
      </dd>
    </div>
  );
}

function Point({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <li className="flex gap-3.5">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-signal" aria-hidden>
        {icon}
      </span>
      <span>
        <span className="block text-[16px] font-bold">{title}</span>
        <span className="mt-1 block text-[15px] leading-[1.6] text-muted">{body}</span>
      </span>
    </li>
  );
}

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-white/8 bg-surface p-6">
      <p className="text-[14px] font-semibold text-muted">{label}</p>
      <p className="mt-2 text-[44px] leading-none text-signal">{value}</p>
      <p className="mt-3 text-[15px] text-muted">{sub}</p>
    </div>
  );
}
