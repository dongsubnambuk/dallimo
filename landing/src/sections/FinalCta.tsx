import { MessageCircle } from 'lucide-react';

import { Reveal } from '../components/Reveal';
import { RouteLine } from '../components/RouteLine';
import { StoreBadges } from '../components/StoreBadges';
import { CONTACT } from '../content';

export function FinalCta() {
  return (
    <section id="download" aria-labelledby="download-title" className="relative isolate overflow-hidden py-28 md:py-40">
      <RouteLine
        viewBox="0 0 1200 420"
        className="absolute inset-x-0 top-1/2 -z-10 mx-auto h-auto w-[min(1200px,160vw)] -translate-y-1/2 opacity-30"
        d="M-20 330 C 180 330, 220 140, 420 150 S 700 330, 860 250 S 1060 70, 1220 90"
        duration={2.6}
      />
      <div className="wrap text-center">
        <Reveal>
          <p className="text-[14px] font-bold text-signal">출시 준비 중</p>
          <h2 id="download-title" className="mx-auto mt-4 max-w-[14em] text-[clamp(36px,6vw,72px)] leading-[1.08] font-black tracking-[-0.045em]">
            첫 코스에서
            <br />
            기다릴게요
          </h2>
          <p className="mx-auto mt-6 max-w-[30em] text-[17px] leading-[1.7] text-muted md:text-[18px]">App Store 출시를 앞두고 마지막 점검을 하고 있어요. 출시하면 바로 이 자리에서 받을 수 있어요.</p>
        </Reveal>
        <Reveal delay={0.1}>
          <StoreBadges className="mt-10 justify-center" />
          <a href={CONTACT.supportPath} className="mt-8 inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-muted hover:text-text">
            <MessageCircle size={18} aria-hidden />
            문의하기
          </a>
        </Reveal>
      </div>
    </section>
  );
}
