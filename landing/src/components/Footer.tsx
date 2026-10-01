import { CONTACT, NAV } from '../content';
import { Logo } from './Logo';

const LEGAL = [
  { href: '/terms/', label: '서비스 이용약관' },
  { href: '/location-terms/', label: '위치기반서비스 이용약관' },
  { href: '/privacy/', label: '개인정보 처리방침', strong: true },
  { href: '/support/', label: '문의' },
];

export function Footer() {
  return (
    <footer className="border-t border-white/8 bg-ink pt-14 pb-12 text-[14px] text-muted">
      <div className="wrap grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo className="text-text" />
          <p className="mt-3 max-w-xs leading-relaxed">코스를 찾고, 같이 달리고, 기록을 깨는 러닝 앱</p>
        </div>
        <nav aria-label="서비스">
          <h2 className="mb-3 text-[13px] font-bold text-text">서비스</h2>
          <ul className="space-y-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <a href={n.href} className="inline-block py-1.5 hover:text-text">
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="약관과 문의">
          <h2 className="mb-3 text-[13px] font-bold text-text">약관 · 문의</h2>
          <ul className="space-y-1">
            {LEGAL.map((n) => (
              <li key={n.href}>
                <a href={n.href} className={`inline-block py-1.5 hover:text-text ${n.strong ? 'font-bold text-text' : ''}`}>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="wrap mt-12 flex flex-col gap-1.5 border-t border-white/8 pt-6 text-[13px] md:flex-row md:justify-between">
        <p>
          © 2026 달리모 · {CONTACT.operator} · <a href={`mailto:${CONTACT.email}`} className="underline-offset-2 hover:underline">{CONTACT.email}</a>
        </p>
        <p>화면 속 지도 데이터 © OpenStreetMap contributors</p>
      </div>
    </footer>
  );
}
