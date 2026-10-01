import { EyeOff, Flag, Swords, Timer, Users } from 'lucide-react';
import type { ReactNode } from 'react';

import { DeviceFrame } from '../components/DeviceFrame';
import { Reveal } from '../components/Reveal';
import { SectionHead } from '../components/Section';

const MODES: { icon: ReactNode; title: string; body: string }[] = [
  { icon: <Flag size={20} />, title: '레이스', body: '정한 거리를 먼저 달린 사람이 이겨요.' },
  { icon: <Timer size={20} />, title: '타임 어택', body: '정한 시간 안에 더 멀리 달린 사람이 이겨요.' },
  { icon: <Users size={20} />, title: '함께 달리기', body: '순위 없이 같이 완주하는 게 목표예요.' },
  { icon: <Swords size={20} />, title: '친구 도전', body: '친구의 코스 기록에 도전장을 보내요.' },
];

export function TogetherSection() {
  return (
    <section id="together" aria-labelledby="together-title" className="relative overflow-hidden bg-surface/40 py-24 md:py-36">
      <div className="wrap grid items-center gap-16 lg:grid-cols-2 lg:gap-12">
        <div>
          <Reveal>
            <SectionHead
              id="together-title"
              eyebrow="함께 달리기"
              title={
                <>
                  장소가 달라도
                  <br />
                  같은 시간에 출발
                </>
              }
              lead="방을 만들고 친구를 부르면 각자 있는 곳에서 동시에 출발해요. 누가 앞서는지 실시간으로 보여요."
            />
          </Reveal>
          <Reveal delay={0.1}>
            <ul className="mt-10 divide-y divide-white/8 border-y border-white/8">
              {MODES.map((m) => (
                <li key={m.title} className="flex items-center gap-4 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-signal" aria-hidden>
                    {m.icon}
                  </span>
                  <span className="flex flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                    <span className="text-[17px] font-bold whitespace-nowrap">{m.title}</span>
                    <span className="text-[15px] text-muted sm:text-right">{m.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-7 flex items-start gap-3 rounded-[var(--radius-control)] border border-signal/25 bg-signal/8 px-4 py-3.5 text-[15px] leading-[1.6]">
              <EyeOff size={20} className="mt-0.5 shrink-0 text-signal" aria-hidden />
              <span>
                <b className="font-bold">서로의 위치는 보내지 않아요.</b> 다른 참가자에게는 거리와 페이스만 보여요.
              </span>
            </p>
          </Reveal>
        </div>
        <Reveal className="relative mx-auto h-[min(640px,150vw)] w-full max-w-[520px]">
          <div className="absolute top-[6%] left-[2%] w-[52%] -rotate-[5deg]">
            <DeviceFrame screen="room" sizes="(min-width: 1024px) 270px, 48vw" />
          </div>
          <div className="absolute top-0 right-[2%] w-[56%] rotate-[3deg]">
            <DeviceFrame screen="live" sizes="(min-width: 1024px) 290px, 52vw" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
