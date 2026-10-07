import { HeartPulse } from 'lucide-react';

// 손목 화면 그림 (워치 앱 달리는 중 화면과 같은 값). 크기는 부모 폭을 따른다(cqw)
export function WatchMock({ className = '' }: { className?: string }) {
  return (
    <div className={`@container ${className}`} aria-hidden>
      <div className="relative">
        <span className="absolute top-[22%] -right-[3cqw] h-[22%] w-[4cqw] rounded-r-md bg-[#3a3c40]" />
        <span className="absolute top-[52%] -right-[2cqw] h-[14%] w-[2.5cqw] rounded-r-md bg-[#2c2d30]" />
        <div className="rounded-[25cqw] bg-[linear-gradient(145deg,#55575c,#1c1d20_55%,#46484c)] p-[3cqw] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]">
          <div className="rounded-[21cqw] bg-black px-[10cqw] pt-[10cqw] pb-[11cqw]">
            <div className="flex items-center justify-between text-[5.2cqw] font-bold">
              <span className="flex items-center gap-[2cqw] text-signal">
                <span className="h-[2.4cqw] w-[2.4cqw] rounded-full bg-signal" />
                기록 중
              </span>
              <span className="text-muted">9:41</span>
            </div>
            <p className="metric mt-[4cqw] text-[24cqw] leading-none">0.50</p>
            <p className="text-[5cqw] text-muted">킬로미터</p>
            <div className="mt-[6cqw] grid grid-cols-2 gap-[3cqw]">
              <div>
                <p className="metric text-[9.5cqw] leading-none">2:41</p>
                <p className="mt-[1.5cqw] text-[4.6cqw] text-muted">시간</p>
              </div>
              <div>
                <p className="metric text-[9.5cqw] leading-none">5'24"</p>
                <p className="mt-[1.5cqw] text-[4.6cqw] text-muted">평균 페이스</p>
              </div>
            </div>
            <p className="mt-[5cqw] flex items-center gap-[2cqw] text-[5.6cqw] font-bold text-[#f06262]">
              <HeartPulse className="h-[6cqw] w-[6cqw]" />
              148 bpm
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
