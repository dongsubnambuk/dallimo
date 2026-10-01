import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { NAV } from '../content';
import { Logo } from './Logo';

// 고정 머리글. 스크롤하면 바탕을 채운다(유리 효과 없이)
export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header className={`fixed inset-x-0 top-0 z-20 transition-colors duration-300 ${scrolled || open ? 'border-b border-white/8 bg-ink/95' : 'bg-transparent'}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-4 focus:rounded-lg focus:bg-signal focus:px-3 focus:py-2 focus:text-ink">
        본문으로 건너뛰기
      </a>
      <div className="wrap flex h-16 items-center justify-between">
        <Logo />
        <nav aria-label="주요 메뉴" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-muted transition-colors hover:text-text">
              {n.label}
            </a>
          ))}
          <a href="/#download" className="ml-3 rounded-full bg-signal px-5 py-2.5 text-[15px] font-bold text-ink transition-transform hover:-translate-y-0.5">
            앱 받기
          </a>
        </nav>
        <button
          type="button"
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-text md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={24} strokeWidth={2} /> : <Menu size={24} strokeWidth={2} />}
        </button>
      </div>
      {open ? (
        <nav id="mobile-menu" aria-label="주요 메뉴" className="wrap flex flex-col pb-5 md:hidden">
          {[...NAV, { href: '/#download', label: '앱 받기' }].map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b border-white/8 py-4 text-[17px] font-semibold">
              {n.label}
            </a>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
