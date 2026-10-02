import { siApple } from 'simple-icons';

import { STORE } from '../content';

// App Store에만 낸다 (결정 로그 71항)
type Store = { key: 'ios'; name: string; caption: string; path: string };
const STORES: Store[] = [{ key: 'ios', name: 'App Store', caption: 'App Store에서 받기', path: siApple.path }];

// 스토어 주소가 없으면 누를 수 없는 "출시 준비 중" 칸으로 보인다
export function StoreBadges({ className = '' }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-3 ${className}`} aria-label="앱 내려받기">
      {STORES.map((s) => {
        const url = STORE[s.key];
        const body = (
          <>
            <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 shrink-0 fill-current sm:h-6 sm:w-6">
              <path d={s.path} />
            </svg>
            <span className="flex flex-col leading-tight">
              <span className="text-[12px] font-medium opacity-70">{url ? s.caption : '출시 준비 중'}</span>
              <span className="text-[15px] font-bold whitespace-nowrap sm:text-[17px]">{s.name}</span>
            </span>
          </>
        );
        return (
          <li key={s.key}>
            {url ? (
              <a
                href={url}
                className="flex min-h-14 items-center gap-2.5 rounded-[var(--radius-control)] bg-text px-3.5 py-2.5 text-ink transition-transform duration-200 hover:-translate-y-0.5 sm:px-5"
              >
                {body}
              </a>
            ) : (
              <div
                aria-label={`${s.name} 출시 준비 중`}
                className="flex min-h-14 items-center gap-2.5 rounded-[var(--radius-control)] border border-white/12 bg-surface px-3.5 py-2.5 text-text sm:px-5"
              >
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
