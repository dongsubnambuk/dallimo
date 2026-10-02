import { ArrowRight, EyeOff, HeartPulse, MapPinOff, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { Reveal } from '../components/Reveal';
import { SectionHead } from '../components/Section';

const ITEMS: { icon: ReactNode; title: string; body: string }[] = [
  { icon: <EyeOff size={22} />, title: '함께 달려도 위치는 비공개', body: '다른 참가자에게는 거리와 페이스만 보내요. 지금 어디를 달리는지는 보이지 않아요.' },
  { icon: <MapPinOff size={22} />, title: '공유 카드는 출발 · 도착을 가려요', body: '코스 없이 달린 기록을 공유하면 출발 · 도착 200m는 지도에서 빠져요.' },
  { icon: <HeartPulse size={22} />, title: '심박은 동의한 경우에만', body: '건강정보라 따로 동의를 받아요. 동의를 끄면 저장된 심박을 바로 지워요.' },
  { icon: <Trash2 size={22} />, title: '탈퇴는 앱에서 바로', body: '설정 > 계정 > 탈퇴하기에서 언제든 탈퇴할 수 있고, 계정 정보는 바로 지워요.' },
];

export function Privacy() {
  return (
    <section aria-labelledby="privacy-title" className="border-t border-white/8 py-24 md:py-32">
      <div className="wrap grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <Reveal>
          <SectionHead
            id="privacy-title"
            eyebrow="개인정보"
            title={
              <>
                기록은 자랑하고,
                <br />
                위치는 지켜요
              </>
            }
            lead="달리기 앱은 위치를 다뤄요. 그래서 필요한 때만 모으고, 보여 줄 것과 지킬 것을 나눴어요."
          />
          <a href="/privacy/" className="mt-8 inline-flex min-h-11 items-center gap-2 text-[16px] font-bold text-signal underline-offset-4 hover:underline">
            개인정보 처리방침 보기
            <ArrowRight size={18} aria-hidden />
          </a>
        </Reveal>
        <ul className="divide-y divide-white/8 border-y border-white/8">
          {ITEMS.map((it, i) => (
            <li key={it.title}>
              <Reveal delay={i * 0.06} className="flex gap-5 py-7">
                <span className="mt-0.5 text-signal" aria-hidden>
                  {it.icon}
                </span>
                <span>
                  <span className="block text-[19px] font-bold tracking-[-0.02em]">{it.title}</span>
                  <span className="mt-1.5 block text-[16px] leading-[1.65] text-muted">{it.body}</span>
                </span>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
