import { Footprints, Users } from 'lucide-react';

// 잠금 화면 라이브 액티비티 · 다이내믹 아일랜드 그림 (결정 로그 83항). 함께 달리기 레이스 중 값
export function LockScreenMock({ className = '' }: { className?: string }) {
  return (
    // 카드 폭에 맞춰 숫자 크기를 줄인다 (좁은 칸에서도 한 줄)
    <div className={`@container flex flex-col items-center gap-4 ${className}`} aria-hidden>
      {/* 다이내믹 아일랜드 (펼친 모양) */}
      <div className="flex w-full max-w-[300px] items-center justify-between rounded-full bg-black px-4 py-2.5 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/8">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-signal">
          <Footprints size={15} />
          <span className="metric">3.12</span>
          <span className="text-[11px] text-muted">km</span>
        </span>
        <span className="metric text-[15px] whitespace-nowrap">16:48</span>
      </div>
      {/* 잠금 화면 카드 */}
      <div className="w-full max-w-[340px] rounded-[26px] border border-white/10 bg-[#1b1c1e]/95 p-[min(16px,4cqw)] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between text-[12px] font-bold">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-signal" />
            5km 레이스
          </span>
          <span className="text-muted">달리모</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-[min(8px,2cqw)]">
          <div>
            <p className="metric text-[min(26px,7.4cqw)] leading-none whitespace-nowrap">3.12</p>
            <p className="mt-1 text-[11px] text-muted">km</p>
          </div>
          <div>
            <p className="metric text-[min(26px,7.4cqw)] leading-none whitespace-nowrap">16:48</p>
            <p className="mt-1 text-[11px] text-muted">시간</p>
          </div>
          <div>
            <p className="metric text-[min(26px,7.4cqw)] leading-none whitespace-nowrap">5'23"</p>
            <p className="mt-1 text-[11px] text-muted">페이스</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-signal/12 px-3 py-2 text-[13px] font-bold text-signal">
          <span className="flex items-center gap-1.5">
            <Users size={14} />
            2위 / 4명
          </span>
          <span>선두와 5초</span>
        </div>
        <div className="mt-3 space-y-1.5">
          {[
            ['지수', 72],
            ['나', 62],
            ['민수', 55],
          ].map(([n, p]) => (
            <div key={n} className="flex items-center gap-2 text-[11px]">
              <span className={`w-8 font-bold ${n === '나' ? 'text-signal' : 'text-muted'}`}>{n}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <span className={`block h-full rounded-full ${n === '나' ? 'bg-signal' : 'bg-white/45'}`} style={{ width: `${p}%` }} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
