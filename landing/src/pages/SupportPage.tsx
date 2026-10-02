import { CheckCircle2, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { SiteShell } from '../components/SiteShell';
import { CONTACT, FAQ } from '../content';
import { Faq } from '../sections/Faq';

const SUPPORT_FAQ = [
  { q: '위치 권한을 다시 켜고 싶어요.', a: '휴대폰 설정에서 달리모를 찾아 위치를 허용해 주세요. 위치를 켜야 달리기를 기록할 수 있어요.' },
  { q: '저장된 심박을 지우고 싶어요.', a: '설정 > Apple Watch에서 "심박을 기록에 저장"을 끄면 저장된 심박이 모두 지워져요.' },
  ...FAQ.filter((f) => ['기록이 순위에 안 올라가요.', '탈퇴하면 기록은 어떻게 되나요?', '어떤 기기에서 쓸 수 있나요?'].includes(f.q)),
];

const TOPICS = ['계정 · 로그인', '기록 · 순위', '코스', '함께 달리기 · 친구', '개인정보 · 위치정보', '오류 신고', '기타'];

// Netlify Forms (결정 로그 71항). 미리 그린 HTML에 이 양식이 있어야 Netlify가 빌드 때 찾는다.
// form-name은 Netlify가 어느 양식인지 아는 값, bot-field는 사람에게 안 보이는 스팸 거름 칸
const FORM_NAME = 'support';
type Status = 'idle' | 'sending' | 'sent' | 'error';

const field = 'w-full rounded-[var(--radius-control)] border border-white/12 bg-ink px-4 text-[16px] text-text placeholder:text-muted/70';

export function SupportPage() {
  const [status, setStatus] = useState<Status>('idle');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    const body = new URLSearchParams(new FormData(e.currentTarget) as unknown as Record<string, string>);
    try {
      const res = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <SiteShell>
      <section className="wrap pt-32 pb-20 md:pt-40">
        <h1 className="text-[clamp(34px,6vw,56px)] leading-[1.1] font-black tracking-[-0.04em]">문의</h1>
        <p className="mt-5 max-w-[30em] text-[17px] leading-[1.7] text-muted md:text-[18px]">
          달리모를 쓰다가 궁금한 점이나 불편한 점이 있으면 아래 양식으로 알려 주세요. 적어 주신 이메일로 답장드려요.
        </p>

        <div className="mt-10 max-w-[640px] rounded-[var(--radius-card)] border border-white/8 bg-surface p-6 md:p-8">
          {status === 'sent' ? (
            <div role="status" className="flex flex-col items-start gap-3">
              <CheckCircle2 size={32} className="text-signal" aria-hidden />
              <p className="text-[20px] font-bold">문의를 받았어요</p>
              <p className="text-[16px] leading-[1.7] text-muted">확인하는 대로 적어 주신 이메일로 답장드릴게요.</p>
            </div>
          ) : (
            <form name={FORM_NAME} method="POST" action="/support/" data-netlify="true" netlify-honeypot="bot-field" onSubmit={submit} className="flex flex-col gap-5">
              <input type="hidden" name="form-name" value={FORM_NAME} />
              <p hidden>
                <label>
                  비워 두세요 <input name="bot-field" tabIndex={-1} autoComplete="off" />
                </label>
              </p>

              <label className="flex flex-col gap-2">
                <span className="text-[15px] font-semibold">문의 종류</span>
                <select name="topic" required defaultValue="" className={`${field} min-h-12`}>
                  <option value="" disabled>
                    골라 주세요
                  </option>
                  {TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[15px] font-semibold">답변 받을 이메일</span>
                <input type="email" name="email" required maxLength={191} autoComplete="email" inputMode="email" placeholder="you@example.com" className={`${field} min-h-12`} />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[15px] font-semibold">내용</span>
                <textarea
                  name="message"
                  required
                  minLength={5}
                  maxLength={2000}
                  rows={6}
                  placeholder="어떤 화면에서 무엇을 하다가 생긴 일인지 적어 주시면 빨리 확인할 수 있어요."
                  className={`${field} py-3 leading-[1.6]`}
                />
              </label>

              <label className="flex items-start gap-3 text-[14px] leading-[1.6] text-muted">
                <input type="checkbox" name="consent" value="yes" required className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-signal)]" />
                <span>
                  문의에 답하려고 이메일 · 문의 종류 · 내용을 받아 처리 완료 후 1년 동안 보관해요. 동의하지 않으면 문의를 보낼 수 없어요. 자세한 내용은{' '}
                  <a href="/privacy/" className="font-semibold text-text underline underline-offset-2">
                    개인정보 처리방침
                  </a>
                  에 있어요.
                </span>
              </label>

              {status === 'error' ? (
                <p role="alert" className="text-[15px] font-semibold text-[#f06262]">
                  보내지 못했어요. 잠시 뒤 다시 보내 주세요.
                </p>
              ) : null}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-full bg-signal px-7 text-[16px] font-bold text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
              >
                <Send size={18} aria-hidden />
                {status === 'sending' ? '보내는 중' : '문의 보내기'}
              </button>
            </form>
          )}
          <p className="mt-6 border-t border-white/8 pt-5 text-[13px] text-muted">운영 · 개인정보 보호책임자: {CONTACT.operator}</p>
        </div>
      </section>
      <Faq items={SUPPORT_FAQ} id="support-faq" />
    </SiteShell>
  );
}
