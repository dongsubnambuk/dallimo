import { SiteShell } from '../components/SiteShell';

export function NotFoundPage() {
  return (
    <SiteShell>
      <section className="wrap flex min-h-[70dvh] flex-col justify-center pt-32 pb-20">
        <p className="metric text-[64px] leading-none text-signal">404</p>
        <h1 className="mt-6 text-[clamp(28px,5vw,44px)] font-extrabold tracking-[-0.035em]">길을 벗어났어요</h1>
        <p className="mt-4 text-[17px] text-muted">주소가 바뀌었거나 없는 페이지예요.</p>
        <a href="/" className="mt-8 inline-flex min-h-12 w-fit items-center rounded-full bg-signal px-6 text-[16px] font-bold text-ink">
          코스로 돌아가기
        </a>
      </section>
    </SiteShell>
  );
}
