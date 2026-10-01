import { Mail } from 'lucide-react';

import { SiteShell } from '../components/SiteShell';
import { CONTACT, FAQ } from '../content';
import { Faq } from '../sections/Faq';

const SUPPORT_FAQ = [
  { q: '위치 권한을 다시 켜고 싶어요.', a: '휴대폰 설정에서 달리모를 찾아 위치를 허용해 주세요. 위치를 켜야 달리기를 기록할 수 있어요.' },
  { q: '저장된 심박을 지우고 싶어요.', a: '설정 > Apple Watch에서 "심박을 기록에 저장"을 끄면 저장된 심박이 모두 지워져요.' },
  ...FAQ.filter((f) => ['기록이 순위에 안 올라가요.', '탈퇴하면 기록은 어떻게 되나요?', '어떤 기기에서 쓸 수 있나요?'].includes(f.q)),
];

export function SupportPage() {
  return (
    <SiteShell>
      <section className="wrap pt-32 pb-20 md:pt-40">
        <h1 className="text-[clamp(34px,6vw,56px)] leading-[1.1] font-black tracking-[-0.04em]">문의</h1>
        <p className="mt-5 max-w-[30em] text-[17px] leading-[1.7] text-muted md:text-[18px]">달리모를 쓰다가 궁금한 점이나 불편한 점이 있으면 메일로 알려 주세요. 확인하는 대로 답장드려요.</p>
        <div className="mt-10 flex flex-col gap-4 rounded-[var(--radius-card)] border border-white/8 bg-surface p-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[14px] font-semibold text-muted">{CONTACT.operator}</p>
            <p className="mt-1 text-[20px] font-bold">{CONTACT.email}</p>
          </div>
          <a href={`mailto:${CONTACT.email}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-signal px-6 text-[16px] font-bold text-ink transition-transform hover:-translate-y-0.5">
            <Mail size={18} aria-hidden />
            메일 보내기
          </a>
        </div>
      </section>
      <Faq items={SUPPORT_FAQ} id="support-faq" />
    </SiteShell>
  );
}
